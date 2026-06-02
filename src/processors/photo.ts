import { execa } from "execa";
import { ProcessError } from "../errors.js";
import type { Binaries } from "../binaries.js";
import type { ScannedFile } from "../types.js";
import { buildEnhanceArgs } from "./enhance.js";
import { JPEG_QUALITY_ARGS, jpegOutput } from "./jpeg.js";

/**
 * Convert a JPG/HEIC still to a high-quality JPEG, baking the EXIF orientation
 * into the pixels via ImageMagick's -auto-orient. For HEIC the primary image
 * ([0]) is selected.
 */
export async function processPhoto(
  bin: Binaries,
  file: ScannedFile,
  outPath: string,
  enhance: boolean,
): Promise<void> {
  const input = file.kind === "heic" ? `${file.absPath}[0]` : file.absPath;
  const args = [
    input,
    "-auto-orient",
    ...(enhance ? buildEnhanceArgs() : []),
    ...JPEG_QUALITY_ARGS,
    jpegOutput(outPath),
  ];
  try {
    await execa(bin.magick, args);
  } catch (error) {
    throw new ProcessError(`ImageMagick failed to convert ${file.name}`, { cause: error });
  }
}
