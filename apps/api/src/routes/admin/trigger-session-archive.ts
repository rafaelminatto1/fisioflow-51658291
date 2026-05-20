import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { runSessionArchive } from "../../lib/sessionArchive";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * POST /api/admin/trigger-session-archive
 * S6.2 — dispara manualmente o pipeline R2 archive (mesmo que o cron mensal).
 * Util para validar configuracao do EVENTS_PIPELINE / sink Iceberg em staging.
 */
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ error: "admin_only" }, 403);

  const result = await runSessionArchive(c.env, "manual");
  return c.json({ data: result });
});

export { app as triggerSessionArchiveRoutes };
