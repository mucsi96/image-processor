import { ProcessError } from "../errors.js";
import type { Binaries } from "../binaries.js";
import type { ScannedFile } from "../types.js";
import { processPhoto } from "./photo.js";
import { processVideo } from "./video.js";

/** Dispatch a file to the right processor, writing a PNG to outPath. */
export async function processFile(
  bin: Binaries,
  file: ScannedFile,
  outPath: string,
): Promise<void> {
  switch (file.kind) {
    case "jpg":
    case "heic":
      return processPhoto(bin, file, outPath);
    case "video":
      return processVideo(bin, file, outPath);
    default:
      throw new ProcessError(`Unsupported file kind for ${file.name}`);
  }
}
