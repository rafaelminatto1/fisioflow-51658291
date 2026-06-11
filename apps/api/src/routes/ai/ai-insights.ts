import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { getRawSql } from "../../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const InsightsQuerySchema = z.object({
  q: z.string().min(3),
  minPain: z.coerce.number().optional(),
  maxPain: z.coerce.number().optional(),
  limit: z.coerce.number().default(10),
});

/**
 * GET /api/ai/insights
 * Busca híbrida (Semântica + Filtros SQL) em evoluções clínicas.
 */
app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const queryParams = c.req.query();
  
  const validation = InsightsQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return c.json({ 
      error: "Parâmetros inválidos", 
      details: validation.error.format() 
    }, 400);
  }

  const { q, minPain, maxPain, limit } = validation.data;

  try {
    // 1. Gerar embedding para a query semântica
    const aiResponse = await c.env.AI.run("@cf/baai/bge-m3", {
      text: [q],
    });

    const queryEmbedding = aiResponse.data[0];
    if (!queryEmbedding) throw new Error("Falha ao gerar embedding de busca");

    // 2. Busca no Neon usando pgvector e filtros SQL
    const sql = getRawSql(c.env, "read");

    // Nota: Como o helper rawSql é limitado, construímos a query com os filtros opcionais
    // Se minPain ou maxPain forem fornecidos, adicionamos à cláusula WHERE.
    // Para simplificar e manter a segurança, usamos condicionais no SQL.

    const results = await sql`
      SELECT
        ce.evolution_id as "evolutionId",
        ce.content_summary as "summary",
        ce.patient_id as "patientId",
        p.full_name as "patientName",
        s.date as "sessionDate",
        s.pain_scale as "painScale",
        1 - (ce.embedding <=> ${queryEmbedding}::vector) as "similarity"
      FROM clinical_embeddings ce
      JOIN patients p ON p.id = ce.patient_id
      JOIN sessions s ON s.id = ce.evolution_id
      WHERE ce.organization_id = ${user.organizationId}::uuid
        AND (${minPain}::int IS NULL OR s.pain_scale >= ${minPain}::int)
        AND (${maxPain}::int IS NULL OR s.pain_scale <= ${maxPain}::int)
      ORDER BY ce.embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit};
    `;

    return c.json({
      success: true,
      query: q,
      count: results.rows.length,
      data: results.rows,
    });
  } catch (error: any) {
    console.error("[AI/Insights] Error:", error);
    return c.json({ 
      error: "Erro ao processar insights clínicos", 
      details: error.message 
    }, 500);
  }
});

export { app as aiInsightsRoutes };
