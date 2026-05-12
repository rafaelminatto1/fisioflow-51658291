import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/enterprise/regional-summary
 * Visão consolidada para gestores de múltiplas clínicas.
 */
app.get("/regional-summary", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    // 1. Identificar se a organização atual é uma Enterprise (tem filiais)
    const orgRes = await pool.query(
      "SELECT id, name FROM organizations WHERE parent_id = $1 OR id = $1",
      [user.organizationId]
    );

    const clinicIds = orgRes.rows.map(o => o.id);
    if (clinicIds.length <= 1) {
      return c.json({ message: "Esta conta não possui filiais configuradas.", data: [] });
    }

    // 2. Agregar faturamento e ocupação de todas as filiais
    const summary = await pool.query(
      `SELECT 
        o.name as clinic_name,
        o.id as clinic_id,
        (SELECT SUM(valor) FROM pagamentos WHERE organization_id = o.id AND created_at >= date_trunc('month', NOW())) as revenue,
        (SELECT COUNT(*) FROM appointments WHERE organization_id = o.id AND date = CURRENT_DATE) as appointments_today
       FROM organizations o
       WHERE o.id = ANY($1::uuid[])`,
      [clinicIds]
    );

    return c.json({ data: summary.rows });
  } catch (error) {
    console.error("[Enterprise/BI] Error:", error);
    return c.json({ error: "Failed to generate regional summary" }, 500);
  }
});

/**
 * GET /api/enterprise/regional-audit
 * Realiza uma auditoria inteligente cruzando dados de todas as filiais.
 */
app.get("/regional-audit", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    const regionalData = await pool.query(
      `SELECT 
        o.name as clinic_name,
        (SELECT SUM(valor) FROM pagamentos WHERE organization_id = o.id AND created_at >= date_trunc('month', NOW())) as revenue,
        (SELECT COUNT(*) FROM sessions WHERE organization_id = o.id AND session_date >= date_trunc('month', NOW())) as sessions,
        (SELECT ROUND(AVG(nps_score),1) FROM satisfaction_surveys WHERE organization_id = o.id) as avg_nps
       FROM organizations o
       WHERE o.parent_id = $1 OR o.id = $1`,
      [user.organizationId]
    );

    const { runThinkingModel } = await import("../lib/ai-native");

    const prompt = `
      Você é o COO de uma rede de clínicas de fisioterapia em São Paulo.
      Analise o desempenho regional deste mês:
      ${JSON.stringify(regionalData.rows)}

      Forneça um relatório executivo curto (máximo 200 palavras) destacando:
      - A unidade com melhor performance financeira.
      - Riscos de qualidade (NPS baixo).
      - Sugestão de realocação de recursos ou campanhas de marketing.
      Responda em português.
    `;

    const aiAudit = await runThinkingModel(c.env, {
      prompt,
      model: "gemini-1.5-flash",
      temperature: 0.3
    });

    return c.json({
      success: true,
      data: {
        summary: aiAudit.content,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("[Enterprise/Audit] Error:", error);
    return c.json({ error: "Failed to generate regional audit" }, 500);
  }
});

export { app as enterpriseRoutes };
