import { rename, rm, copyFile, unlink } from "node:fs/promises";
import type { ScannedFile } from "./types.js";

/**
 * Move a freshly produced temp JPEG to its final in-place location, then remove
 * the original source file and all attached leftovers (paired video, sidecars).
 *
 * Uses rename when possible and falls back to copy+unlink across devices.
 * The temp file lives in the same directory as the source, so rename is the
 * normal path.
 */
export async function commitInPlace(
  tempPath: string,
  finalPath: string,
  source: ScannedFile,
  leftovers: ScannedFile[],
): Promise<void> {
  await moveFile(tempPath, finalPath);

  // Remove the original source unless the conversion already wrote over it
  // (i.e. the source happened to have the exact final name).
  if (source.absPath !== finalPath) {
    await safeRemove(source.absPath);
  }

  for (const leftover of leftovers) {
    if (leftover.absPath !== finalPath) {
      await safeRemove(leftover.absPath);
    }
  }
}

async function moveFile(from: string, to: string): Promise<void> {
  try {
    await rename(from, to);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EXDEV") {
      await copyFile(from, to);
      await unlink(from);
      return;
    }
    throw error;
  }
}

async function safeRemove(path: string): Promise<void> {
  await rm(path, { force: true });
}
