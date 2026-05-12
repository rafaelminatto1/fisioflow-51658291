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

export { app as enterpriseRoutes };
