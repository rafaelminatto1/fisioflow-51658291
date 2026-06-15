import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth, requireRole } from "../../lib/auth";
import { runSessionArchive } from "../../lib/sessionArchive";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/admin/trigger-session-archive
 * S6.2 — dispara manualmente o pipeline R2 archive (mesmo que o cron mensal).
 * Util para validar configuracao do EVENTS_PIPELINE / sink Iceberg em staging.
 */
app.use("*", requireAuth);
app.use("*", requireRole("admin"));
app.post("/", async (c) => {
  const _user = c.get("user");

  const result = await runSessionArchive(c.env, "manual");
  return c.json({ data: result });
});

export { app as triggerSessionArchiveRoutes };
