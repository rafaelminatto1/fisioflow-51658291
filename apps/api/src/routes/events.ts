import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { writeEvent } from "../lib/analytics";
import { getRawSql } from "../lib/db";
import { mergeFeed } from "../lib/events/feed";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/events/feed — feed de atividades da org (automações + sync Calendar).
app.get("/feed", requireAuth, async (c) => {
  const user = c.get("user");
  const sql = getRawSql(c.env, "read");
  const autos = await sql(
    `SELECT automation_name, event_type, status, created_at
       FROM automation_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [user.organizationId],
  );
  let gcalRows: Record<string, unknown>[] = [];
  try {
    const gcal = await sql(
      `SELECT gsl.message, gsl.status, gsl.created_at
         FROM google_sync_logs gsl
         JOIN google_integrations gi ON gi.id = gsl.integration_id
        WHERE gi.organization_id = $1 ORDER BY gsl.created_at DESC LIMIT 50`,
      [user.organizationId],
    );
    gcalRows = gcal.rows ?? [];
  } catch {
    gcalRows = [];
  }
  return c.json({ data: mergeFeed(autos.rows ?? [], gcalRows) });
});

type BusinessEvent = {
  type: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
};

/**
 * POST /api/events
 *
 * Ingestão de eventos de negócio via Cloudflare Pipelines → R2 Iceberg.
 * Open beta: sem custo adicional além do armazenamento R2.
 *
 * Eventos suportados:
 *  - appointment.completed, appointment.cancelled, appointment.rescheduled
 *  - session.created, session.finalized
 *  - exercise.completed, exercise.skipped
 *  - payment.received, payment.refunded
 *  - patient.registered, patient.discharged, patient.inactive
 *  - hep.adherence_checked
 *
 * Esses eventos são armazenados em R2 como Apache Parquet/Iceberg
 * e podem ser consultados com DuckDB para Business Intelligence.
 */
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as { events: BusinessEvent[] } | BusinessEvent;

  const events: BusinessEvent[] = Array.isArray((body as any).events)
    ? (body as { events: BusinessEvent[] }).events
    : [body as BusinessEvent];

  if (!events.length) {
    return c.json({ error: "Nenhum evento fornecido" }, 400);
  }

  const enriched = events.map((e) => ({
    ...e,
    organizationId: user.organizationId,
    userId: user.uid,
    timestamp: e.timestamp ?? Date.now(),
    environment: c.env.ENVIRONMENT,
  }));

  // Envia para Pipeline (R2 Iceberg) se disponível
  if (c.env.EVENTS_PIPELINE) {
    try {
      await c.env.EVENTS_PIPELINE.send(enriched);
    } catch (err) {
      console.error("[Events] Pipeline send failed:", err);
      // Fallback para Analytics Engine
    }
  }

  // Analytics Engine: sempre registra para observabilidade em tempo real
  for (const e of enriched) {
    writeEvent(c.env, {
      event: e.type,
      orgId: user.organizationId,
      route: "/api/events",
      method: "POST",
      status: 200,
    });
  }

  return c.json({ accepted: enriched.length });
});

/**
 * Helper para enviar eventos a partir de outros handlers (fire-and-forget).
 * Uso: ctx.waitUntil(sendBusinessEvent(env, user.organizationId, user.uid, { type: 'appointment.completed', ... }))
 */
export async function sendBusinessEvent(
  env: Env,
  organizationId: string,
  userId: string,
  event: BusinessEvent,
): Promise<void> {
  const enriched = {
    ...event,
    organizationId,
    userId,
    timestamp: event.timestamp ?? Date.now(),
    environment: env.ENVIRONMENT,
  };

  // Pipeline para R2 Iceberg
  if (env.EVENTS_PIPELINE) {
    try {
      await env.EVENTS_PIPELINE.send([enriched]);
    } catch {}
  }

  // Analytics Engine
  writeEvent(env, {
    event: event.type,
    orgId: organizationId,
    route: "/internal/events",
    method: "EVENT",
    status: 200,
    value: (event.metadata as any)?.value,
  });
}

export const eventsRoutes = app;
