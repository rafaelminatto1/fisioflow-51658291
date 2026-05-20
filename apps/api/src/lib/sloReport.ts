import type { Env } from "../types/env";
import { getRawSql } from "./db";
import { sendPushToOrg } from "./webpush";

const CF_ACCOUNT_ID = "32156f9a72a32d1ece28ab74bcd398fb";
const SQL_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql`;

interface SloReportResult {
  requests: number;
  uptimePct: number;
  errorRatePct: number;
  p95_ms: number;
  errors5xx: number;
  adminsNotified: number;
  error?: string;
}

/**
 * S8 SLO biweekly — coleta metricas dos ultimos 14 dias da Analytics Engine
 * e dispara push notification para admins de cada organizacao ativa.
 */
export async function runSloBiweeklyReport(env: Env): Promise<SloReportResult> {
  const result: SloReportResult = {
    requests: 0,
    uptimePct: 100,
    errorRatePct: 0,
    p95_ms: 0,
    errors5xx: 0,
    adminsNotified: 0,
  };

  if (!env.CF_API_TOKEN) {
    result.error = "CF_API_TOKEN nao configurado";
    return result;
  }

  try {
    const sqlQuery = `SELECT
        count() AS requests,
        quantileWeighted(0.95)(double1, 1) AS p95_ms,
        sumIf(1, double2 >= 500) AS errors_5xx
      FROM fisioflow_events
      WHERE timestamp > NOW() - INTERVAL '14' DAY`;

    const r = await fetch(SQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "text/plain",
      },
      body: sqlQuery,
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      result.error = `Analytics Engine ${r.status}: ${text.slice(0, 100)}`;
      return result;
    }

    const json = (await r.json()) as { data: Array<Record<string, number>> };
    const row = json.data[0] ?? {};
    const requests = Number(row.requests ?? 0);
    const errors5xx = Number(row.errors_5xx ?? 0);
    const p95_ms = Math.round(Number(row.p95_ms ?? 0));
    const uptimePct = requests > 0 ? (1 - errors5xx / requests) * 100 : 100;
    const errorRatePct = requests > 0 ? (errors5xx / requests) * 100 : 0;

    result.requests = requests;
    result.uptimePct = Number(uptimePct.toFixed(3));
    result.errorRatePct = Number(errorRatePct.toFixed(3));
    result.p95_ms = p95_ms;
    result.errors5xx = errors5xx;

    const sql = getRawSql(env, "read");
    const orgs = await sql<{ id: string }>`
      SELECT id FROM public.organizations WHERE is_active = true
    `;

    const healthIcon = uptimePct >= 99.9 && p95_ms < 1000 ? "✅" : "⚠️";
    const body = `${healthIcon} 14d: ${requests.toLocaleString()} reqs · uptime ${result.uptimePct}% · P95 ${p95_ms}ms · ${errors5xx} erros 5xx`;

    for (const org of orgs.rows) {
      try {
        await sendPushToOrg(
          org.id,
          {
            title: "Relatório SLO quinzenal — FisioFlow",
            body,
            tag: "slo-biweekly",
            url: "/admin/system-health",
          },
          env,
        );
        result.adminsNotified++;
      } catch (e) {
        console.warn(`[sloReport] push to org ${org.id} failed:`, e);
      }
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }

  return result;
}
