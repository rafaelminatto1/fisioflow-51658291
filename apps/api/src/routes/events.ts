import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { writeEvent } from '../lib/analytics';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

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
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json() as { events: BusinessEvent[] } | BusinessEvent;

  const events: BusinessEvent[] = Array.isArray((body as any).events)
    ? (body as { events: BusinessEvent[] }).events
    : [body as BusinessEvent];

  if (!events.length) {
    return c.json({ error: 'Nenhum evento fornecido' }, 400);
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
      console.error('[Events] Pipeline send failed:', err);
      // Fallback para Analytics Engine
    }
  }

  // Analytics Engine: sempre registra para observabilidade em tempo real
  for (const e of enriched) {
    writeEvent(c.env, {
      event: e.type,
      orgId: user.organizationId,
      route: '/api/events',
      method: 'POST',
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
    route: '/internal/events',
    method: 'EVENT',
    status: 200,
    value: (event.metadata as any)?.value,
  });
}

export const eventsRoutes = app;
