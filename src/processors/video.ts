import { execa } from "execa";
import { ProcessError } from "../errors.js";
import type { Binaries } from "../binaries.js";
import type { ScannedFile } from "../types.js";
import { buildEnhanceArgs } from "./enhance.js";

/**
 * Extract a single representative still from a (short) Live Photo video.
 * FFmpeg's `thumbnail` filter analyses a window of frames and picks the most
 * representative one; ffmpeg applies container rotation by default, and a
 * defensive ImageMagick -auto-orient pass normalises anything left over.
 */
export async function processVideo(
  bin: Binaries,
  file: ScannedFile,
  outPath: string,
  enhance: boolean,
): Promise<void> {
  try {
    await execa(bin.ffmpeg, [
      "-y",
      "-i",
      file.absPath,
      "-vf",
      "thumbnail",
      "-frames:v",
      "1",
      "-update",
      "1",
      outPath,
    ]);
  } catch (error) {
    throw new ProcessError(`FFmpeg failed to extract a frame from ${file.name}`, {
      cause: error,
    });
  }

  const args = [outPath, "-auto-orient", ...(enhance ? buildEnhanceArgs() : []), outPath];
  try {
    await execa(bin.magick, args);
  } catch (error) {
    throw new ProcessError(`ImageMagick failed to orient frame from ${file.name}`, {
      cause: error,
    });
  }
}
