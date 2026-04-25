import { Hono } from "hono";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";
import { requireAuth } from "../lib/auth";
import { getRawSql } from "../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * GET /api/ai-clinical-search
 * Busca semântica em evoluções clínicas usando Workers AI + pgvector.
 */
app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const query = c.req.query("q");
  const limit = Math.min(Number(c.req.query("limit") || 5), 20);

  if (!query || query.length < 3) {
    return c.json({ error: "Query de busca muito curta" }, 400);
  }

  try {
    console.log(`[AI/Search] Performing semantic search for: "${query}"`);

    // 1. Gerar embedding para a query do usuário na borda
    const aiResponse = await c.env.AI.run("@cf/baai/bge-m3", {
      text: [query],
    });

    const queryEmbedding = aiResponse.data[0];
    if (!queryEmbedding) throw new Error("Failed to generate search embedding");

    // 2. Busca vetorial no Neon usando distância de cosseno (<=>)
    // Filtramos por organization_id primeiro por performance e segurança (RLS)
    const sql = getRawSql(c.env, "read");

    const results = await sql`
			SELECT
				ce.evolution_id as "evolutionId",
				ce.content_summary as "summary",
				ce.patient_id as "patientId",
				p.full_name as "patientName",
				s.date as "sessionDate",
				1 - (ce.embedding <=> ${queryEmbedding}::vector) as "similarity"
			FROM clinical_embeddings ce
			JOIN patients p ON p.id = ce.patient_id
			JOIN sessions s ON s.id = ce.evolution_id
			WHERE ce.organization_id = ${user.organizationId}::uuid
			ORDER BY ce.embedding <=> ${queryEmbedding}::vector
			LIMIT ${limit};
		`;

    return c.json({
      query,
      count: results.rows.length,
      data: results.rows,
    });
  } catch (error: any) {
    console.error("[AI/Search] Error:", error);
    return c.json(
      {
        error: "Erro ao realizar busca semântica",
        details: error.message,
      },
      500,
    );
  }
});

export { app as aiClinicalSearchRoutes };
