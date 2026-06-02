#!/usr/bin/env bash
# Build the image locally with podman, using the same Dockerfile CI uses.
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-localhost/image-processor:dev}"

echo "Building $IMAGE ..."
podman build -t "$IMAGE" .
echo "Built $IMAGE"
