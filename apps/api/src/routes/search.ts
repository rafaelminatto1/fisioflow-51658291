import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { generateEmbedding, generateTurboSketch, parseTurboSketch } from "../lib/ai-native";
import { createPool } from "../lib/db";
import { TurboQuant } from "@fisioflow/core";
import { searchAiSearch } from "../lib/cloudflareAiSearch";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type SearchType = "exercises" | "protocols" | "wiki" | "all";

/**
 * GET /api/search?q=lombalgia&type=exercises&limit=10
 *
 * Busca semântica clínica via Cloudflare AI Search (AI_SEARCH).
 * Fallback para busca híbrida/textual no Neon.
 */
app.get("/", requireAuth, async (c) => {
  const { q, type = "all", limit = "10" } = c.req.query();

  if (!q || q.trim().length < 2) {
    return c.json({ error: "Parâmetro q obrigatório (mínimo 2 caracteres)" }, 400);
  }

  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const user = c.get("user");

  // Tenta AI Search primeiro (gerenciado RAG)
  if (c.env.AI_SEARCH) {
    try {
      const { sources } = await searchAiSearch(c.env, {
        messages: [
          { role: "system", content: "You are a physiotherapy knowledge assistant." },
          { role: "user", content: q },
        ],
        maxNumResults: limitNum,
        ...(type !== "all" ? { filters: { source: type } } : {}),
      });

      return c.json({
        results: sources.map((r) => ({
          id: r.id,
          score: r.score ?? 1,
          content: r.content,
          type: (r.metadata?.source as string) ?? "unknown",
          metadata: r.metadata,
        })),
        query: q,
        source: "ai_search",
      });
    } catch (err) {
      console.warn("[Search] AI Search failed, falling back to hybrid database search:", err);
    }
  }

  // Fallback: busca híbrida no Neon usando TurboQuant (se queryVector & sketch disponíveis) ou fallback textual flat
  let queryVector: number[] | undefined;
  let querySketch: Uint8Array | undefined;

  try {
    queryVector = await generateEmbedding(c.env, q);
    if (queryVector) {
      querySketch = parseTurboSketch(generateTurboSketch(queryVector));
    }
  } catch (e) {
    console.error("[Search] Failed to generate embedding for fallback search:", e);
  }

  return await fallbackTextSearch(
    c,
    q,
    type as SearchType,
    limitNum,
    user.organizationId,
    querySketch,
  );
});

/**
 * POST /api/search/index
 * No-op mantido para compatibilidade com o frontend (anteriormente indexava no Vectorize).
 */
app.post("/index", requireAuth, async (c) => {
  return c.json({
    success: true,
    indexed: 0,
    message: "AI Search auto-indexes documents via R2 sync. Vectorize indexing is deprecated.",
  });
});

/**
 * DELETE /api/search/index/:id
 * No-op mantido para compatibilidade com o frontend (anteriormente deletava no Vectorize).
 */
app.delete("/index/:id", requireAuth, async (c) => {
  return c.json({
    success: true,
    deleted: true,
    message: "AI Search auto-manages documents. Vectorize is deprecated.",
  });
});

// Busca textual/híbrida no Neon (re-ranking semântico via TurboQuant se sketch disponível)
async function fallbackTextSearch(
  c: any,
  q: string,
  type: SearchType,
  limit: number,
  orgId: string,
  querySketch?: Uint8Array,
) {
  const pool = createPool(c.env);
  const results: any[] = [];

  const isSemantic = !!querySketch;
  const searchTerm = isSemantic ? "%" : `%${q}%`;
  const fetchLimit = isSemantic ? 500 : limit;

  try {
    if (type === "exercises" || type === "all") {
      const res = await pool.query(
        `SELECT id, name, description, embedding_sketch, 'exercises' AS content_type
         FROM exercises
         WHERE (is_public = true OR organization_id = $1)
           ${!isSemantic ? "AND (unaccent(name) ILIKE unaccent($2) OR unaccent(description) ILIKE unaccent($2))" : ""}
         LIMIT $3`,
        !isSemantic ? [orgId, searchTerm, fetchLimit] : [orgId, fetchLimit, fetchLimit],
      );
      results.push(
        ...res.rows.map((r) => ({
          ...r,
          source: isSemantic ? "turboquant_hybrid" : "text_search",
        })),
      );
    }

    if (type === "wiki" || type === "all") {
      const res = await pool.query(
        `SELECT id, title AS name, LEFT(content, 300) AS description, embedding_sketch, 'wiki' AS content_type
         FROM wiki_pages
         WHERE (organization_id = $1 OR is_public = true)
           ${!isSemantic ? "AND (unaccent(title) ILIKE unaccent($2) OR unaccent(content) ILIKE unaccent($2))" : ""}
         LIMIT $3`,
        !isSemantic ? [orgId, searchTerm, fetchLimit] : [orgId, fetchLimit, fetchLimit],
      );
      results.push(
        ...res.rows.map((r) => ({
          ...r,
          source: isSemantic ? "turboquant_hybrid" : "text_search",
        })),
      );
    }

    if (isSemantic) {
      for (const row of results) {
        if (row.embedding_sketch) {
          const rowSketch = parseTurboSketch(row.embedding_sketch);
          row.score = TurboQuant.similarity(querySketch, rowSketch);
        } else {
          row.score = -1;
        }
        delete row.embedding_sketch;
      }

      results.sort((a, b) => b.score - a.score);
      return c.json({ results: results.slice(0, limit), query: q, source: "turboquant_hybrid" });
    }

    return c.json({
      results: results.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.content_type,
        score: 0.5,
        source: "text_fallback",
      })),
      query: q,
      source: "text_fallback",
    });
  } catch (err: any) {
    console.error("Hybrid Fallback Query failed", err);
    return c.json({ error: "Hybrid / Text search failed" }, 500);
  }
}

export const searchRoutes = app;
