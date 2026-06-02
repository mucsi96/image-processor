/**
 * High-quality JPEG output for print (e.g. CEWE photo books).
 *
 * - `-quality 100`: minimal DCT quantisation, the highest practical JPEG fidelity.
 * - `-sampling-factor 4:4:4`: no chroma subsampling, so fine colour edges survive
 *   the halftone screening a photo printer applies.
 *
 * The temp output path carries a `.tmp-<pid>-<suffix>` extension, so the encoder
 * cannot infer the format from it — `jpegOutput` adds an explicit `JPEG:` prefix
 * to force JPEG regardless of the on-disk name.
 */
export const JPEG_QUALITY_ARGS = ["-quality", "100", "-sampling-factor", "4:4:4"];

/** Wrap an output path so ImageMagick writes JPEG irrespective of its extension. */
export function jpegOutput(outPath: string): string {
  return `JPEG:${outPath}`;
}
