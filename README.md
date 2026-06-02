# image-processor

A batch CLI that turns a folder of iPhone media into a clean, uniformly-named set of PNGs.

It is built to run as a Docker image (published to Docker Hub) so it works the same on WSL,
Linux, or macOS via `podman`/`docker` with a single volume mount.

## What it does

For every supported file in a directory it:

1. **Reads the real capture timestamp** from metadata (ExifTool) using the most reliable
   source available — EXIF `DateTimeOriginal` + sub-second + timezone offset for photos,
   QuickTime `CreationDate`/`CreateDate` for videos, and the filesystem modification time as a
   last resort.
2. **Fixes orientation** by baking the EXIF rotation into the pixels (ImageMagick
   `-auto-orient`).
3. **Extracts the best still** from short Live Photo videos — a single representative frame
   (FFmpeg `thumbnail` filter).
4. **Converts to PNG**.
5. **Renames** the output to `<capture-timestamp-unix-epoch-ms>.png`
   (e.g. `1717236000123.png`). Same-millisecond collisions get a `_1`, `_2`, … suffix.

### Supported input

| Type                      | Extensions             | Handling                             |
| ------------------------- | ---------------------- | ------------------------------------ |
| JPEG                      | `.jpg`, `.jpeg`        | orient → PNG                         |
| HEIC / HEIF               | `.heic`, `.heif`       | orient → PNG (primary image)         |
| Live Photo / short videos | `.mov`, `.mp4`, `.m4v` | best frame → orient → PNG (if short) |

### Live Photos and leftovers

iPhone Live Photos arrive as a **pair** that shares a basename — a still (`IMG_1234.HEIC`) and
a video (`IMG_1234.MOV`), sometimes with an `.AAE` edit-metadata sidecar. When a still is
present the tool converts **only the still** and removes **all leftovers for that stem** (the
paired video and any `.AAE`/`.XMP` sidecars), so each group collapses to a single PNG.

Standalone videos are processed into a still only when they are short (Live-Photo length,
`--max-video-seconds`, default `6`); longer clips are left untouched.

> ⚠️ **Processing happens in place.** Each converted original is **replaced** by its PNG and
> the source file (plus its leftovers) is deleted. Keep a backup and/or run `--dry-run` first.

## Usage

The CLI works on a single directory in place (defaults to the current directory). Mount your
media folder at `/data`:

```bash
# from the folder full of iPhone exports
podman run --rm -v "$PWD:/data" mucsi96/image-processor

# preview what would happen, without changing anything
podman run --rm -v "$PWD:/data" mucsi96/image-processor --dry-run
```

`docker` works identically:

```bash
docker run --rm -v "$PWD:/data" mucsi96/image-processor
```

### Options

```
image-processor [dir] [options]

Arguments:
  dir                          directory to process (default: current directory)

Options:
  -c, --concurrency <n>        files processed in parallel (default: CPU count)
  -m, --max-video-seconds <n>  skip videos longer than this many seconds (default: 6)
  -d, --dry-run                report planned conversions/deletions without changing files
  -l, --log-level <level>      debug | info | warn | error (default: info)
  -h, --help                   show help
```

Inside the container the working directory is `/data`, so `dir` defaults to the mount. To
process a subfolder of the mount, pass it explicitly, e.g. `... mucsi96/image-processor exports`.

## How it's published

Images are published to Docker Hub as
[`mucsi96/image-processor`](https://hub.docker.com/r/mucsi96/image-processor), tagged with the
released version and `latest`. CI builds and verifies the image on every push/PR, and publishes
a new version (and GitHub release) when a release-worthy change lands on `main`. Dependencies
are kept up to date with Renovate.

## Local development

Requires Node.js 22 and `podman`. The image bundles ImageMagick (with libheif), FFmpeg, and
ExifTool, so you don't need them on the host to build or smoke-test.

```bash
npm ci
npm run lint && npm run typecheck && npm run build

# build the image and smoke-test it against your own samples
scripts/build_image.sh
mkdir -p sample && cp /path/to/iphone/exports/* sample/   # your own files (gitignored)
scripts/smoke_test.sh
```

VS Code tasks (**Install dependencies**, **Lint & typecheck**, **Build image**, **Smoke test**)
wrap these for one-click runs.

To run the CLI directly on the host (needs ImageMagick/FFmpeg/ExifTool installed locally):

```bash
npm run dev -- ./some-dir --dry-run
```

## License

MIT
