#!/usr/bin/env bash
# Process ./sample in place using the published image. Extra CLI options are forwarded.
set -euo pipefail

SAMPLE_DIR="$(cd "$(dirname "$0")/.." && pwd)/sample"

if [ ! -d "$SAMPLE_DIR" ]; then
  echo "Put some sample media files in $SAMPLE_DIR first." >&2
  exit 1
fi

podman run --rm -it -v "$SAMPLE_DIR:/data" docker.io/mucsi96/image-processor "$@"
