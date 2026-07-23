import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";
import { chatAiSearch, searchAiSearch } from "../lib/cloudflareAiSearch";
import { upsertWikiPageInIndex } from "../lib/wikiIndexing";
import { buildExerciseDoc, buildProtocolDoc, buildIndexChunks } from "../lib/contentIndexing";
import { deleteIndexedItemsByFilenames } from "../lib/wikiIndexing";
import type { DocMeta } from "../lib/ai/sectionChunker";
import { enqueueKbReindex, type KbSource } from "../lib/kbReindex";
import { aggregateStatus, type StatusItem } from "../lib/reindexStatus";
import {
  ASK_MATCH_THRESHOLD,
  isInternalRole,
  mapAskSources,
  normalizeAskQuery,
  resolveAskOutcome,
  folderFilterForType,
} from "../lib/wikiAsk";
import { writeEvent } from "../lib/analytics";
import { callAI } from "../lib/ai/callAI";

const AUTORAG_NAME = "fisioflow-rag";

const aiSearchApp = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── Query conversacional com AutoRAG ────────────────────────────────────────

aiSearchApp.post("/", requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const query = String(body.query ?? "").trim();
  if (!query) return c.json({ error: "query é obrigatória" }, 400);

  if (!c.env.AI_SEARCH && typeof c.env.AI?.autorag !== "function") {
    return c.json({ error: "AI Search não disponível neste ambiente" }, 503);
  }

  try {
    if (c.env.AI_SEARCH) {
      const answer = await chatAiSearch(c.env, {
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente clínico da FisioFlow para profissionais da clínica. Responda em Português do Brasil usando SOMENTE o conteúdo recuperado da wiki, protocolos e exercícios indexados. Cite a origem (título do protocolo/página) quando possível. Se o conteúdo recuperado não cobrir a pergunta, diga claramente que não encontrou nos protocolos indexados e oriente conferir a fonte — nunca invente condutas, doses ou níveis de evidência.",
          },
          { role: "user", content: query },
        ],
        maxNumResults: 8,
        matchThreshold: 0.25,
        // M3 — mais candidatos p/ o reranker reordenar + expansão de contexto
        // (chunks vizinhos) p/ respostas clínicas mais completas.
        contextExpansion: 2,
      });
      return c.json({
        response: answer.answer,
        sources: answer.sources,
        raw: answer.raw,
      });
    }

    const rag = c.env.AI.autorag(AUTORAG_NAME);
    const answer = await rag.aiSearch({
      query,
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      system_prompt:
        "Você é um assistente clínico da FisioFlow para profissionais. Responda em Português do Brasil usando SOMENTE o conteúdo recuperado (wiki, protocolos e exercícios). Cite a origem quando possível. Se o conteúdo não cobrir a pergunta, diga que não encontrou nos protocolos indexados — nunca invente condutas, doses ou níveis de evidência.",
      rewrite_query: true,
      max_num_results: 5,
      ranking_options: { score_threshold: 0.25 },
      reranking: { enabled: true, model: "@cf/baai/bge-reranker-base" },
      stream: false,
    });
    return c.json(answer);
  } catch (error: any) {
    console.error("[AI Search] search error:", error);
    return c.json({ error: "Falha na busca com IA", details: error.message }, 500);
  }
});

// ─── Pergunte à Wiki: resposta gerada + citações, com threshold ──────────────

aiSearchApp.post("/ask", requireAuth, async (c) => {
  const user = c.get("user");
  if (!isInternalRole(user.role)) {
    return c.json({ error: "Acesso restrito a profissionais da clínica" }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const query = String(body.query ?? "").trim();
  if (query.length < 3) return c.json({ error: "query muito curta" }, 400);

  if (!c.env.AI_SEARCH) {
    return c.json({ error: "AI Search não disponível neste ambiente" }, 503);
  }

  // Filtro por tipo usa o atributo nativo `folder` (metadata customizada não
  // é filtrável em instâncias built-in). rewrite desligado quando há filtro.
  const filters = folderFilterForType(body.type);
  // Escopo estreito escolhido pelo usuário → threshold menor (mostra os melhores
  // do tipo mesmo com poucos itens, ex.: documentos de referência).
  const threshold = filters ? 0.15 : ASK_MATCH_THRESHOLD;

  const started = Date.now();
  try {
    // Recuperação no AI Search (instância interna) — somente busca.
    const retrieval = await searchAiSearch(c.env, {
      query,
      maxNumResults: 8,
      matchThreshold: threshold,
      ...(filters ? { filters: filters as Record<string, any>, rewrite: false } : {}),
    });

    // Geração via callAI → roteada pelo AI Gateway (Guardrails aplicam aqui também).
    const context = retrieval.sources
      .map((s) => s.content)
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 8000);

    const generated = context
      ? await callAI(c.env, {
          task: "chat",
          organizationId: user.organizationId,
          temperature: 0.3,
          maxTokens: 700,
          messages: [
            {
              role: "system",
              content:
                "Você é o assistente da wiki clínica da FisioFlow. Responda em Português do Brasil usando APENAS o conteúdo fornecido. Se o contexto não cobrir a pergunta, diga que não encontrou na wiki.",
            },
            { role: "user", content: `Conteúdo da base:\n${context}\n\nPergunta: ${query}` },
          ],
        })
      : null;

    const result = { answer: generated?.content?.trim() ?? "", sources: retrieval.sources };
    const outcome = resolveAskOutcome(result.answer, result.sources, threshold);
    const latencyMs = Date.now() - started;

    writeEvent(c.env, {
      route: "/api/ai-search/ask",
      method: "POST",
      orgId: user.organizationId,
      event: outcome.answered ? "wiki_search" : "wiki_search_miss",
      latencyMs,
      value: outcome.topScore,
      detail: outcome.answered ? "" : normalizeAskQuery(query),
    });

    if (!outcome.answered) {
      return c.json({ answered: false, answer: null, sources: [], topScore: outcome.topScore });
    }

    return c.json({
      answered: true,
      answer: result.answer,
      sources: mapAskSources(result.sources, threshold),
      topScore: outcome.topScore,
    });
  } catch (error: any) {
    console.error("[AI Search] ask error:", error);
    return c.json({ error: "Falha ao consultar a wiki", details: error.message }, 500);
  }
});

// ─── Sugestões contextuais (retrieval-only, sem geração — barato) ────────────

aiSearchApp.post("/suggest", requireAuth, async (c) => {
  const user = c.get("user");
  if (!isInternalRole(user.role)) {
    return c.json({ error: "Acesso restrito a profissionais da clínica" }, 403);
  }
  if (!c.env.AI_SEARCH) return c.json({ data: [] });

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = String(body.text ?? "").trim();
  if (text.length < 12) return c.json({ data: [] });

  try {
    const { sources } = await searchAiSearch(c.env, {
      query: text.slice(-1500),
      maxNumResults: 5,
      matchThreshold: ASK_MATCH_THRESHOLD,
      rewrite: false,
    });
    return c.json({ data: mapAskSources(sources, ASK_MATCH_THRESHOLD) });
  } catch (error) {
    console.error("[AI Search] suggest error:", error);
    return c.json({ data: [] });
  }
});

// ─── Listar documentos (via CF REST API) ─────────────────────────────────────

aiSearchApp.get("/items", requireAuth, async (c) => {
  if (c.env.AI_SEARCH) {
    const data = await c.env.AI_SEARCH.items.list({
      per_page: Math.min(50, Math.max(1, Number(c.req.query("limit") ?? 50))),
    });
    return c.json(data);
  }

  const api = getCfApi(c.env);
  if (!api) return c.json({ error: "CF_API_TOKEN e CF_ACCOUNT_ID são necessários" }, 503);

  const res = await api(`/autorag/rags/${AUTORAG_NAME}/files`);
  const data = await res.json();
  return c.json(data);
});

// ─── Upload manual de conteúdo markdown/texto ────────────────────────────────

aiSearchApp.post("/items/upload", requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const filename = String(body.filename ?? `doc-${Date.now()}.md`);
  const content = String(body.content ?? "").trim();
  if (!content) return c.json({ error: "content é obrigatório" }, 400);

  if (c.env.AI_SEARCH) {
    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {};
    const data = await c.env.AI_SEARCH.items.upload(filename, content, { metadata });
    return c.json(data, 201);
  }

  const api = getCfApi(c.env);
  if (!api) return c.json({ error: "CF_API_TOKEN e CF_ACCOUNT_ID são necessários" }, 503);

  const form = new FormData();
  form.append("file", new Blob([content], { type: "text/markdown" }), filename);

  const res = await api(`/autorag/rags/${AUTORAG_NAME}/files`, { method: "POST", body: form });
  const data = await res.json();
  return c.json(data, res.ok ? 201 : 500);
});

// ─── Deletar documento ────────────────────────────────────────────────────────

aiSearchApp.delete("/items/:id", requireAuth, async (c) => {
  if (c.env.AI_SEARCH) {
    await c.env.AI_SEARCH.items.delete(c.req.param("id"));
    return c.json({ deleted: true });
  }

  const api = getCfApi(c.env);
  if (!api) return c.json({ error: "CF_API_TOKEN e CF_ACCOUNT_ID são necessários" }, 503);

  const res = await api(`/autorag/rags/${AUTORAG_NAME}/files/${c.req.param("id")}`, {
    method: "DELETE",
  });
  return c.json({ deleted: res.ok });
});

// ─── Sync em batch: exercícios + protocolos + wiki → AutoRAG ─────────────────
// Seguro re-executar. Cada item vira um markdown rico para melhor recuperação.
// Exportado para uso direto no cron (sem camada HTTP).

export async function syncAutoRAGContent(
  env: Env,
  types: Array<"exercises" | "protocols" | "wiki"> = ["exercises", "protocols", "wiki"],
): Promise<Record<string, number>> {
  const api = getCfApi(env);
  if (!env.AI_SEARCH && !api) {
    throw new Error(
      "AI_SEARCH ou CF_API_TOKEN e CF_ACCOUNT_ID são necessários para AI Search sync",
    );
  }

  const pool = createPool(env);
  const results: Record<string, number> = {};

  async function uploadDoc(
    filename: string,
    markdown: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(markdown);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const finalMetadata = {
      ...metadata,
      embedding_model: "baai/bge-large-en-v1.5", // AutoRAG default ou especificado
      embedding_version: "1.0",
      indexed_at: new Date().toISOString(),
      content_hash: hashHex,
    };

    // Sanitize metadata to avoid invalid_metadata_format
    const sanitizedMetadata: Record<string, string> = {};
    for (const [k, v] of Object.entries(finalMetadata)) {
      if (v !== null && v !== undefined) {
        sanitizedMetadata[k] = String(v);
      }
    }

    if (env.AI_SEARCH) {
      await env.AI_SEARCH.items.upload(filename, markdown, { metadata: sanitizedMetadata });
      return;
    }

    const form = new FormData();
    form.append("file", new Blob([markdown], { type: "text/markdown" }), filename);
    form.append("metadata", JSON.stringify(finalMetadata));
    await api!(`/autorag/rags/${AUTORAG_NAME}/files`, { method: "POST", body: form });
  }

  // Chunking section-aware: 1 arquivo por seção, com breadcrumb + metadata status.
  // Upsert seguro: limpa chunks antigos e o doc legado single-file antes de subir.
  async function indexChunked(
    baseFilename: string,
    markdown: string,
    meta: DocMeta,
    extra: Record<string, any>,
  ): Promise<void> {
    const files = buildIndexChunks(baseFilename, markdown, meta, extra);
    for (const f of files) {
      await uploadDoc(f.filename, f.text, f.metadata);
    }
    if (env.AI_SEARCH) {
      const { setChunkCount } = await import("../lib/kbIndexState");
      await setChunkCount(env, baseFilename, extra.source as string, files.length);
    }
  }

  if (types.includes("exercises")) {
    const res = await pool.query<{
      id: string;
      name: string;
      description: string | null;
      instructions: string | null;
      category: string | null;
      difficulty: string | null;
      muscles_primary: string[] | null;
      muscles_secondary: string[] | null;
      body_parts: string[] | null;
      tips: string | null;
      precautions: string | null;
      benefits: string | null;
    }>(
      `SELECT e.id, e.name, e.description, e.instructions,
              ec.name AS category, e.difficulty,
              e.muscles_primary, e.muscles_secondary, e.body_parts,
              e.tips, e.precautions, e.benefits
       FROM exercises e
       LEFT JOIN exercise_categories ec ON ec.id = e.category_id
       WHERE e.is_public = true
       LIMIT 500`,
    );
    let count = 0;
    for (let i = 0; i < res.rows.length; i += 5) {
      await Promise.all(
        res.rows.slice(i, i + 5).map((row) =>
          indexChunked(
            `exercise-${row.id}.md`,
            buildExerciseDoc(row),
            { status: "current", sourceType: "exercise", specialty: row.category ?? undefined },
            { source: "exercises", id: row.id, title: row.name, category: row.category },
          ),
        ),
      );
      count += Math.min(5, res.rows.length - i);
    }
    results.exercises = count;
  }

  if (types.includes("protocols")) {
    const res = await pool.query<{
      id: string;
      name: string;
      description: string | null;
      condition_name: string | null;
      weeks_total: number | null;
      objectives: string | null;
      contraindications: string | null;
      evidence_level: string | null;
      protocol_type: string | null;
    }>(
      `SELECT id, name, description, condition_name, weeks_total,
              objectives, contraindications, evidence_level, protocol_type
       FROM exercise_protocols
       WHERE is_public = true
       LIMIT 300`,
    );
    let count = 0;
    for (let i = 0; i < res.rows.length; i += 5) {
      await Promise.all(
        res.rows.slice(i, i + 5).map((row) =>
          indexChunked(
            `protocol-${row.id}.md`,
            buildProtocolDoc(row),
            { status: "current", sourceType: "protocol", specialty: row.protocol_type ?? undefined },
            { source: "protocols", id: row.id, title: row.name, condition: row.condition_name },
          ),
        ),
      );
      count += Math.min(5, res.rows.length - i);
    }
    results.protocols = count;
  }

  if (types.includes("wiki")) {
    const res = await pool.query<{
      id: string;
      title: string;
      content: string | null;
      category: string | null;
    }>(
      `SELECT wp.id, wp.title, LEFT(wp.content, 3000) AS content, wc.name AS category
       FROM wiki_pages wp
       LEFT JOIN wiki_categories wc ON wc.id = wp.category_id
       WHERE wp.is_public = true
       LIMIT 200`,
    );
    let count = 0;
    for (let i = 0; i < res.rows.length; i += 5) {
      await Promise.all(
        res.rows.slice(i, i + 5).map((row) =>
          indexChunked(
            `wiki/${row.id}.md`,
            buildWikiDoc(row),
            { status: "current", sourceType: "wiki", specialty: row.category ?? undefined },
            { source: "wiki", id: row.id, title: row.title, category: row.category },
          ),
        ),
      );
      count += Math.min(5, res.rows.length - i);
    }
    results.wiki = count;
  }

  return results;
}

// Reindex ASSÍNCRONO: enfileira 1 item por mensagem (Queue) e retorna na hora.
// Robusto p/ conjuntos grandes — não depende de um request HTTP longo.
aiSearchApp.post("/reindex", requireAuth, async (c) => {
  if (!isInternalRole(c.get("user").role)) {
    return c.json({ error: "Acesso restrito a profissionais da clínica" }, 403);
  }
  if (!c.env.BACKGROUND_QUEUE) {
    return c.json({ error: "Fila de tarefas indisponível neste ambiente" }, 503);
  }
  const body = (await c.req.json().catch(() => ({}))) as { types?: KbSource[] };
  try {
    const enqueued = await enqueueKbReindex(c.env, body.types);
    return c.json({ success: true, enqueued });
  } catch (err: any) {
    console.error("[AI Search] reindex enqueue error:", err);
    return c.json({ error: "Falha ao enfileirar reindexação", details: err.message }, 500);
  }
});

aiSearchApp.get("/reindex/status", requireAuth, async (c) => {
  if (!isInternalRole(c.get("user").role)) {
    return c.json({ error: "Acesso restrito a profissionais da clínica" }, 403);
  }
  if (!c.env.AI_SEARCH?.items) return c.json({ errors: 0, pending: 0, errorKeys: [] });
  const collected: StatusItem[] = [];
  for (const status of ["error", "running", "queued"] as const) {
    for (let page = 1; page <= 10; page++) {
      const listing: any = await c.env.AI_SEARCH.items.list({ status, per_page: 50, page } as any);
      const rows: any[] = listing?.result ?? listing?.items ?? [];
      if (rows.length === 0) break;
      for (const r of rows) collected.push({ status, key: r.key ?? r.filename });
      if (rows.length < 50) break;
    }
  }
  return c.json(aggregateStatus(collected));
});

aiSearchApp.post("/sync", requireAuth, async (c) => {
  if (!isInternalRole(c.get("user").role)) {
    return c.json({ error: "Acesso restrito a profissionais da clínica" }, 403);
  }
  const body = (await c.req.json().catch(() => ({}))) as {
    types?: Array<"exercises" | "protocols" | "wiki">;
  };
  try {
    const results = await syncAutoRAGContent(c.env, body.types);
    return c.json({ success: true, indexed: results });
  } catch (err: any) {
    return c.json({ error: err.message }, 503);
  }
});

// ─── Busca Semântica de Exercícios com Dicionário Clínico (AI Search) ────────

aiSearchApp.get("/exercises", requireAuth, async (c) => {
  if (!c.env.AI_SEARCH) return c.json({ error: "AI Search não configurado" }, 503);
  const query = c.req.query("q");
  if (!query) return c.json({ error: "query é obrigatória" }, 400);

  try {
    const { sources } = await searchAiSearch(c.env, {
      messages: [
        {
          role: "system",
          content:
            "Você é um dicionário clínico de fisioterapia. Ajude a encontrar exercícios clínicos relevantes.",
        },
        { role: "user", content: query },
      ],
      maxNumResults: 10,
      filters: { source: "exercises" },
    });

    return c.json({
      query,
      data: sources.map((s) => ({
        id: s.id,
        score: s.score ?? 1,
        name: s.filename,
        ...s.metadata,
      })),
    });
  } catch (error: any) {
    console.error("[AI Search] Search error:", error);
    return c.json({ error: "Falha na busca semântica" }, 500);
  }
});

// ─── Recomendador Automático de Condutas (AI Search) ─────────────────────────

aiSearchApp.get("/recommend", requireAuth, async (c) => {
  if (!c.env.AI_SEARCH) return c.json({ error: "AI Search não configurado" }, 503);
  const condition = c.req.query("condition");
  if (!condition) return c.json({ error: "A condição clínica (condition) é obrigatória" }, 400);

  try {
    console.log(`[AI Search] Generating clinical recommendations for: "${condition}"`);

    // Busca Wiki e Exercícios em paralelo no AI Search
    const [wikiRes, exerciseRes] = await Promise.all([
      searchAiSearch(c.env, {
        messages: [
          { role: "system", content: "Find clinical protocols and guides for this condition." },
          { role: "user", content: condition },
        ],
        maxNumResults: 3,
        filters: { source: "wiki" },
      }),
      searchAiSearch(c.env, {
        messages: [
          { role: "system", content: "Find relevant therapeutic exercises for this condition." },
          { role: "user", content: condition },
        ],
        maxNumResults: 5,
        filters: { source: "exercises" },
      }),
    ]).catch((err) => {
      console.error("[AI Search] Promise.all error:", err);
      throw err;
    });

    return c.json({
      condition,
      recommendations: {
        protocols: wikiRes.sources.map((s) => ({
          id: s.id,
          score: s.score ?? 1,
          title: s.filename,
          ...s.metadata,
        })),
        exercises: exerciseRes.sources.map((s) => ({
          id: s.id,
          score: s.score ?? 1,
          name: s.filename,
          ...s.metadata,
        })),
      },
    });
  } catch (error: any) {
    console.error("[AI Search] Recommend error:", error);
    return c.json(
      {
        error: "Falha ao gerar recomendações clínicas",
        details: error.message,
        _trace: "recommend_fail_v1",
      },
      500,
    );
  }
});

// ─── Sync Exercícios → AI Search (No-op) ─────────────────────────────────────

aiSearchApp.post("/exercises/sync", requireAuth, async (c) => {
  return c.json({
    success: true,
    count: 0,
    message: "AI Search sync is managed automatically via R2 sync.",
  });
});

// ─── Sync Wiki → AI Search (No-op) ───────────────────────────────────────────

aiSearchApp.post("/wiki/sync", requireAuth, async (c) => {
  return c.json({
    success: true,
    count: 0,
    message: "AI Search sync is managed automatically via R2 sync.",
  });
});

// ─── Busca Unificada Global (Omnisearch via AI Search) ───────────────────────

aiSearchApp.get("/unified", requireAuth, async (c) => {
  const query = c.req.query("q");
  if (!query || query.length < 3) return c.json({ data: [] });
  if (!c.env.AI_SEARCH) return c.json({ error: "AI Search não configurado" }, 503);

  try {
    const { generateEmbedding } = await import("../lib/ai-native");
    const vector = await generateEmbedding(c.env, query);

    // Buscar no AI Search e Neon
    const [aiSearchRes, patientMatches] = await Promise.all([
      searchAiSearch(c.env, {
        messages: [
          { role: "system", content: "You are a clinical unified search assistant." },
          { role: "user", content: query },
        ],
        maxNumResults: 8,
      }),
      (async () => {
        const { getRawSql } = await import("../lib/db");
        const sql = getRawSql(c.env, "read");
        const user = c.get("user");
        return await sql`
          SELECT 
            p.id, p.full_name as name, ce.content_summary as summary,
            1 - (ce.embedding <=> ${JSON.stringify(vector)}::vector) as similarity
          FROM clinical_embeddings ce
          JOIN patients p ON p.id = ce.patient_id
          WHERE ce.organization_id = ${user.organizationId}::uuid
          ORDER BY ce.embedding <=> ${JSON.stringify(vector)}::vector
          LIMIT 3
        `;
      })(),
    ]);

    const results = [
      ...aiSearchRes.sources.map((s) => {
        let type = "wiki";
        if (s.metadata?.source === "exercise") type = "exercise";
        else if (s.metadata?.source === "protocol") type = "protocol";

        return {
          id: s.metadata?.id || s.id,
          type: type,
          title: s.metadata?.title || s.metadata?.name || s.filename,
          category: (s.metadata?.category as string) || "Geral",
          score: s.score ?? 1,
        };
      }),
      ...patientMatches.rows.map((p: any) => ({
        id: p.id,
        type: "patient",
        title: p.name,
        description: p.summary,
        score: p.similarity,
      })),
    ];

    return c.json({
      query,
      data: results.sort((a, b) => b.score - a.score),
    });
  } catch (error: any) {
    console.error("[Omnisearch] Error:", error);
    return c.json({ error: "Falha na busca unificada" }, 500);
  }
});

/**
 * GET /api/ai-search/education
 * Retorna dicas de educação em saúde personalizadas baseadas no contexto do paciente via AI Search.
 */
aiSearchApp.get("/education", async (c) => {
  const user = c.get("user");
  const patientId = c.req.query("patientId");
  if (!patientId) return c.json({ error: "patientId é obrigatório" }, 400);
  if (!c.env.AI_SEARCH) return c.json({ error: "AI Search não configurado" }, 503);

  try {
    const { getRawSql } = await import("../lib/db");
    const sql = getRawSql(c.env, "read");

    // 1. Obter diagnóstico e condição do paciente
    const patientRes =
      await sql`SELECT condition, diagnosis FROM patients WHERE id = ${patientId}::uuid AND organization_id = ${user.organizationId}::uuid`;
    const patient = patientRes.rows[0];
    if (!patient) return c.json({ error: "Paciente não encontrado" }, 404);

    // 2. Buscar conteúdo relevante na Wiki via AI Search
    const query = `dicas de saúde e orientações para ${patient.condition} ${patient.diagnosis}`;

    const wikiRes = await searchAiSearch(c.env, {
      messages: [
        { role: "system", content: "Find clinical guides and advice for patients." },
        { role: "user", content: query },
      ],
      maxNumResults: 2,
      filters: { source: "wiki" },
    });

    const context = wikiRes.sources.map((s) => s.content).join("\n\n");

    // 3. Usar IA para sintetizar dicas curtas e motivadoras
    const { runThinkingModel } = await import("../lib/ai-native");
    const prompt = `
      Você é um assistente de educação em saúde para pacientes de fisioterapia.
      Com base na condição do paciente (${patient.condition}) e nas diretrizes da clínica abaixo:
      
      DIRETRIZES:
      ${context || "Fisioterapia baseada em movimento, consistência e educação postural."}

      Gere 3 dicas curtas, práticas e motivadoras para o paciente fazer em casa.
      Responda APENAS um JSON: {"tips": ["dica 1", "dica 2", "dica 3"]}
    `.trim();

    const aiRes = await runThinkingModel(c.env, {
      prompt,
      model: "gemini-1.5-flash",
      temperature: 0.7,
      responseFormat: "json",
    });

    const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch?.[0] ?? aiRes.content);

    return c.json({ data: data.tips });
  } catch (error: any) {
    console.error("[AI/Education] Error:", error);
    return c.json({ error: "Falha ao gerar dicas de saúde" }, 500);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function surgicalSyncWiki(
  env: Env,
  row: { id: string; title: string; content: string; category: string },
) {
  const result = await upsertWikiPageInIndex(env, {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category || "Geral",
  });
  if (result.ok) {
    console.log(`[AI Search] Surgically synchronized wiki page: ${row.title}`);
  } else if (result.error) {
    console.error("[AI Search] Surgical wiki sync failed:", result.error);
  }
}

function getCfApi(env: Env) {
  const token = (env as any).CF_API_TOKEN as string | undefined;
  const accountId = (env as any).CF_ACCOUNT_ID as string | undefined;
  if (!token || !accountId) return null;

  return (path: string, init?: RequestInit) =>
    fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
}

function buildWikiDoc(row: {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
}): string {
  const parts: string[] = [`# ${row.title}`];
  if (row.category) parts.push(`**Categoria:** ${row.category}`);
  if (row.content) parts.push(`\n${row.content}`);
  return parts.join("\n");
}

export default aiSearchApp;
