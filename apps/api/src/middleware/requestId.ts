import type { Context, Next } from "hono";
import { randomUUID } from "crypto";
import type { Env } from "../types/env";

export interface CustomVariables {
  requestId: string;
}

export type CustomContext = Context<{ Bindings: Env; Variables: CustomVariables }>;

export async function requestIdMiddleware(c: CustomContext, next: Next) {
  const existingRequestId = c.req.header("X-Request-ID");
  const requestId = existingRequestId || randomUUID();

  c.set("requestId", requestId);

  await next();

  c.res.headers.set("X-Request-ID", requestId);
}
