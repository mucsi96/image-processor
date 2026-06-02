import { execa } from "execa";
import { ProcessError } from "../errors.js";
import type { Binaries } from "../binaries.js";
import type { ScannedFile } from "../types.js";

/**
 * Convert a JPG/HEIC still to PNG, baking the EXIF orientation into the pixels
 * via ImageMagick's -auto-orient. For HEIC the primary image ([0]) is selected.
 */
export async function processPhoto(
  bin: Binaries,
  file: ScannedFile,
  outPath: string,
): Promise<void> {
  const input = file.kind === "heic" ? `${file.absPath}[0]` : file.absPath;
  try {
    await execa(bin.magick, [input, "-auto-orient", outPath]);
  } catch (error) {
    throw new ProcessError(`ImageMagick failed to convert ${file.name}`, { cause: error });
  }
}
