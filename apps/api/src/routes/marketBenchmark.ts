import { Hono } from "hono";
import { createReplicaPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Benchmarks do mercado de fisioterapia SP (pesquisa 2025)
const SP_BENCHMARKS = {
  ocupacao_media: 65,
  ocupacao_top20: 85,
  ticket_medio: 72,
  ticket_top20: 120,
  noshow_rate_media: 15,
  noshow_rate_top20: 5,
  ltv_cac_ratio_media: 4.0,
  ltv_cac_ratio_top20: 10.0,
  retencao_30dias_media: 45,
  retencao_30dias_top20: 75,
  nps_medio: 58,
  nps_top20: 82,
};

type Position = "top_performer" | "above_average" | "below_average" | "critical";

function calcPosition(
  value: number,
  media: number,
  top20: number,
  higherIsBetter = true
): Position {
  if (higherIsBetter) {
    if (value >= top20) return "top_performer";
    if (value >= media) return "above_average";
    if (value >= media * 0.7) return "below_average";
    return "critical";
  } else {
    // Lower is better (e.g. no-show rate)
    if (value <= top20) return "top_performer";
    if (value <= media) return "above_average";
    if (value <= media * 1.3) return "below_average";
    return "critical";
  }
}

function buildMetric(
  value: number,
  media: number,
  top20: number,
  higherIsBetter = true
) {
  const posicao = calcPosition(value, media, top20, higherIsBetter);
  const delta = higherIsBetter ? value - media : media - value;
  return {
    sua_clinica: Math.round(value * 10) / 10,
    media_sp: media,
    top20,
    posicao,
    delta: Math.round(delta * 10) / 10,
  };
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// GET /api/benchmark/market-position
app.get("/market-position", requireAuth, async (c) => {
  const organizationId = c.get("user").organizationId;
  const pool = createReplicaPool(c.env);

  try {
    const [
      ocupacaoResult,
      ticketResult,
      noshowResult,
      npsResult,
      retencaoResult,
    ] = await Promise.all([
      // Taxa de ocupação: appointments completados / total agendados (últimos 30 dias)
      pool.query<{ completed: string; total: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'completed') AS completed,
           COUNT(*) AS total
         FROM appointments
         WHERE organization_id = $1
           AND start_time >= NOW() - INTERVAL '30 days'`,
        [organizationId]
      ),

      // Ticket médio (AVG financial_transactions últimos 30 dias)
      pool.query<{ avg_ticket: string }>(
        `SELECT COALESCE(AVG(amount), 0) AS avg_ticket
         FROM financial_transactions
         WHERE organization_id = $1
           AND created_at >= NOW() - INTERVAL '30 days'
           AND type = 'income'`,
        [organizationId]
      ),

      // Taxa de no-show (últimos 30 dias)
      pool.query<{ noshow_count: string; total: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'no_show') AS noshow_count,
           COUNT(*) AS total
         FROM appointments
         WHERE organization_id = $1
           AND start_time >= NOW() - INTERVAL '30 days'`,
        [organizationId]
      ),

      // NPS médio (últimos 90 dias)
      pool.query<{ avg_nps: string }>(
        `SELECT COALESCE(AVG(nps_score), 0) AS avg_nps
         FROM satisfaction_surveys
         WHERE organization_id = $1
           AND created_at >= NOW() - INTERVAL '90 days'
           AND nps_score IS NOT NULL`,
        [organizationId]
      ),

      // Taxa de retenção 30 dias: pacientes com appointments em ambos os períodos
      pool.query<{ retained: string; period1_total: string }>(
        `WITH period1 AS (
           SELECT DISTINCT patient_id
           FROM appointments
           WHERE organization_id = $1
             AND start_time >= NOW() - INTERVAL '60 days'
             AND start_time < NOW() - INTERVAL '30 days'
             AND status = 'completed'
         ),
         period2 AS (
           SELECT DISTINCT patient_id
           FROM appointments
           WHERE organization_id = $1
             AND start_time >= NOW() - INTERVAL '30 days'
             AND status = 'completed'
         )
         SELECT
           COUNT(p2.patient_id) AS retained,
           COUNT(p1.patient_id) AS period1_total
         FROM period1 p1
         LEFT JOIN period2 p2 ON p2.patient_id = p1.patient_id`,
        [organizationId]
      ),
    ]);

    // Calcular métricas da clínica
    const ocupacaoRow = ocupacaoResult.rows[0];
    const totalSlots = toNumber(ocupacaoRow?.total);
    const ocupacaoValue =
      totalSlots > 0
        ? (toNumber(ocupacaoRow?.completed) / totalSlots) * 100
        : 0;

    const ticketValue = toNumber(ticketResult.rows[0]?.avg_ticket);

    const noshowRow = noshowResult.rows[0];
    const totalApps = toNumber(noshowRow?.total);
    const noshowValue =
      totalApps > 0
        ? (toNumber(noshowRow?.noshow_count) / totalApps) * 100
        : 0;

    const npsValue = toNumber(npsResult.rows[0]?.avg_nps);

    const retencaoRow = retencaoResult.rows[0];
    const period1Total = toNumber(retencaoRow?.period1_total);
    const retencaoValue =
      period1Total > 0
        ? (toNumber(retencaoRow?.retained) / period1Total) * 100
        : 0;

    // Montar resposta com comparações de mercado
    const response = {
      generated_at: new Date().toISOString(),
      period: "ultimos_30_dias",
      benchmarks_source: "Pesquisa Mercado Fisioterapia SP 2025",
      metrics: {
        ocupacao: buildMetric(
          ocupacaoValue,
          SP_BENCHMARKS.ocupacao_media,
          SP_BENCHMARKS.ocupacao_top20
        ),
        ticket_medio: buildMetric(
          ticketValue,
          SP_BENCHMARKS.ticket_medio,
          SP_BENCHMARKS.ticket_top20
        ),
        noshow_rate: buildMetric(
          noshowValue,
          SP_BENCHMARKS.noshow_rate_media,
          SP_BENCHMARKS.noshow_rate_top20,
          false // lower is better
        ),
        nps: buildMetric(
          npsValue,
          SP_BENCHMARKS.nps_medio,
          SP_BENCHMARKS.nps_top20
        ),
        retencao_30dias: buildMetric(
          retencaoValue,
          SP_BENCHMARKS.retencao_30dias_media,
          SP_BENCHMARKS.retencao_30dias_top20
        ),
      },
      benchmarks_reference: {
        source: "Pesquisa Mercado Fisioterapia SP 2025",
        region: "São Paulo - SP",
        year: 2025,
        sample_note:
          "Baseado em pesquisa de mercado com clínicas de fisioterapia na Grande SP",
        values: SP_BENCHMARKS,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("[marketBenchmark] Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { app as marketBenchmarkRoutes };
