import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import pMap from "p-map";
import { resolveBinaries } from "./binaries.js";
import { buildProcessingItems, scan } from "./scanner.js";
import { readMetadataBatch } from "./metadata/exiftool.js";
import { resolveTaken } from "./metadata/timestamp.js";
import { createNamer } from "./naming.js";
import { processFile } from "./processors/index.js";
import { commitInPlace } from "./commit.js";
import type { Options } from "./config.js";
import type { Logger } from "./logger.js";
import type { ProcessResult, ProcessingItem, ScannedFile, TakenTimestamp } from "./types.js";

interface PlannedItem extends ProcessingItem {
  taken: TakenTimestamp;
  finalName: string;
  finalPath: string;
}

/** Run the full pipeline against the configured directory. */
export async function run(opts: Options, log: Logger): Promise<ProcessResult[]> {
  const bin = await resolveBinaries();

  const files = await scan(opts.dir);
  const supported = files.filter((f) => f.kind !== "unsupported");
  log.info(
    { total: files.length, supported: supported.length, dir: opts.dir },
    "scanned directory",
  );

  const items = await buildProcessingItems(supported, bin, opts.maxVideoSeconds, log);
  if (items.length === 0) {
    log.warn("no files to process");
    return [];
  }

  const metadata = await readMetadataBatch(
    bin.exiftool,
    items.map((item) => item.source.absPath),
  );

  const planned = planItems(items, metadata, opts.dir, files, log);

  if (opts.dryRun) {
    return reportDryRun(planned, log);
  }

  return processAll(planned, bin, opts, log);
}

/** Assign deterministic output names, ordered by timestamp. */
function planItems(
  items: ProcessingItem[],
  metadata: Map<string, { SourceFile: string }>,
  dir: string,
  allFiles: ScannedFile[],
  log: Logger,
): PlannedItem[] {
  const withTaken: { item: ProcessingItem; taken: TakenTimestamp }[] = [];
  for (const item of items) {
    const taken = resolveTaken(metadata.get(item.source.absPath), item.source);
    if (!taken) {
      log.error(
        { input: item.source.name },
        "no metadata timestamp found — skipping file",
      );
      continue;
    }
    withTaken.push({ item, taken });
  }

  // Sort by capture time so same-millisecond suffixes are reproducible.
  withTaken.sort((a, b) => a.taken.epochMs - b.taken.epochMs);

  // Files we will read or delete during the run.
  const consumed = new Set<string>();
  for (const { item } of withTaken) {
    consumed.add(item.source.absPath);
    for (const leftover of item.leftovers) consumed.add(leftover.absPath);
  }

  // Seed the namer with names of files that remain on disk (untouched), so a
  // generated `<ms>.png` never clobbers an unrelated pre-existing file.
  const survivors = allFiles.filter((f) => !consumed.has(f.absPath)).map((f) => f.name);

  const namer = createNamer(survivors);

  return withTaken.map(({ item, taken }) => {
    const finalName = namer(taken.epochMs);
    return { ...item, taken, finalName, finalPath: join(dir, finalName) };
  });
}

async function processAll(
  planned: PlannedItem[],
  bin: Awaited<ReturnType<typeof resolveBinaries>>,
  opts: Options,
  log: Logger,
): Promise<ProcessResult[]> {
  return pMap(
    planned,
    async (item): Promise<ProcessResult> => {
      const tempPath = tempPathFor(item.finalPath);
      try {
        await processFile(bin, item.source, tempPath);
        await commitInPlace(tempPath, item.finalPath, item.source, item.leftovers);
        log.info(
          { input: item.source.name, output: item.finalName, source: item.taken.source },
          "converted",
        );
        return {
          input: item.source.name,
          output: item.finalName,
          status: "converted",
          source: item.taken.source,
          leftoversRemoved: item.leftovers.length,
        };
      } catch (error) {
        await rm(tempPath, { force: true }).catch(() => undefined);
        const detail = error instanceof Error ? error.message : String(error);
        log.error({ input: item.source.name, err: detail }, "failed to convert");
        return {
          input: item.source.name,
          status: "error",
          source: item.taken.source,
          leftoversRemoved: 0,
          detail,
        };
      }
    },
    { concurrency: opts.concurrency },
  );
}

function reportDryRun(planned: PlannedItem[], log: Logger): ProcessResult[] {
  return planned.map((item) => {
    const removals = [item.source.name, ...item.leftovers.map((l) => l.name)];
    log.info(
      {
        from: item.source.name,
        to: item.finalName,
        source: item.taken.source,
        removes: removals,
      },
      "[dry-run] would convert",
    );
    return {
      input: item.source.name,
      output: item.finalName,
      status: "planned",
      source: item.taken.source,
      leftoversRemoved: item.leftovers.length,
    };
  });
}

function tempPathFor(finalPath: string): string {
  const suffix = randomBytes(6).toString("hex");
  return `${finalPath}.tmp-${process.pid}-${suffix}`;
}
