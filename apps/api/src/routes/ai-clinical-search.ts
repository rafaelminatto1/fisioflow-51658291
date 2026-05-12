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

/**
 * GET /api/ai-clinical-search/patients/:id/similar
 * Encontra pacientes com quadros clínicos semelhantes usando pgvector.
 */
app.get("/patients/:id/similar", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("id");
  const limit = Math.min(Number(c.req.query("limit") || 3), 10);

  try {
    const sql = getRawSql(c.env, "read");

    // Primeiro pegamos o embedding mais recente do paciente atual
    const sourceEmbedding = await sql`
      SELECT embedding 
      FROM clinical_embeddings 
      WHERE patient_id = ${patientId}::uuid 
        AND organization_id = ${user.organizationId}::uuid
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (!sourceEmbedding.length || !sourceEmbedding[0].embedding) {
      return c.json({ data: [] }); // Sem dados suficientes para comparar
    }

    const vector = sourceEmbedding[0].embedding;

    // Buscamos os pacientes mais próximos (excluindo o próprio paciente)
    const results = await sql`
      WITH RankedEvolutions AS (
        SELECT 
          ce.patient_id,
          ce.evolution_id,
          ce.content_summary,
          s.date as session_date,
          1 - (ce.embedding <=> ${vector}::vector) as similarity,
          ROW_NUMBER() OVER(PARTITION BY ce.patient_id ORDER BY ce.embedding <=> ${vector}::vector ASC) as rn
        FROM clinical_embeddings ce
        JOIN sessions s ON s.id = ce.evolution_id
        WHERE ce.organization_id = ${user.organizationId}::uuid
          AND ce.patient_id != ${patientId}::uuid
      )
      SELECT 
        r.patient_id as "patientId",
        p.full_name as "patientName",
        r.evolution_id as "evolutionId",
        r.content_summary as "summary",
        r.session_date as "sessionDate",
        r.similarity
      FROM RankedEvolutions r
      JOIN patients p ON p.id = r.patient_id
      WHERE r.rn = 1 AND r.similarity > 0.5
      ORDER BY r.similarity DESC
      LIMIT ${limit}
    `;

    return c.json({ data: results });
  } catch (error: any) {
    console.error("[AI/Similar] Error:", error);
    return c.json({ error: "Erro ao buscar pacientes similares" }, 500);
  }
});

export { app as aiClinicalSearchRoutes };
