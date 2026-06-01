# image-processor — contributor guide

A TypeScript/Node.js (ESM, Node 22) CLI that batch-converts iPhone media (JPG, HEIC, Live
Photo videos) in a directory **in place** into orientation-corrected PNGs named by capture
timestamp (`<unix-epoch-ms>.png`).

## Architecture

The tool orchestrates three system binaries (bundled in the Docker image) via child processes —
it does not reimplement codecs in JS:

- **ExifTool** — metadata / capture timestamps (`src/metadata/exiftool.ts`)
- **ImageMagick** — orientation + raster conversion, HEIC via libheif (`src/processors/photo.ts`)
- **FFmpeg/ffprobe** — Live Photo frame extraction + duration probe (`src/processors/video.ts`, `src/scanner.ts`)

Pipeline (`src/pipeline.ts`): preflight binaries → scan dir → group by stem & filter →
batch-read metadata → resolve timestamp → process to temp PNG → commit in place (move PNG,
delete original + leftovers).

## Conventions

- ESM with explicit `.js` import extensions (`NodeNext`).
- Keep `src/naming.ts` and `src/metadata/timestamp.ts` **pure and timezone-explicit** — never
  rely on the host `TZ`. Timezone math is done by hand against UTC.
- Shell out via `execa` with argument arrays (no shell strings).
- Errors use the typed classes in `src/errors.ts`.

## Commands

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build       # tsc -> dist/
npm run dev -- DIR  # run from source (needs local binaries)
scripts/build_image.sh   # podman build
scripts/smoke_test.sh    # build + run against ./sample
```

No automated test suite yet; verify via the smoke test against real sample media.
