/**
 * Structured Logging Middleware
 *
 * Adiciona request ID, timestamp, e contexto a todos os logs.
 * Substitui console.error/console.warn espalhados por logging estruturado.
 */
import type { MiddlewareHandler } from "hono";
import type { Env } from "../types/env";

interface LogContext {
  requestId: string;
  method: string;
  path: string;
  orgId?: string;
  userId?: string;
}

function log(level: "info" | "warn" | "error", message: string, context: LogContext, extra?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
    ...extra,
  };
  // Em produção, isso seria enviado para Cloudflare Logpush / Analytics Engine
  console.log(JSON.stringify(entry));
}

export function structuredLogging(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const start = Date.now();
    const requestId = c.get("requestId") ?? crypto.randomUUID();

    const context: LogContext = {
      requestId,
      method: c.req.method,
      path: c.req.path,
    };

    try {
      await next();
      const duration = Date.now() - start;
      if (c.res.status >= 400) {
        log("warn", `${c.req.method} ${c.req.path} → ${c.res.status} (${duration}ms)`, context, {
          status: c.res.status,
          durationMs: duration,
        });
      }
    } catch (error) {
      const duration = Date.now() - start;
      log("error", `${c.req.method} ${c.req.path} → ERROR (${duration}ms)`, context, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: duration,
      });
      throw error;
    }
  };
}

/** Helper para logging estruturado dentro de rotas */
export function routeLog(
  level: "info" | "warn" | "error",
  message: string,
  requestId: string,
  extra?: Record<string, unknown>,
) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    ...extra,
  };
  console.log(JSON.stringify(entry));
}
