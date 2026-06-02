#!/usr/bin/env node
import { parseOptions } from "./config.js";
import { createLogger } from "./logger.js";
import { run } from "./pipeline.js";
import { BinaryError, ConfigError } from "./errors.js";
import type { ProcessResult } from "./types.js";

async function main(): Promise<void> {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(2);
    }
    throw error;
  }

  const log = createLogger(options.logLevel);

  try {
    const results = await run(options, log);
    printSummary(results, options.dryRun, log);
    if (results.some((r) => r.status === "error")) {
      process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof BinaryError) {
      log.error(error.message);
      process.exit(3);
    }
    log.error({ err: error instanceof Error ? error.message : String(error) }, "fatal error");
    process.exit(1);
  }
}

function printSummary(
  results: ProcessResult[],
  dryRun: boolean,
  log: ReturnType<typeof createLogger>,
): void {
  const converted = results.filter((r) => r.status === "converted").length;
  const planned = results.filter((r) => r.status === "planned").length;
  const errors = results.filter((r) => r.status === "error").length;
  const leftoversRemoved = results.reduce((sum, r) => sum + r.leftoversRemoved, 0);

  const bySource: Record<string, number> = {};
  for (const r of results) {
    if (!r.source) continue;
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  }

  log.info(
    {
      ...(dryRun ? { planned } : { converted, leftoversRemoved }),
      errors,
      timestampSources: bySource,
    },
    dryRun ? "dry-run summary" : "done",
  );
}

void main();
