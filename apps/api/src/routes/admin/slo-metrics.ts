import { Hono } from "hono";
import type { Env } from "../../types/env";
import { requireAuth, requireRole, type AuthVariables } from "../../lib/auth";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);
app.use("*", requireRole("admin"));

const CF_ACCOUNT_ID = "32156f9a72a32d1ece28ab74bcd398fb";
const SQL_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql`;

type SqlResult = { data: Array<Record<string, unknown>>; meta?: unknown };

async function runAnalyticsSQL(env: Env, query: string): Promise<SqlResult> {
  if (!env.CF_API_TOKEN) {
    throw new Error("CF_API_TOKEN nao configurado (wrangler secret put CF_API_TOKEN)");
  }
  const r = await fetch(SQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      "Content-Type": "text/plain",
    },
    body: query,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Analytics Engine SQL ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json() as Promise<SqlResult>;
}

/**
 * GET /api/admin/slo-metrics?window=1h|24h|7d
 * Dashboard SLO em tempo real (uptime, P95, error rate, RPS) via Analytics Engine.
 * Schema fisioflow_events (de lib/analytics.ts):
 *   blob1 = route, blob2 = method, blob3 = orgId
 *   double1 = duration_ms, double2 = status_code
 */
app.get("/", async (c) => {
  const _user = c.get("user");

  // Allowlist para prevenir SQL injection via INTERVAL
  const windowIntervals: Record<string, string> = {
    "1h": "1 HOUR",
    "7d": "7 DAY",
  };
  const rawWindow = c.req.query("window") ?? "24h";
  const interval = windowIntervals[rawWindow] ?? "24 HOUR";
  const since = `NOW() - INTERVAL '${interval}'`;

  try {
    const [summary, byRoute, errorBreakdown] = await Promise.all([
      runAnalyticsSQL(
        c.env,
        `SELECT
           count() AS requests,
           quantileWeighted(0.50)(double1, 1) AS p50_ms,
           quantileWeighted(0.95)(double1, 1) AS p95_ms,
           quantileWeighted(0.99)(double1, 1) AS p99_ms,
           sumIf(1, double2 >= 500) AS errors_5xx,
           sumIf(1, double2 >= 400 AND double2 < 500) AS errors_4xx
         FROM fisioflow_events
         WHERE timestamp > ${since}`,
      ),
      runAnalyticsSQL(
        c.env,
        `SELECT
           blob1 AS route,
           count() AS requests,
           quantileWeighted(0.95)(double1, 1) AS p95_ms,
           sumIf(1, double2 >= 500) AS errors_5xx
         FROM fisioflow_events
         WHERE timestamp > ${since}
         GROUP BY blob1
         ORDER BY requests DESC
         LIMIT 20`,
      ),
      runAnalyticsSQL(
        c.env,
        `SELECT
           blob1 AS route,
           double2 AS status,
           count() AS occurrences
         FROM fisioflow_events
         WHERE timestamp > ${since} AND double2 >= 400
         GROUP BY blob1, double2
         ORDER BY occurrences DESC
         LIMIT 10`,
      ),
    ]);

    const s = (summary.data[0] ?? {}) as Record<string, number>;
    const totalReq = Number(s.requests ?? 0);
    const errors5xx = Number(s.errors_5xx ?? 0);
    const uptimePct = totalReq > 0 ? ((1 - errors5xx / totalReq) * 100).toFixed(3) : "100.000";
    const errorRatePct = totalReq > 0 ? ((errors5xx / totalReq) * 100).toFixed(3) : "0.000";

    return c.json({
      data: {
        window,
        summary: {
          requests: totalReq,
          uptimePct: Number(uptimePct),
          errorRatePct: Number(errorRatePct),
          errors5xx,
          errors4xx: Number(s.errors_4xx ?? 0),
          p50_ms: Math.round(Number(s.p50_ms ?? 0)),
          p95_ms: Math.round(Number(s.p95_ms ?? 0)),
          p99_ms: Math.round(Number(s.p99_ms ?? 0)),
        },
        byRoute: byRoute.data,
        errorBreakdown: errorBreakdown.data,
      },
    });
  } catch (err) {
    return c.json(
      { error: "slo_query_failed", message: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

export { app as sloMetricsRoutes };
