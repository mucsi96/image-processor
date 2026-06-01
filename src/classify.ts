import type { MediaKind } from "./types.js";

const JPG_EXTS = new Set(["jpg", "jpeg"]);
const HEIC_EXTS = new Set(["heic", "heif"]);
const VIDEO_EXTS = new Set(["mov", "mp4", "m4v"]);

/** Lower-cased extension without the leading dot (empty string if none). */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

/** Lower-cased basename without its extension. */
export function stemOf(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot <= 0 ? name : name.slice(0, dot);
  return base.toLowerCase();
}

/** Classify a file by extension into how the pipeline should treat it. */
export function classify(ext: string): MediaKind {
  if (JPG_EXTS.has(ext)) return "jpg";
  if (HEIC_EXTS.has(ext)) return "heic";
  if (VIDEO_EXTS.has(ext)) return "video";
  return "unsupported";
}

/** Whether a kind is a still image (the preferred source within a stem group). */
export function isStill(kind: MediaKind): boolean {
  return kind === "jpg" || kind === "heic";
}
