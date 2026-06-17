import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables, type AuthUser } from "../lib/auth";
import { rateLimit } from "../middleware/rateLimit";
import { getRawSql } from "../lib/db";
import { gatherBriefingData } from "../lib/briefing/queries";
import { buildBriefing } from "../lib/briefing/buildBriefing";
import { formatBriefingEmail } from "../lib/briefing/formatBriefingEmail";
import { createResend } from "../lib/email";

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

// On-demand send (admin) — emails the briefing now, for testing/manual re-send.
app.post(
  "/send",
  requireAuth,
  rateLimit({ endpoint: "briefing-send", limit: 20, windowSeconds: 3600 }),
  async (c) => {
    const user = c.get("user");
    if (user.role !== "admin") return c.json({ error: "Apenas admin" }, 403);
    const body = await c.req.json().catch(() => ({}));
    const to = String(body?.to ?? c.env.MORNING_BRIEFING_TO ?? user.email ?? "");
    if (!to) return c.json({ error: "Sem destinatário (informe 'to' ou configure MORNING_BRIEFING_TO)" }, 400);
    const resend = createResend(c.env);
    if (!resend) return c.json({ error: "Resend não configurado" }, 503);
    const briefing = await getBriefing(c.env, user);
    const { subject, html } = formatBriefingEmail(briefing);
    await resend.emails.send({
      from: c.env.RESEND_FROM_EMAIL ?? "FisioFlow <noreply@moocafisio.com.br>",
      to,
      subject,
      html,
    });
    return c.json({ ok: true, to, summary: briefing.summary });
  },
);

export default app;
