/** Classification of a scanned file by how it should be processed. */
export type MediaKind = "jpg" | "heic" | "video" | "unsupported";

/** A single entry discovered in the target directory. */
export interface ScannedFile {
  /** Absolute path on disk. */
  absPath: string;
  /** File name including extension. */
  name: string;
  /** Lower-cased basename without extension (the "stem" used for pairing). */
  stem: string;
  /** Lower-cased extension without the leading dot. */
  ext: string;
  kind: MediaKind;
  stat: { mtimeMs: number; size: number };
}

/** Where the taken-timestamp ultimately came from. */
export type TimestampSource =
  | "exif-subsec-tz"
  | "exif-datetimeoriginal"
  | "quicktime-creationdate"
  | "quicktime-createdate"
  | "user-prompt";

export interface TakenTimestamp {
  /** Milliseconds since the Unix epoch (UTC). */
  epochMs: number;
  source: TimestampSource;
  /** True when a timezone offset was known; false when UTC was assumed. */
  hadTimezone: boolean;
}

/**
 * A unit of work: the source file to convert plus any companion files that
 * should be removed once the conversion succeeds (Live Photo video + sidecars).
 */
export interface ProcessingItem {
  /** The file that produces the JPEG. */
  source: ScannedFile;
  /** Files sharing the stem that get deleted on commit (video, .AAE, .XMP, ...). */
  leftovers: ScannedFile[];
}

export type ProcessStatus = "converted" | "skipped" | "error";

export interface ProcessResult {
  input: string;
  output?: string;
  status: ProcessStatus;
  source?: TimestampSource;
  /** Number of companion files removed alongside the source. */
  leftoversRemoved: number;
  /** Human-readable reason for skip/error. */
  detail?: string;
}
