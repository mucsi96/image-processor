/** A required external binary was missing or failed its version check. */
export class BinaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BinaryError";
  }
}

/** A child-process invocation (exiftool/magick/ffmpeg) failed. */
export class ProcessError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProcessError";
  }
}

/** Bad CLI input / configuration. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
