#!/usr/bin/env bash
# Smoke-test the locally built image against a copy of ./sample.
#
# Drop a few real iPhone exports into ./sample/ first. This script copies them
# into a throwaway ./.scratch/ directory (since processing is in place), runs a
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-localhost/image-processor:dev}"
SAMPLE_DIR="sample"
SCRATCH_DIR=".scratch"

if [ ! -d "$SAMPLE_DIR" ] || [ -z "$(ls -A "$SAMPLE_DIR" 2>/dev/null)" ]; then
  echo "Put some sample media files in ./$SAMPLE_DIR first." >&2
  exit 1
fi

rm -rf "$SCRATCH_DIR"
mkdir -p "$SCRATCH_DIR"
cp -a "$SAMPLE_DIR"/. "$SCRATCH_DIR"/

podman run --rm -it -v "$PWD/$SCRATCH_DIR:/data" "$IMAGE"

echo "=== result ($SCRATCH_DIR) ==="
ls -1 "$SCRATCH_DIR"
