import { Hono } from "hono";
// import { db } from "@fisioflow/db";
// import { ai_usage_events, background_jobs_log } from "@fisioflow/db/schema";
// import { eq, and, gte, sum, count, desc } from "drizzle-orm";

const app = new Hono<{ Bindings: any }>();

/**
 * Retorna os custos consolidados de IA e estatísticas do AI Gateway
 * GET /api/admin/observability/ai-cost
 */
app.get("/ai-cost", async (c) => {
  const organizationId = c.req.header("x-organization-id") || "";
  
  // Exemplo de como a Query ficaria usando Drizzle no Neon Postgres:
  /*
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Custo Total Hoje e Mês
  const costToday = await db.select({ total: sum(ai_usage_events.estimatedCostUsd) })
    .from(ai_usage_events)
    .where(and(
      eq(ai_usage_events.organizationId, organizationId),
      gte(ai_usage_events.createdAt, startOfDay)
    ));

  const costMonth = await db.select({ total: sum(ai_usage_events.estimatedCostUsd) })
    .from(ai_usage_events)
    .where(and(
      eq(ai_usage_events.organizationId, organizationId),
      gte(ai_usage_events.createdAt, startOfMonth)
    ));
    
  // 2. Chamadas bloqueadas por orçamento (Fallback / Hard block)
  const blockedCalls = await db.select({ count: count() })
    .from(ai_usage_events)
    .where(and(
      eq(ai_usage_events.organizationId, organizationId),
      eq(ai_usage_events.status, "blocked_by_budget")
    ));
    
  // 3. Economia com Cache (AI Gateway Cache Hits)
  const cacheHits = await db.select({ count: count() })
    .from(ai_usage_events)
    .where(and(
      eq(ai_usage_events.organizationId, organizationId),
      eq(ai_usage_events.cacheHit, true)
    ));
  */

  // Mock payload for testing
  return c.json({
    period: "current_month",
    metrics: {
      costTodayUsd: 0.15,
      costTodayBrl: 0.75,
      costMonthUsd: 4.50,
      costMonthBrl: 22.50,
      budgetLimitBrl: 500.00,
      budgetUtilizationPercent: 4.5, // 22.50 / 500
      totalRequests: 1250,
      cacheHits: 450,
      blockedByBudget: 0,
      fallbackUsed: 12,
      avgLatencyMs: 450
    },
    costByModel: [
      { model: "@cf/meta/llama-3.1-8b-instruct-fast", costBrl: 5.50 },
      { model: "gemini-1.5-flash", costBrl: 17.00 }
    ],
    costByTaskType: [
      { taskType: "clinical_rag_query", costBrl: 15.00 },
      { taskType: "no_show_risk_explanation", costBrl: 7.50 }
    ],
    alerts: [
      { type: "info", message: "Orçamento de IA saudável (4.5% utilizado)." }
    ]
  });
});

/**
 * Retorna o status das Queues e Workflows
 * GET /api/admin/observability/jobs
 */
app.get("/jobs", async (c) => {
  const organizationId = c.req.header("x-organization-id") || "";
  
  // Real life Drizzle query:
  /*
  const jobsStats = await db.select({ 
      status: background_jobs_log.status, 
      count: count() 
    })
    .from(background_jobs_log)
    .where(eq(background_jobs_log.organizationId, organizationId))
    .groupBy(background_jobs_log.status);
  */

  return c.json({
    metrics: {
      totalProcessedToday: 4200,
      successRate: 99.8,
      failedJobs: 8
    },
    topFailingTasks: [
      { taskType: "nfse_emission", failures: 5 },
      { taskType: "generate_embedding", failures: 3 }
    ]
  });
});

/**
 * Retorna os últimos erros graves
 * GET /api/admin/observability/errors
 */
app.get("/errors", async (c) => {
  return c.json({
    recentErrors: [
      {
        jobId: "uuid-1234",
        taskType: "nfse_emission",
        error: "Timeout na Prefeitura de SP",
        timestamp: new Date().toISOString()
      }
    ]
  });
});

export default app;
