import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth, requireRole } from "../../lib/auth";
import { backfillClinicalEmbeddings } from "../../jobs/backfillClinicalEmbeddings";
import { getRawSql } from "../../lib/db";
import { CLINICAL_EMBEDDING_DIM, CLINICAL_EMBEDDING_MODEL } from "../../lib/workersAi";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);
app.use("*", requireRole("admin"));

/**
 * POST /api/admin/backfill-embeddings
 * Um lote por chamada; repetir com `nextCursor` até vir nulo.
 */
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      batchSize: z.number().int().min(1).max(100).optional(),
      cursor: z.string().uuid().nullable().optional(),
      includeExisting: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { batchSize, cursor, includeExisting } = c.req.valid("json");

    try {
      const result = await backfillClinicalEmbeddings(c.env, {
        organizationId: user.organizationId,
        batchSize,
        cursor: cursor ?? null,
        includeExisting,
      });
      return c.json({ data: result });
    } catch (error: any) {
      console.error("[Admin/BackfillEmbeddings] erro:", error);
      return c.json({ error: "Falha no backfill de embeddings", details: error.message }, 500);
    }
  },
);

/** GET /api/admin/backfill-embeddings/status */
app.get("/status", async (c) => {
  const user = c.get("user");
  try {
    const sql = getRawSql(c.env, "read");
    const result = await sql`
      SELECT
        (SELECT count(*)::int FROM sessions
          WHERE organization_id = ${user.organizationId}::uuid
            AND deleted_at IS NULL
            AND length(coalesce(observacao, '')) >= 10) AS elegiveis,
        (SELECT count(*)::int FROM clinical_embeddings
          WHERE organization_id = ${user.organizationId}::uuid) AS indexadas
    `;
    const r = result.rows?.[0] ?? {};
    const elegiveis = Number(r.elegiveis ?? 0);
    const indexadas = Number(r.indexadas ?? 0);
    return c.json({
      data: {
        elegiveis,
        indexadas,
        pendentes: Math.max(elegiveis - indexadas, 0),
        cobertura: elegiveis > 0 ? Number(((100 * indexadas) / elegiveis).toFixed(1)) : 0,
        model: CLINICAL_EMBEDDING_MODEL,
        dimensions: CLINICAL_EMBEDDING_DIM,
      },
    });
  } catch (error: any) {
    console.error("[Admin/BackfillEmbeddings] status:", error);
    return c.json({ error: "Falha ao consultar status", details: error.message }, 500);
  }
});

export default app;
