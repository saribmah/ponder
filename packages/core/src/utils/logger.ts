import pico from "picocolors";

import { PonderOptions } from "../config/options";

export enum LogLevel {
  // Silent 0
  Error, // 1
  Info, // 2
  Warn, // 3
  Debug, // 4
  Trace, // 5
}

type MessageKind =
  | "event"
  | "error"
  | "warning"
  | "historical"
  | "realtime"
  | "indexer";

export class LoggerService {
  logLevel: number;

  constructor({ options }: { options: PonderOptions }) {
    this.logLevel = options.logLevel;
  }

  error = (...args: Parameters<typeof console.log>) => {
    if (this.logLevel > LogLevel.Error) console.log(...args);
  };
  info = (...args: Parameters<typeof console.log>) => {
    if (this.logLevel > LogLevel.Info) console.log(...args);
  };
  warn = (...args: Parameters<typeof console.log>) => {
    if (this.logLevel > LogLevel.Warn) console.log(...args);
  };
  debug = (...args: Parameters<typeof console.log>) => {
    if (this.logLevel > LogLevel.Debug) console.log(...args);
  };
  trace = (...args: Parameters<typeof console.log>) => {
    if (this.logLevel > LogLevel.Trace) console.log(...args);
  };

  private maxWidth = 0;
  // This function is specifically for message logs.
  logMessage(kind: MessageKind, message: string) {
    this.maxWidth = Math.max(this.maxWidth, kind.length);
    const padded = kind.padEnd(this.maxWidth, " ");

    switch (kind) {
      case "event": {
        this.info(pico.magenta(padded) + " - " + message);
        break;
      }
      case "error": {
        this.error(pico.red(padded) + " - " + message);
        break;
      }
      case "warning": {
        this.error(pico.yellow(padded) + " - " + message);
        break;
      }
      case "historical": {
        this.info(pico.yellow(padded) + " - " + message);
        break;
      }
      case "realtime": {
        this.info(pico.cyan(padded) + " - " + message);
        break;
      }
      case "indexer": {
        this.info(pico.blue(padded) + " - " + message);
        break;
      }
    }
  }
}
