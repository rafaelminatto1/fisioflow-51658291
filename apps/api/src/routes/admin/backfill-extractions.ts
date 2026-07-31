import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth, requireRole } from "../../lib/auth";
import { backfillClinicalExtractions } from "../../jobs/backfillClinicalExtractions";
import { LEXICON_VERSION } from "../../lib/clinical/lexicon";
import { getRawSql } from "../../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);
app.use("*", requireRole("admin"));

const bodySchema = z.object({
  batchSize: z.number().int().min(1).max(500).optional(),
  /** Cursor devolvido pela chamada anterior. Ausente = começa do início. */
  cursor: z.string().uuid().nullable().optional(),
  /** Só reprocessa o que foi extraído por um léxico anterior. */
  staleOnly: z.boolean().optional(),
});

/**
 * POST /api/admin/backfill-extractions
 *
 * Processa um lote de evoluções e devolve `nextCursor`. O cliente repete até
 * `nextCursor` vir nulo.
 *
 * Why em lotes e não numa chamada: são 11.346 evoluções na organização atual.
 * Um Worker tem limite de CPU por requisição, e uma varredura completa o
 * estouraria. O cursor também torna a operação retomável — se um lote falhar,
 * repete-se só aquele.
 */
app.post("/", zValidator("json", bodySchema), async (c) => {
  const user = c.get("user");
  const { batchSize, cursor, staleOnly } = c.req.valid("json");

  try {
    const result = await backfillClinicalExtractions(c.env, {
      organizationId: user.organizationId,
      batchSize,
      cursor: cursor ?? null,
      staleOnly,
    });
    return c.json({ data: result });
  } catch (error: any) {
    console.error("[Admin/BackfillExtractions] erro:", error);
    return c.json({ error: "Falha no backfill", details: error.message }, 500);
  }
});

/**
 * GET /api/admin/backfill-extractions/status
 * Progresso do backfill e detecção de extrações defasadas.
 */
app.get("/status", async (c) => {
  const user = c.get("user");
  const sql = getRawSql(c.env, "read");

  try {
    const result = await sql`
      WITH evolucoes AS (
        SELECT count(*)::int AS total
        FROM sessions
        WHERE organization_id = ${user.organizationId}::uuid
          AND deleted_at IS NULL
          AND observacao IS NOT NULL AND length(observacao) > 0
      ),
      extraidas AS (
        SELECT
          count(DISTINCT source_id)::int AS origens,
          count(*)::int AS linhas,
          count(DISTINCT source_id) FILTER (WHERE lexicon_version <> ${LEXICON_VERSION})::int AS defasadas
        FROM clinical_extractions
        WHERE organization_id = ${user.organizationId}::uuid
          AND source_table = 'sessions'
          AND method = 'parser'
      )
      SELECT e.total, x.origens, x.linhas, x.defasadas FROM evolucoes e, extraidas x
    `;

    const row = result.rows?.[0] ?? {};
    const total = Number(row.total ?? 0);
    const origens = Number(row.origens ?? 0);

    return c.json({
      data: {
        lexiconVersion: LEXICON_VERSION,
        evolucoesTotal: total,
        evolucoesExtraidas: origens,
        linhasExtraidas: Number(row.linhas ?? 0),
        extracoesDefasadas: Number(row.defasadas ?? 0),
        cobertura: total > 0 ? Number(((100 * origens) / total).toFixed(1)) : 0,
      },
    });
  } catch (error: any) {
    console.error("[Admin/BackfillExtractions] status:", error);
    return c.json({ error: "Falha ao consultar status", details: error.message }, 500);
  }
});

export default app;
