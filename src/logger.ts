import { pino, type Logger } from "pino";
import type { LogLevel } from "./config.js";

export type { Logger };

/** Create a pretty, human-readable logger for CLI output. */
export function createLogger(level: LogLevel): Logger {
  return pino({
    level,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  });
}
