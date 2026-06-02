import { availableParallelism } from "node:os";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { ConfigError } from "./errors.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Options {
  /** Absolute path to the directory processed in place. */
  dir: string;
  concurrency: number;
  /** Videos longer than this (seconds) are left untouched. */
  maxVideoSeconds: number;
  logLevel: LogLevel;
  /** Apply a subtle photo-book tone enhancement to every output PNG. */
  enhance: boolean;
}

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

/** Parse argv into validated Options. Throws ConfigError on bad input. */
export function parseOptions(argv: string[]): Options {
  const program = new Command();
  program
    .name("image-processor")
    .description(
      "Batch-convert iPhone media (JPG, HEIC, Live Photo videos) in a directory into " +
        "orientation-corrected PNGs named by capture timestamp. Processes files IN PLACE.",
    )
    .argument("[dir]", "directory to process (default: current working directory)", ".")
    .option(
      "-c, --concurrency <n>",
      "number of files processed in parallel",
      String(defaultConcurrency()),
    )
    .option("-m, --max-video-seconds <n>", "skip videos longer than this many seconds", "6")
    .option("-l, --log-level <level>", `log level (${LOG_LEVELS.join("|")})`, "info")
    .option("-e, --enhance", "apply subtle photo-book tone enhancement to every output PNG")
    .allowExcessArguments(false);

  program.parse(argv, { from: "user" });

  const raw = program.opts<{
    concurrency: string;
    maxVideoSeconds: string;
    logLevel: string;
    enhance?: boolean;
  }>();
  const [dirArg = "."] = program.processedArgs as [string?];

  const concurrency = parsePositiveInt(raw.concurrency, "concurrency");
  const maxVideoSeconds = parsePositiveNumber(raw.maxVideoSeconds, "max-video-seconds");
  const logLevel = parseLogLevel(raw.logLevel);
  const enhance = Boolean(raw.enhance);
  const dir = resolve(dirArg);

  validateDir(dir);

  return { dir, concurrency, maxVideoSeconds, logLevel, enhance };
}

function defaultConcurrency(): number {
  return Math.max(1, availableParallelism());
}

function parsePositiveInt(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new ConfigError(`--${name} must be a positive integer (got "${value}")`);
  }
  return n;
}

function parsePositiveNumber(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ConfigError(`--${name} must be a positive number (got "${value}")`);
  }
  return n;
}

function parseLogLevel(value: string): LogLevel {
  if ((LOG_LEVELS as string[]).includes(value)) return value as LogLevel;
  throw new ConfigError(`--log-level must be one of ${LOG_LEVELS.join(", ")} (got "${value}")`);
}

function validateDir(dir: string): void {
  let stat;
  try {
    stat = statSync(dir);
  } catch {
    throw new ConfigError(`Directory not found: ${dir}`);
  }
  if (!stat.isDirectory()) {
    throw new ConfigError(`Not a directory: ${dir}`);
  }
}
