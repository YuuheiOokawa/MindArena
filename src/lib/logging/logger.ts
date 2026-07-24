type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, fields?: LogFields) {
  const payload = { level, message, ts: new Date().toISOString(), ...fields };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * The single sanctioned place raw console calls happen (source spec §36: no console.log in
 * app code). Every other module logs through this.
 */
export const logger = {
  debug: (message: string, fields?: LogFields) => {
    if (process.env.NODE_ENV !== "production") emit("debug", message, fields);
  },
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, error?: unknown, fields?: LogFields) =>
    emit("error", message, {
      ...fields,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    }),
};
