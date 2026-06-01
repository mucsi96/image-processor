import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";
import { classify, extensionOf, isStill, stemOf } from "./classify.js";
import type { Binaries } from "./binaries.js";
import type { Logger } from "./logger.js";
import type { ProcessingItem, ScannedFile } from "./types.js";

/** List the top-level entries of a directory and classify each one. */
export async function scan(dir: string): Promise<ScannedFile[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: ScannedFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const absPath = join(dir, entry.name);
    const ext = extensionOf(entry.name);
    const s = await stat(absPath);
    files.push({
      absPath,
      name: entry.name,
      stem: stemOf(entry.name),
      ext,
      kind: classify(ext),
      stat: { mtimeMs: s.mtimeMs, size: s.size },
    });
  }

  return files;
}

/**
 * Group scanned files by stem and decide what to process:
 * - A stem with a still (jpg/heic) → process the still, mark everything else in
 *   the stem (paired video + sidecars like .AAE/.XMP) as leftovers to remove.
 * - A stem that is video-only → process it only when it is short enough
 *   (Live-Photo length); otherwise leave it and its sidecars untouched.
 */
export async function buildProcessingItems(
  files: ScannedFile[],
  bin: Binaries,
  maxVideoSeconds: number,
  log: Logger,
): Promise<ProcessingItem[]> {
  const groups = new Map<string, ScannedFile[]>();
  for (const file of files) {
    const group = groups.get(file.stem);
    if (group) group.push(file);
    else groups.set(file.stem, [file]);
  }

  const items: ProcessingItem[] = [];

  for (const group of groups.values()) {
    const still = group.find((f) => isStill(f.kind));

    if (still) {
      const leftovers = group.filter((f) => f !== still);
      items.push({ source: still, leftovers });
      continue;
    }

    const video = group.find((f) => f.kind === "video");
    if (!video) {
      // No still and no video in this stem: nothing to process.
      continue;
    }

    const duration = await probeDuration(bin.ffprobe, video.absPath);
    if (duration !== null && duration > maxVideoSeconds) {
      log.info(
        { file: video.name, durationSeconds: Number(duration.toFixed(2)) },
        "skipping long video (> max-video-seconds)",
      );
      continue;
    }

    const leftovers = group.filter((f) => f !== video);
    items.push({ source: video, leftovers });
  }

  return items;
}

/** Return the video duration in seconds, or null if it cannot be determined. */
async function probeDuration(ffprobeBin: string, file: string): Promise<number | null> {
  try {
    const { stdout } = await execa(ffprobeBin, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nk=1:nw=1",
      file,
    ]);
    const seconds = Number(stdout.trim());
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}
