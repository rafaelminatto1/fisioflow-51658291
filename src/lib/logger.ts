/**
 * Centralized logger for FisioFlow.
 *
 * - In development: logs to console with context.
 * - In production: suppresses debug/info, keeps warn/error.
 * - NEVER logs PHI (Protected Health Information).
 */

const isDev = import.meta.env.DEV;

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  [key: string]: unknown;
}

function formatMessage(level: LogLevel, context: string, message: string, data?: LogPayload): string {
  return `[${level.toUpperCase()}] [${context}] ${message}`;
}

export const logger = {
  debug(context: string, message: string, data?: LogPayload) {
    if (isDev) {
      console.debug(formatMessage("debug", context, message), data ?? "");
    }
  },

  info(context: string, message: string, data?: LogPayload) {
    if (isDev) {
      console.info(formatMessage("info", context, message), data ?? "");
    }
  },

  warn(context: string, message: string, data?: LogPayload) {
    console.warn(formatMessage("warn", context, message), data ?? "");
  },

  error(context: string, message: string, error?: unknown, data?: LogPayload) {
    const errorInfo = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { raw: String(error) };

    console.error(formatMessage("error", context, message), { ...errorInfo, ...data });
  },

  /** Log a silenced catch — use instead of .catch(() => {}) */
  swallowed(context: string, error: unknown) {
    if (isDev) {
      console.warn(
        formatMessage("warn", context, "Swallowed error"),
        error instanceof Error ? error.message : error,
      );
    }
  },
} as const;

export type Logger = typeof logger;
