# syntax=docker/dockerfile:1

# --- build stage -------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Keep only production dependencies for the runtime image.
RUN npm prune --omit=dev

# --- runtime stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Bundled media tooling: ImageMagick (+libheif for HEIC), FFmpeg, ExifTool.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        imagemagick \
        libheif1 \
        ffmpeg \
        libimage-exiftool-perl \
    && rm -rf /var/lib/apt/lists/* \
    # Fail the build early if HEIC support is missing from ImageMagick.
    && (magick -list format 2>/dev/null || convert -list format 2>/dev/null) | grep -qi heic

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# The CLI operates in place on its working directory; mount your media at /data.
WORKDIR /data
ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD []
