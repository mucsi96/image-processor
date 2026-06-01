import { execa } from "execa";
import { BinaryError } from "./errors.js";

export interface Binaries {
  exiftool: string;
  magick: string;
  ffmpeg: string;
  ffprobe: string;
}

/** ImageMagick ships as `magick` (v7) or legacy `convert`; prefer `magick`. */
const MAGICK_CANDIDATES = ["magick", "convert"];

/**
 * Locate and version-check the external binaries the pipeline depends on.
 * Throws a BinaryError listing everything missing so the user sees one clear
 * message instead of a mid-run failure.
 */
export async function resolveBinaries(): Promise<Binaries> {
  const missing: string[] = [];

  const exiftool = (await isAvailable("exiftool", ["-ver"])) ? "exiftool" : null;
  if (!exiftool) missing.push("exiftool");

  let magick: string | null = null;
  for (const candidate of MAGICK_CANDIDATES) {
    if (await isAvailable(candidate, ["-version"])) {
      magick = candidate;
      break;
    }
  }
  if (!magick) missing.push("imagemagick (magick/convert)");

  const ffmpeg = (await isAvailable("ffmpeg", ["-version"])) ? "ffmpeg" : null;
  if (!ffmpeg) missing.push("ffmpeg");

  const ffprobe = (await isAvailable("ffprobe", ["-version"])) ? "ffprobe" : null;
  if (!ffprobe) missing.push("ffprobe");

  if (missing.length > 0) {
    throw new BinaryError(
      `Missing required tool(s): ${missing.join(", ")}. ` +
        `Install them, or run the published Docker image which bundles them.`,
    );
  }

  return {
    exiftool: exiftool!,
    magick: magick!,
    ffmpeg: ffmpeg!,
    ffprobe: ffprobe!,
  };
}

async function isAvailable(bin: string, args: string[]): Promise<boolean> {
  try {
    await execa(bin, args, { stdout: "ignore", stderr: "ignore" });
    return true;
  } catch {
    return false;
  }
}
