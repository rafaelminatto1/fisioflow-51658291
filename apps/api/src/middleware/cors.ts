/**
 * CORS Middleware Centralizado
 *
 * Valida a origem contra ALLOWED_ORIGINS (CSV) e aplica headers CORS.
 * Usar em vez de headers CORS manuais em cada rota.
 */
import type { MiddlewareHandler } from "hono";
import type { Env } from "../types/env";

export function corsMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const origin = c.req.header("origin");
    const allowedOrigins = (c.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
      c.header("Access-Control-Max-Age", "86400");
      c.header("Access-Control-Allow-Credentials", "true");
    }

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  };
}
