/**
 * Photo-book tone enhancement for printed output.
 *
 * Print muddies saturation, flattens contrast, and softens edges relative to a
 * backlit screen. These three steps compensate without going past "natural":
 *  - `-modulate 103,112`: +3% brightness, +12% saturation
 *  - `-sigmoidal-contrast 3,50%`: gentle S-curve around mid-grey (no clipping)
 *  - `-unsharp 0x0.75+0.75+0.008`: sub-pixel sharpening to survive halftone
 *
 * Applied AFTER `-auto-orient` so the filter sees the final oriented pixels.
 */
export function buildEnhanceArgs(): string[] {
  return [
    "-modulate",
    "103,112",
    "-sigmoidal-contrast",
    "3,50%",
    "-unsharp",
    "0x0.75+0.75+0.008",
  ];
}
