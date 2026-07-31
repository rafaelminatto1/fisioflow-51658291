import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth, requireRole } from "../../lib/auth";
import { backfillEvaluationExtractions } from "../../jobs/backfillEvaluationExtractions";
import { LEXICON_VERSION } from "../../lib/clinical/lexicon";
import { getRawSql } from "../../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);
app.use("*", requireRole("admin"));

/**
 * POST /api/admin/backfill-evaluations
 * Um lote por chamada; repetir com `nextCursor` até vir nulo.
 */
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      batchSize: z.number().int().min(1).max(200).optional(),
      cursor: z.string().uuid().nullable().optional(),
      formId: z.string().uuid().nullable().optional(),
      staleOnly: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    try {
      const result = await backfillEvaluationExtractions(c.env, {
        organizationId: user.organizationId,
        batchSize: body.batchSize,
        cursor: body.cursor ?? null,
        formId: body.formId ?? null,
        staleOnly: body.staleOnly,
      });
      return c.json({ data: result });
    } catch (error: any) {
      console.error("[Admin/BackfillEvaluations] erro:", error);
      return c.json({ error: "Falha no backfill de avaliações", details: error.message }, 500);
    }
  },
);

/** GET /api/admin/backfill-evaluations/status */
app.get("/status", async (c) => {
  const user = c.get("user");
  try {
    const sql = getRawSql(c.env, "read");
    const result = await sql`
      SELECT
        (SELECT count(*)::int FROM patient_evaluation_responses
          WHERE organization_id = ${user.organizationId}::uuid) AS total,
        (SELECT count(DISTINCT source_id)::int FROM clinical_extractions
          WHERE organization_id = ${user.organizationId}::uuid
            AND source_table = 'patient_evaluation_responses'
            AND method = 'parser') AS extraidas,
        (SELECT count(*)::int FROM clinical_extractions
          WHERE organization_id = ${user.organizationId}::uuid
            AND source_table = 'patient_evaluation_responses') AS linhas,
        (SELECT count(DISTINCT source_id)::int FROM clinical_extractions
          WHERE organization_id = ${user.organizationId}::uuid
            AND source_table = 'patient_evaluation_responses'
            AND method = 'parser'
            AND lexicon_version <> ${LEXICON_VERSION}) AS defasadas
    `;
    const r = result.rows?.[0] ?? {};
    const total = Number(r.total ?? 0);
    const extraidas = Number(r.extraidas ?? 0);
    return c.json({
      data: {
        lexiconVersion: LEXICON_VERSION,
        total,
        extraidas,
        linhas: Number(r.linhas ?? 0),
        defasadas: Number(r.defasadas ?? 0),
        cobertura: total > 0 ? Number(((100 * extraidas) / total).toFixed(1)) : 0,
      },
    });
  } catch (error: any) {
    console.error("[Admin/BackfillEvaluations] status:", error);
    return c.json({ error: "Falha ao consultar status", details: error.message }, 500);
  }
});

export default app;
