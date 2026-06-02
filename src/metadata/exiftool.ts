import { execa } from "execa";
import { ProcessError } from "../errors.js";

export interface ExifRecord {
  SourceFile: string;
  DateTimeOriginal?: string;
  SubSecTimeOriginal?: string;
  OffsetTimeOriginal?: string;
  CreateDate?: string;
  CreationDate?: string;
  GPSDateTime?: string;
  Duration?: string | number;
  MIMEType?: string;
  [tag: string]: unknown;
}

/** Tags requested from exiftool, kept narrow for speed. */
const TAGS = [
  "-DateTimeOriginal",
  "-SubSecTimeOriginal",
  "-OffsetTimeOriginal",
  "-CreateDate",
  "-CreationDate",
  "-GPSDateTime",
  "-Duration",
  "-MIMEType",
];

/** Keep argv well under typical limits by batching files. */
const DEFAULT_CHUNK_SIZE = 200;

/**
 * Read metadata for many files in as few exiftool invocations as possible.
 * Dates are requested in their raw stored form (no timezone conversion) so the
 * timezone math stays deterministic and host-independent. Returns a map keyed
 * by absolute path.
 */
export async function readMetadataBatch(
  exiftoolBin: string,
  files: string[],
  opts: { chunkSize?: number } = {},
): Promise<Map<string, ExifRecord>> {
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const result = new Map<string, ExifRecord>();

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    const records = await runChunk(exiftoolBin, chunk);
    for (const record of records) {
      result.set(record.SourceFile, record);
    }
  }

  return result;
}

async function runChunk(exiftoolBin: string, files: string[]): Promise<ExifRecord[]> {
  if (files.length === 0) return [];
  try {
    // No -dateFormat / -fast2 / QuickTimeUTC: exiftool emits the raw stored
    // values (DateTimeOriginal without tz, CreationDate with its offset,
    // QuickTime CreateDate as UTC), and timezone interpretation is done in
    // timestamp.ts.  -fast2 is intentionally omitted because it skips the
    // embedded EXIF block inside HEIC (ISOBMFF) containers.
    const { stdout } = await execa(exiftoolBin, ["-json", ...TAGS, ...files]);
    if (!stdout.trim()) return [];
    return JSON.parse(stdout) as ExifRecord[];
  } catch (error) {
    throw new ProcessError(`exiftool failed while reading metadata for ${files.length} file(s)`, {
      cause: error,
    });
  }
}
