import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { generateEmbedding, generateTurboSketch, parseTurboSketch } from "../lib/ai-native";
import { createPool } from "../lib/db";
import { TurboQuant } from "@fisioflow/core";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type SearchType = "exercises" | "protocols" | "wiki" | "all";

/**
 * GET /api/search?q=lombalgia&type=exercises&limit=10
 *
 * Busca semântica clínica via Vectorize (CLINICAL_KNOWLEDGE).
 * Usa embeddings BGE-M3 (multilíngue, suporte pt-BR).
 *
 * Fallback para AI Search gerenciado se Vectorize não disponível.
 */
app.get("/", requireAuth, async (c) => {
  const { q, type = "all", limit = "10" } = c.req.query();

  if (!q || q.trim().length < 2) {
    return c.json({ error: "Parâmetro q obrigatório (mínimo 2 caracteres)" }, 400);
  }

  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const user = c.get("user");

  let queryVector: number[] | undefined;

  // Tenta AI Search primeiro (gerenciado, sem setup de embeddings manual)
  if (c.env.AI_SEARCH) {
    try {
      const aiResults = await c.env.AI_SEARCH.search({
        messages: [
          { role: "system", content: "You are a physiotherapy knowledge assistant." },
          { role: "user", content: q },
        ],
        limit: limitNum,
        ...(type !== "all" ? { filters: { source: type } } : {}),
      });

      return c.json({
        results: aiResults.sources.map((r) => ({
          id: r.id,
          score: r.score ?? 1,
          content: r.content,
          type: (r.metadata?.source as string) ?? "unknown",
          metadata: r.metadata,
        })),
        query: q,
        source: "ai_search",
      });
    } catch {
      // Fallback para Vectorize
    }
  }

  // Vectorize: gera embedding da query e busca por similaridade
  try {
    // Generate here so we can reuse the vector or the sketch for the fallback!
    queryVector = await generateEmbedding(c.env, q);

    if (c.env.CLINICAL_KNOWLEDGE) {
      const filter: Record<string, string> = {};
      if (type !== "all") filter.content_type = type;

      const vectorResults = await c.env.CLINICAL_KNOWLEDGE.query(queryVector, {
        topK: limitNum,
        returnMetadata: "all",
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
      });

      return c.json({
        results: vectorResults.matches.map((m: any) => ({
          id: m.id,
          score: m.score,
          type: m.metadata?.content_type ?? "unknown",
          name: m.metadata?.name ?? "",
          description: m.metadata?.description ?? "",
          metadata: m.metadata,
        })),
        query: q,
        source: "vectorize",
      });
    }
  } catch (err: any) {
    console.error("[Search] Vectorize/AI error:", err);
  }

  // Se o Vectorize falhou (ou não existe), mas temos o queryVector, geramos o Sketch
  let querySketch: Uint8Array | undefined;
  if (queryVector) {
    try {
      querySketch = parseTurboSketch(generateTurboSketch(queryVector));
    } catch (e) {
      console.error("[Search] Sketch Error:", e);
    }
  }

  // Fallback final: busca híbrida no Neon usando TurboQuant (se querySketch disponível) ou fallback burro ILIKE
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
 *
 * Indexa conteúdo no Vectorize para busca semântica.
 * Chamado manualmente ou via cron para re-indexação.
 *
 * Body: { type: 'exercises'|'protocols'|'wiki', ids?: string[] }
 */
app.post("/index", requireAuth, async (c) => {
  if (!c.env.CLINICAL_KNOWLEDGE) {
    return c.json({ error: "Vectorize não configurado" }, 503);
  }

  const body = (await c.req.json()) as { type: SearchType; ids?: string[] };
  const user = c.get("user");
  const pool = createPool(c.env);

  let indexed = 0;

  if (body.type === "exercises" || body.type === "all") {
    const res = (await pool.query(
      `SELECT e.id, e.name, COALESCE(e.description, '') AS description, COALESCE(ec.name, '') AS category
       FROM exercises e
       LEFT JOIN exercise_categories ec ON ec.id = e.category_id
       WHERE (e.is_public = true OR e.organization_id = $1)
       ${body.ids?.length ? "AND e.id = ANY($2::uuid[])" : ""}
       LIMIT 500`,
      body.ids?.length ? [user.organizationId, body.ids] : [user.organizationId],
    )) as unknown as {
      rows: { id: string; name: string; description: string; category: string }[];
    };

    const vectors = await Promise.all(
      res.rows.map(async (row) => ({
        id: `exercise:${row.id}`,
        values: await generateEmbedding(c.env, `${row.name} ${row.description} ${row.category}`),
        metadata: {
          content_type: "exercises",
          entity_id: row.id,
          name: row.name,
          description: (row.description ?? "").substring(0, 500),
          category: row.category,
        },
      })),
    );

    if (vectors.length > 0) {
      // Upsert em batches de 100
      for (let i = 0; i < vectors.length; i += 100) {
        await c.env.CLINICAL_KNOWLEDGE!.upsert(vectors.slice(i, i + 100));
      }
      indexed += vectors.length;
    }
  }

  if (body.type === "wiki" || body.type === "all") {
    const res = (await pool.query(
      `SELECT id, title, LEFT(content, 1000) AS content FROM wiki_pages
       WHERE organization_id = $1 OR is_public = true
       ${body.ids?.length ? "AND id = ANY($2::uuid[])" : ""}
       LIMIT 200`,
      body.ids?.length ? [user.organizationId, body.ids] : [user.organizationId],
    )) as unknown as { rows: { id: string; title: string; content: string }[] };

    const vectors = await Promise.all(
      res.rows.map(async (row) => ({
        id: `wiki:${row.id}`,
        values: await generateEmbedding(c.env, `${row.title} ${row.content}`),
        metadata: {
          content_type: "wiki",
          entity_id: row.id,
          name: row.title,
          description: row.content.substring(0, 500),
        },
      })),
    );

    if (vectors.length > 0) {
      for (let i = 0; i < vectors.length; i += 100) {
        await c.env.CLINICAL_KNOWLEDGE!.upsert(vectors.slice(i, i + 100));
      }
      indexed += vectors.length;
    }
  }

  if (body.type === "protocols" || body.type === "all") {
    const res = (await pool.query(
      `SELECT id, name, COALESCE(description, '') AS description FROM exercise_protocols
       WHERE organization_id = $1 OR is_public = true
       LIMIT 300`,
      [user.organizationId],
    )) as unknown as { rows: { id: string; name: string; description: string }[] };

    const vectors = await Promise.all(
      res.rows.map(async (row) => ({
        id: `protocol:${row.id}`,
        values: await generateEmbedding(c.env, `${row.name} ${row.description}`),
        metadata: {
          content_type: "protocols",
          entity_id: row.id,
          name: row.name,
          description: row.description.substring(0, 500),
        },
      })),
    );

    if (vectors.length > 0) {
      for (let i = 0; i < vectors.length; i += 100) {
        await c.env.CLINICAL_KNOWLEDGE!.upsert(vectors.slice(i, i + 100));
      }
      indexed += vectors.length;
    }
  }

  return c.json({ indexed, type: body.type });
});

/**
 * DELETE /api/search/index/:id
 * Remove um vetor do índice (ex: exercício deletado).
 */
app.delete("/index/:id", requireAuth, async (c) => {
  if (!c.env.CLINICAL_KNOWLEDGE) {
    return c.json({ error: "Vectorize não configurado" }, 503);
  }

  const id = c.req.param("id");
  await c.env.CLINICAL_KNOWLEDGE.deleteByIds([id]);
  return c.json({ deleted: true });
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

  // Se TEMOS um Query Sketch, a busca é HÍBRIDA SEMÂNTICA Edge-Native!
  // Fazemos fetch mais amplo (500 itens) em vez da busca restrita ILIKE pra capturar real contexto!
  const isSemantic = !!querySketch;
  const searchTerm = isSemantic ? "%" : `%${q}%`; // coringa se semântico
  const fetchLimit = isSemantic ? 500 : limit;

  try {
    if (type === "exercises" || type === "all") {
      const res = await pool.query(
        `SELECT id, name, description, embedding_sketch, 'exercises' AS content_type
         FROM exercises
         WHERE (is_public = true OR organization_id = $1)
           ${!isSemantic ? "AND (name ILIKE $2 OR description ILIKE $2)" : ""}
         LIMIT $${!isSemantic ? "3" : "2"}`,
        !isSemantic ? [orgId, searchTerm, fetchLimit] : [orgId, fetchLimit],
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
           ${!isSemantic ? "AND (title ILIKE $2 OR content ILIKE $2)" : ""}
         LIMIT $${!isSemantic ? "3" : "2"}`,
        !isSemantic ? [orgId, searchTerm, fetchLimit] : [orgId, fetchLimit],
      );
      results.push(
        ...res.rows.map((r) => ({
          ...r,
          source: isSemantic ? "turboquant_hybrid" : "text_search",
        })),
      );
    }

    // Se a busca for Semântica (TurboQuant Mapped), vamos aplicar a Distância L2 nos Nibbles e Re-ordenar (Memory Sorting O(n))
    if (isSemantic) {
      for (const row of results) {
        if (row.embedding_sketch) {
          const rowSketch = parseTurboSketch(row.embedding_sketch);
          // A similaridade retorna um scalar contínuo aproximado da proximidade Cosseno (~1 = perfeito, -1 = opsoto)
          row.score = TurboQuant.similarity(querySketch, rowSketch);
        } else {
          row.score = -1; // Joga pra baixo quem não tem embedding
        }
        // Remove the raw string to save edge payload weight
        delete row.embedding_sketch;
      }

      // Order DESC (maior score primeiro) e aplica o Limite real
      results.sort((a, b) => b.score - a.score);
      return c.json({ results: results.slice(0, limit), query: q, source: "turboquant_hybrid" });
    }

    // Se nçao tínhamos sketch, aplica o bypass de fallback texto flat
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
