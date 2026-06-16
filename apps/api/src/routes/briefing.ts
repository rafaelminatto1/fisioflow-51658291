import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables, type AuthUser } from "../lib/auth";
import { rateLimit } from "../middleware/rateLimit";
import { getRawSql } from "../lib/db";
import { gatherBriefingData } from "../lib/briefing/queries";
import { buildBriefing } from "../lib/briefing/buildBriefing";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

export async function getBriefing(env: Env, user: AuthUser) {
  const sql = getRawSql(env, "read");
  const raw = await gatherBriefingData((q, p) => sql(q, p), user.organizationId);
  return buildBriefing(raw);
}

app.get(
  "/",
  requireAuth,
  rateLimit({ endpoint: "briefing", limit: 120, windowSeconds: 3600 }),
  async (c) => {
    const user = c.get("user");
    return c.json(await getBriefing(c.env, user));
  },
);

export default app;
