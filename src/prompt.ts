import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { parseDateParts } from "./metadata/timestamp.js";
import type { ScannedFile, TakenTimestamp } from "./types.js";

const PROMPT_HINT =
  "Enter creation date (e.g. 2024-06-15T14:30:00Z or 2024-06-15 14:30:00+02:00), or blank to skip";

/**
 * Ask the user for a capture date for a file that has no metadata timestamp.
 * Returns null when the user skips (blank input) or when stdin is not interactive.
 */
export async function promptForTimestamp(file: ScannedFile): Promise<TakenTimestamp | null> {
  if (!stdin.isTTY || !stdout.isTTY) return null;

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    stdout.write(`\nNo metadata timestamp found for ${file.name}.\n${PROMPT_HINT}\n`);
    for (;;) {
      const answer = (await rl.question("> ")).trim();
      if (!answer) return null;

      const epochMs = toEpochMs(answer);
      if (epochMs !== null) {
        return { epochMs, source: "user-prompt", hadTimezone: hasTimezone(answer) };
      }
      stdout.write(`Could not parse "${answer}". ${PROMPT_HINT}.\n`);
    }
  } finally {
    rl.close();
  }
}

function toEpochMs(value: string): number | null {
  const parts = parseDateParts(value);
  if (!parts) return null;
  const offset = parts.offsetMinutes ?? 0;
  const utc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const epochMs = utc - offset * 60_000;
  return Number.isFinite(epochMs) ? epochMs : null;
}

function hasTimezone(value: string): boolean {
  return /(Z|[+-]\d{2}:?\d{2})\s*$/.test(value.trim());
}
