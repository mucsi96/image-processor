# image-processor — contributor guide

## Code Review Rules

- Review the PR diff for actionable correctness, security, data-loss, and deployment regressions; cite the changed file/line and concrete impact.
- Preserve authentication boundaries, persisted data compatibility, and the project's documented build/test/deploy contracts. Adapt shared patterns to this project's stack.
- Report missing behavioral coverage where it would catch a specific regression; leave formatting and mechanical checks to CI.

## Codex automation

Use native Codex GitHub reviews and `@codex` PR tasks with ChatGPT sign-in.
Setup: https://github.com/mucsi96/skeleton-app/blob/main/docs/codex-automation.md

A TypeScript/Node.js (ESM, Node 22) CLI that batch-converts iPhone media (JPG, HEIC, Live
Photo videos) in a directory **in place** into orientation-corrected, high-quality JPEGs
(quality 100, 4:4:4 chroma — sized for print, e.g. CEWE photo books) named by capture
timestamp (`<unix-epoch-ms>.jpg`).

## Architecture

The tool orchestrates three system binaries (bundled in the Docker image) via child processes —
it does not reimplement codecs in JS:

- **ExifTool** — metadata / capture timestamps (`src/metadata/exiftool.ts`)
- **ImageMagick** — orientation + high-quality JPEG conversion, HEIC via libheif (`src/processors/photo.ts`, `src/processors/jpeg.ts`)
- **FFmpeg/ffprobe** — Live Photo frame extraction + duration probe (`src/processors/video.ts`, `src/scanner.ts`)

Pipeline (`src/pipeline.ts`): preflight binaries → scan dir → group by stem & filter →
batch-read metadata → resolve timestamp → process to temp JPEG → commit in place (move JPEG,
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
