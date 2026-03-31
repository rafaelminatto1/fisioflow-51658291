import type { Env } from '../types/env';

/**
 * Cloudflare Workers Analytics Engine — helper para instrumentação.
 *
 * Gratuito: 100K eventos/dia, 3 meses de retenção.
 * Consulta via: https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/analytics_engine/sql
 *
 * Exemplo de query SQL:
 *   SELECT blob1 AS route, count() AS requests, quantileWeighted(0.95)(double1, 1) AS p95_ms
 *   FROM fisioflow_events
 *   WHERE timestamp > NOW() - INTERVAL '7' DAY
 *   GROUP BY blob1
 *   ORDER BY requests DESC
 */

type EventData = {
  /** Rota da API (ex: "/api/appointments", "/api/ai/soap") */
  route?: string;
  /** Método HTTP */
  method?: string;
  /** Status HTTP da resposta */
  status?: number;
  /** Organização */
  orgId?: string;
  /** Tipo do evento (ex: "request", "whatsapp_sent", "ai_call", "appointment_booked") */
  event?: string;
  /** Latência em ms */
  latencyMs?: number;
  /** Valor numérico extra (ex: custo estimado em tokens) */
  value?: number;
};

/**
 * Escreve um evento no Analytics Engine.
 * Fire-and-forget — nunca lança exceção.
 *
 * Layout dos blobs/doubles (fixo para queries SQL consistentes):
 *   blob1  → route
 *   blob2  → method
 *   blob3  → orgId
 *   blob4  → event
 *   double1 → latencyMs
 *   double2 → status
 *   double3 → value
 *   index  → orgId (para queries por cliente sem sampling)
 */
export function writeEvent(env: Env, data: EventData): void {
  if (!env.ANALYTICS) return;
  try {
    env.ANALYTICS.writeDataPoint({
      blobs: [
        data.route ?? '',
        data.method ?? '',
        data.orgId ?? '',
        data.event ?? 'request',
      ],
      doubles: [
        data.latencyMs ?? 0,
        data.status ?? 200,
        data.value ?? 0,
      ],
      indexes: [data.orgId ?? 'global'],
    });
  } catch {
    // Nunca falhar requisição por causa de analytics
  }
}

/**
 * Middleware que instrumenta automaticamente todas as rotas Hono.
 * Registra rota, método, status e latência no Analytics Engine.
 */
export function analyticsMiddleware(env: Env) {
  return async (c: { req: { url: string; method: string }; res: { status: number }; get: (key: string) => any }, next: () => Promise<void>) => {
    const start = Date.now();
    try {
      await next();
    } finally {
      const latencyMs = Date.now() - start;
      const url = new URL(c.req.url);
      // Normaliza path removendo IDs (UUIDs e números) para agrupamento correto
      const route = url.pathname.replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id'
      ).replace(/\/\d+/g, '/:n');

      writeEvent(env, {
        route,
        method: c.req.method,
        status: c.res.status,
        orgId: c.get('user')?.organizationId,
        event: 'request',
        latencyMs,
      });
    }
  };
}
