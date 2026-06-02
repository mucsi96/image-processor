import { execa } from "execa";
import { ProcessError } from "../errors.js";
import type { Binaries } from "../binaries.js";
import type { ScannedFile } from "../types.js";
import { buildEnhanceArgs } from "./enhance.js";
import { JPEG_QUALITY_ARGS, jpegOutput } from "./jpeg.js";

/**
 * Extract a single representative still from a (short) Live Photo video.
 * FFmpeg's `thumbnail` filter analyses a window of frames and picks the most
 * representative one; ffmpeg applies container rotation by default, and a
 * defensive ImageMagick -auto-orient pass normalises anything left over.
 *
 * FFmpeg writes a lossless PNG intermediate (forced via the image2/png muxer,
 * since the temp path has no recognisable extension); ImageMagick then produces
 * the final high-quality JPEG, so the frame is only JPEG-encoded once.
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
      "-c:v",
      "png",
      "-f",
      "image2",
      outPath,
    ]);
  } catch (error) {
    throw new ProcessError(`FFmpeg failed to extract a frame from ${file.name}`, {
      cause: error,
    });
  }

  const args = [
    outPath,
    "-auto-orient",
    ...(enhance ? buildEnhanceArgs() : []),
    ...JPEG_QUALITY_ARGS,
    jpegOutput(outPath),
  ];
  try {
    await execa(bin.magick, args);
  } catch (error) {
    throw new ProcessError(`ImageMagick failed to orient frame from ${file.name}`, {
      cause: error,
    });
  }
}
