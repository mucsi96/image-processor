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
  enhance: boolean,
): Promise<void> {
  switch (file.kind) {
    case "jpg":
    case "heic":
      return processPhoto(bin, file, outPath, enhance);
    case "video":
      return processVideo(bin, file, outPath, enhance);
    default:
      throw new ProcessError(`Unsupported file kind for ${file.name}`);
  }
}
