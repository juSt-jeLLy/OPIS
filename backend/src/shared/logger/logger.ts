export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

const emit = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context } : {}),
  };

  const formatter = level === "error" ? console.error : console.log;
  formatter(JSON.stringify(payload));
};

export const logger: Logger = {
  info: (message, context) => emit("info", message, context),
  warn: (message, context) => emit("warn", message, context),
  error: (message, context) => emit("error", message, context),
};
