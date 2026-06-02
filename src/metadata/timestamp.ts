import type { ScannedFile, TakenTimestamp, TimestampSource } from "../types.js";
import type { ExifRecord } from "./exiftool.js";

/** Parsed calendar components plus an optional timezone offset (minutes east of UTC). */
interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** Offset in minutes east of UTC, or null when the string carried no offset. */
  offsetMinutes: number | null;
}

const DATE_RE =
  /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/;

/** Parse an EXIF/QuickTime date string. Returns null when it does not match. */
export function parseDateParts(value: string | undefined): DateParts | null {
  if (!value) return null;
  const trimmed = value.trim();
  const m = DATE_RE.exec(trimmed);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, tz] = m;
  return {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s),
    offsetMinutes: parseOffset(tz),
  };
}

function parseOffset(tz: string | undefined): number | null {
  if (!tz) return null;
  if (tz === "Z") return 0;
  const sign = tz[0] === "-" ? -1 : 1;
  const digits = tz.slice(1).replace(":", "");
  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));
  return sign * (hours * 60 + minutes);
}

/** Convert a sub-second EXIF field (e.g. "12" => 120ms, "123" => 123ms) to ms. */
export function subSecToMs(subSec: string | undefined): number {
  if (!subSec) return 0;
  const digits = subSec.trim().replace(/\D/g, "");
  if (!digits) return 0;
  const fraction = Number(`0.${digits}`);
  return Math.round(fraction * 1000);
}

/**
 * Turn parsed parts into epoch ms. When the string carried no offset, the
 * supplied fallback offset is used (e.g. 0 = treat as UTC).
 */
function toEpochMs(parts: DateParts, fallbackOffsetMinutes: number, extraMs = 0): number {
  const offset = parts.offsetMinutes ?? fallbackOffsetMinutes;
  const utc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    extraMs,
  );
  return utc - offset * 60_000;
}

interface Resolved {
  epochMs: number;
  source: TimestampSource;
  hadTimezone: boolean;
}

/** Resolve the still/photo timestamp chain from an EXIF record. */
function resolvePhoto(rec: ExifRecord): Resolved | null {
  const dto = parseDateParts(str(rec.DateTimeOriginal));
  if (!dto) return null;
  const ms = subSecToMs(str(rec.SubSecTimeOriginal));
  const explicitOffset = parseOffset(str(rec.OffsetTimeOriginal));
  if (dto.offsetMinutes !== null || explicitOffset !== null) {
    const offset = dto.offsetMinutes ?? explicitOffset ?? 0;
    return {
      epochMs: toEpochMs({ ...dto, offsetMinutes: offset }, 0, ms),
      source: "exif-subsec-tz",
      hadTimezone: true,
    };
  }
  // No timezone known: assume the wall-clock is UTC.
  return {
    epochMs: toEpochMs(dto, 0, ms),
    source: "exif-datetimeoriginal",
    hadTimezone: false,
  };
}

/** Resolve the video timestamp chain from an EXIF record. */
function resolveVideo(rec: ExifRecord): Resolved | null {
  // Apple's CreationDate carries the capture offset.
  const creation = parseDateParts(str(rec.CreationDate));
  if (creation && creation.offsetMinutes !== null) {
    return {
      epochMs: toEpochMs(creation, 0),
      source: "quicktime-creationdate",
      hadTimezone: true,
    };
  }
  // QuickTime CreateDate is stored in UTC.
  const created = parseDateParts(str(rec.CreateDate));
  if (created) {
    return {
      epochMs: toEpochMs(created, 0),
      source: "quicktime-createdate",
      hadTimezone: false,
    };
  }
  // CreationDate without an offset, treated as UTC.
  if (creation) {
    return {
      epochMs: toEpochMs(creation, 0),
      source: "quicktime-creationdate",
      hadTimezone: false,
    };
  }
  return null;
}

/**
 * Resolve the most reliable "taken" timestamp for a file from EXIF/QuickTime
 * metadata. Returns null when no metadata timestamp is available.
 */
export function resolveTaken(rec: ExifRecord | undefined, file: ScannedFile): TakenTimestamp | null {
  if (rec) {
    const resolved = file.kind === "video" ? resolveVideo(rec) : resolvePhoto(rec);
    // A still might lack EXIF but a video might carry photo tags and vice versa;
    // try the other chain before giving up.
    const fallbackChain =
      resolved ?? (file.kind === "video" ? resolvePhoto(rec) : resolveVideo(rec));
    if (fallbackChain) {
      return {
        epochMs: fallbackChain.epochMs,
        source: fallbackChain.source,
        hadTimezone: fallbackChain.hadTimezone,
      };
    }
  }
  return null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
