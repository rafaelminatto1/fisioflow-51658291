import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";

const AUTORAG_NAME = "fisioflow-rag";

const aiSearchApp = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── Query conversacional com AutoRAG ────────────────────────────────────────

aiSearchApp.post("/", requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const query = String(body.query ?? "").trim();
  if (!query) return c.json({ error: "query é obrigatória" }, 400);

  if (typeof c.env.AI?.autorag !== "function") {
    return c.json({ error: "AutoRAG não disponível neste ambiente" }, 503);
  }

  try {
    const rag = c.env.AI.autorag(AUTORAG_NAME);
    const answer = await rag.aiSearch({
      query,
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      rewrite_query: true,
      max_num_results: 5,
      ranking_options: { score_threshold: 0.25 },
      reranking: { enabled: true, model: "@cf/baai/bge-reranker-base" },
      stream: false,
    });
    return c.json(answer);
  } catch (error: any) {
    console.error("[AutoRAG] search error:", error);
    return c.json({ error: "Falha na busca com IA", details: error.message }, 500);
  }
});

// ─── Listar documentos (via CF REST API) ─────────────────────────────────────

aiSearchApp.get("/items", requireAuth, async (c) => {
  const api = getCfApi(c.env);
  if (!api) return c.json({ error: "CF_API_TOKEN e CF_ACCOUNT_ID são necessários" }, 503);

  const res = await api(`/autorag/rags/${AUTORAG_NAME}/files`);
  const data = await res.json();
  return c.json(data);
});

// ─── Upload manual de conteúdo markdown/texto ────────────────────────────────

aiSearchApp.post("/items/upload", requireAuth, async (c) => {
  const api = getCfApi(c.env);
  if (!api) return c.json({ error: "CF_API_TOKEN e CF_ACCOUNT_ID são necessários" }, 503);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const filename = String(body.filename ?? `doc-${Date.now()}.md`);
  const content = String(body.content ?? "").trim();
  if (!content) return c.json({ error: "content é obrigatório" }, 400);

  const form = new FormData();
  form.append("file", new Blob([content], { type: "text/markdown" }), filename);

  const res = await api(`/autorag/rags/${AUTORAG_NAME}/files`, { method: "POST", body: form });
  const data = await res.json();
  return c.json(data, res.ok ? 201 : 500);
});

// ─── Deletar documento ────────────────────────────────────────────────────────

aiSearchApp.delete("/items/:id", requireAuth, async (c) => {
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
  if (!api) throw new Error("CF_API_TOKEN e CF_ACCOUNT_ID são necessários para AutoRAG sync");

  const pool = createPool(env);
  const results: Record<string, number> = {};

  async function uploadDoc(filename: string, markdown: string): Promise<void> {
    const form = new FormData();
    form.append("file", new Blob([markdown], { type: "text/markdown" }), filename);
    await api!(`/autorag/rags/${AUTORAG_NAME}/files`, { method: "POST", body: form });
  }

  if (types.includes("exercises")) {
    const res = await pool.query<{
      id: string; name: string; description: string | null;
      instructions: string | null; category: string | null;
      difficulty: string | null; muscles_primary: string[] | null;
      muscles_secondary: string[] | null; body_parts: string[] | null;
      tips: string | null; precautions: string | null; benefits: string | null;
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
          uploadDoc(`exercise-${row.id}.md`, buildExerciseDoc(row)),
        ),
      );
      count += Math.min(5, res.rows.length - i);
    }
    results.exercises = count;
  }

  if (types.includes("protocols")) {
    const res = await pool.query<{
      id: string; name: string; description: string | null;
      condition_name: string | null; weeks_total: number | null;
      objectives: string | null; contraindications: string | null;
      evidence_level: string | null; protocol_type: string | null;
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
          uploadDoc(`protocol-${row.id}.md`, buildProtocolDoc(row)),
        ),
      );
      count += Math.min(5, res.rows.length - i);
    }
    results.protocols = count;
  }

  if (types.includes("wiki")) {
    const res = await pool.query<{
      id: string; title: string; content: string | null; category: string | null;
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
          uploadDoc(`wiki-${row.id}.md`, buildWikiDoc(row)),
        ),
      );
      count += Math.min(5, res.rows.length - i);
    }
    results.wiki = count;
  }

  return results;
}

aiSearchApp.post("/sync", requireAuth, async (c) => {
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

// ─── Busca Semântica de Exercícios com Dicionário Clínico (Vectorize) ────────

aiSearchApp.get("/exercises", requireAuth, async (c) => {
  if (!c.env.CLINICAL_KNOWLEDGE) return c.json({ error: "Vectorize não configurado" }, 503);
  const query = c.req.query("q");
  if (!query) return c.json({ error: "query é obrigatória" }, 400);

  try {
    // 0. Expansão de Dicionário Clínico (Ontologia via Llama 3)
    let expandedQuery = query;
    try {
      const expansion: any = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { 
            role: "system", 
            content: "Você é um dicionário clínico de fisioterapia. Dada uma queixa, termo leigo ou objetivo, retorne uma lista de 3 a 5 termos clínicos, sinônimos técnicos, patologias ou músculos/articulações relacionados, separados por vírgula. Não escreva frases, introduções ou explicações. APENAS os termos." 
          },
          { role: "user", content: query }
        ],
      });
      if (expansion.response) {
        expandedQuery = `${query}, ${expansion.response}`;
        console.log(`[Vectorize] Query expanded from "${query}" to "${expandedQuery}"`);
      }
    } catch (e) {
      console.warn("[Vectorize] Dictionary expansion failed, using raw query", e);
    }

    // 1. Gerar embedding para a busca expandida
    const aiResponse: any = await c.env.AI.run("@cf/baai/bge-m3", {
      text: [expandedQuery],
    });
    const vector = aiResponse.data[0];

    // 2. Buscar no Vectorize
    const matches = await c.env.CLINICAL_KNOWLEDGE.query(vector, {
      topK: 10,
      namespace: "exercises",
      returnMetadata: true,
    });

    return c.json({
      query,
      expandedQuery,
      data: matches.matches.map((m: any) => ({
        id: m.id,
        score: m.score,
        ...m.metadata,
      })),
    });
  } catch (error: any) {
    console.error("[Vectorize] Search error:", error);
    return c.json({ error: "Falha na busca semântica" }, 500);
  }
});

// ─── Recomendador Automático de Condutas (Vectorize) ─────────────────────────

aiSearchApp.get("/recommend", requireAuth, async (c) => {
  if (!c.env.CLINICAL_KNOWLEDGE) return c.json({ error: "Vectorize não configurado" }, 503);
  const condition = c.req.query("condition");
  if (!condition) return c.json({ error: "A condição clínica (condition) é obrigatória" }, 400);

  try {
    console.log(`[Vectorize] Generating clinical recommendations for: "${condition}"`);

    // 1. Gerar embedding para a condição clínica
    const aiResponse: any = await c.env.AI.run("@cf/baai/bge-m3", {
      text: [condition],
    });
    const vector = aiResponse.data[0];

    // 2. Buscar Protocolos na Wiki
    const wikiMatches = await c.env.CLINICAL_KNOWLEDGE.query(vector, {
      topK: 3,
      namespace: "wiki",
      returnMetadata: true,
    });

    // 3. Buscar Exercícios Sugeridos
    const exerciseMatches = await c.env.CLINICAL_KNOWLEDGE.query(vector, {
      topK: 5,
      namespace: "exercises",
      returnMetadata: true,
    });

    return c.json({
      condition,
      recommendations: {
        protocols: wikiMatches.matches.map((m: any) => ({ id: m.id, score: m.score, ...m.metadata })),
        exercises: exerciseMatches.matches.map((m: any) => ({ id: m.id, score: m.score, ...m.metadata })),
      }
    });
  } catch (error: any) {
    console.error("[Vectorize] Recommend error:", error);
    return c.json({ error: "Falha ao gerar recomendações clínicas" }, 500);
  }
});

// ─── Sync Exercícios → Vectorize ─────────────────────────────────────────────

aiSearchApp.post("/exercises/sync", requireAuth, async (c) => {
  if (!c.env.CLINICAL_KNOWLEDGE) return c.json({ error: "Vectorize não configurado" }, 503);
  const pool = createPool(c.env);
  
  try {
    const res = await pool.query(`
      SELECT id, name, description, instructions, muscles_primary, muscles_secondary, body_parts
      FROM exercises 
      WHERE is_public = true AND deleted_at IS NULL
    `);

    console.log(`[Vectorize] Syncing ${res.rows.length} exercises...`);

    for (const row of res.rows) {
      const textToEmbed = `
        Nome: ${row.name}
        Descrição: ${row.description || ""}
        Instruções: ${row.instructions || ""}
        Músculos: ${(row.muscles_primary || []).join(", ")}
        Regiões: ${(row.body_parts || []).join(", ")}
      `.trim();

      const aiResponse: any = await c.env.AI.run("@cf/baai/bge-m3", {
        text: [textToEmbed],
      });

      await c.env.CLINICAL_KNOWLEDGE.upsert([{
        id: row.id,
        values: aiResponse.data[0],
        namespace: "exercises",
        metadata: {
          name: row.name,
          category: "exercise"
        }
      }]);
    }

    return c.json({ success: true, count: res.rows.length });
  } catch (error: any) {
    console.error("[Vectorize] Sync error:", error);
    return c.json({ error: "Falha na sincronização de vetores" }, 500);
  }
});

// ─── Sync Wiki → Vectorize ───────────────────────────────────────────────────

aiSearchApp.post("/wiki/sync", requireAuth, async (c) => {
  if (!c.env.CLINICAL_KNOWLEDGE) return c.json({ error: "Vectorize não configurado" }, 503);
  const pool = createPool(c.env);
  
  try {
    const res = await pool.query(`
      SELECT wp.id, wp.title, wp.content, wc.name as category
      FROM wiki_pages wp
      LEFT JOIN wiki_categories wc ON wc.id = wp.category_id
      WHERE wp.is_public = true AND wp.deleted_at IS NULL
    `);

    console.log(`[Vectorize] Syncing ${res.rows.length} wiki pages...`);

    for (const row of res.rows) {
      const textToEmbed = `
        Título: ${row.title}
        Categoria: ${row.category || "Geral"}
        Conteúdo: ${row.content || ""}
      `.trim().substring(0, 8000);

      const aiResponse: any = await c.env.AI.run("@cf/baai/bge-m3", {
        text: [textToEmbed],
      });

      await c.env.CLINICAL_KNOWLEDGE.upsert([{
        id: row.id,
        values: aiResponse.data[0],
        namespace: "wiki",
        metadata: {
          title: row.title,
          category: row.category || "wiki"
        }
      }]);
    }

    return c.json({ success: true, count: res.rows.length });
  } catch (error: any) {
    console.error("[Vectorize] Wiki Sync error:", error);
    return c.json({ error: "Falha na sincronização da wiki no Vectorize" }, 500);
  }
});

// ─── Busca Unificada Global (Omnisearch) ───────────────────────────────────

aiSearchApp.get("/unified", requireAuth, async (c) => {
  const query = c.req.query("q");
  if (!query || query.length < 3) return c.json({ data: [] });

  try {
    const { generateEmbedding } = await import("../lib/ai-native");
    const vector = await generateEmbedding(c.env, query);

    // 1. Buscar Exercícios e Wiki no Vectorize em paralelo
    const [exerciseMatches, wikiMatches] = await Promise.all([
      c.env.CLINICAL_KNOWLEDGE.query(vector, { topK: 5, namespace: "exercises", returnMetadata: true }),
      c.env.CLINICAL_KNOWLEDGE.query(vector, { topK: 3, namespace: "wiki", returnMetadata: true })
    ]);

    // 2. Buscar Pacientes Similares no Neon (pgvector)
    const sql = getRawSql(c.env, "read");
    const user = c.get("user");
    
    const patientMatches = await sql`
      SELECT 
        p.id, p.full_name as name, ce.content_summary as summary,
        1 - (ce.embedding <=> ${vector}::vector) as similarity
      FROM clinical_embeddings ce
      JOIN patients p ON p.id = ce.patient_id
      WHERE ce.organization_id = ${user.organizationId}::uuid
      ORDER BY ce.embedding <=> ${vector}::vector
      LIMIT 3
    `;

    const results = [
      ...exerciseMatches.matches.map((m: any) => ({
        id: m.id,
        type: "exercise",
        title: m.metadata.name,
        score: m.score,
      })),
      ...wikiMatches.matches.map((m: any) => ({
        id: m.id,
        type: "wiki",
        title: m.metadata.title,
        category: m.metadata.category,
        score: m.score,
      })),
      ...patientMatches.rows.map((p: any) => ({
        id: p.id,
        type: "patient",
        title: p.name,
        description: p.summary,
        score: p.similarity,
      }))
    ];

    return c.json({ 
      query,
      data: results.sort((a, b) => b.score - a.score) 
    });
  } catch (error: any) {
    console.error("[Omnisearch] Error:", error);
    return c.json({ error: "Falha na busca unificada" }, 500);
  }
});

/**
 * GET /api/ai-search/education
 * Retorna dicas de educação em saúde personalizadas baseadas no contexto do paciente.
 */
aiSearchApp.get("/education", async (c) => {
  const patientId = c.req.query("patientId");
  if (!patientId) return c.json({ error: "patientId é obrigatório" }, 400);

  try {
    const pool = createPool(c.env);
    const { getRawSql } = await import("../lib/db");
    const sql = getRawSql(c.env, "read");

    // 1. Obter diagnóstico e condição do paciente
    const patientRes = await sql`SELECT condition, diagnosis FROM patients WHERE id = ${patientId}::uuid`;
    const patient = patientRes.rows[0];
    if (!patient) return c.json({ error: "Paciente não encontrado" }, 404);

    // 2. Buscar conteúdo relevante na Wiki via Vectorize
    const { generateEmbedding } = await import("../lib/ai-native");
    const query = `dicas de saúde e orientações para ${patient.condition} ${patient.diagnosis}`;
    const vector = await generateEmbedding(c.env, query);

    const wikiMatches = await c.env.CLINICAL_KNOWLEDGE.query(vector, {
      topK: 2,
      namespace: "wiki",
      returnMetadata: true,
    });

    const context = wikiMatches.matches
      .map((m: any) => m.metadata.text || m.metadata.title)
      .join("\n\n");

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
      responseFormat: "json"
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

export async function surgicalSyncWiki(env: Env, row: { id: string, title: string, content: string, category: string }) {
  if (!env.CLINICAL_KNOWLEDGE) return;
  
  const textToEmbed = `
    Título: ${row.title}
    Categoria: ${row.category || "Geral"}
    Conteúdo: ${row.content || ""}
  `.trim().substring(0, 8000);

  const { generateEmbedding } = await import("../lib/ai-native");
  const vector = await generateEmbedding(env, textToEmbed);

  await env.CLINICAL_KNOWLEDGE.upsert([{
    id: row.id,
    values: vector,
    namespace: "wiki",
    metadata: {
      title: row.title,
      category: row.category || "wiki"
    }
  }]);
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

function buildExerciseDoc(row: {
  id: string; name: string; description: string | null;
  instructions: string | null; category: string | null;
  difficulty: string | null; muscles_primary: string[] | null;
  muscles_secondary: string[] | null; body_parts: string[] | null;
  tips: string | null; precautions: string | null; benefits: string | null;
}): string {
  const parts: string[] = [`# Exercício: ${row.name}`];
  if (row.category) parts.push(`**Categoria:** ${row.category}`);
  if (row.difficulty) parts.push(`**Dificuldade:** ${row.difficulty}`);
  if (row.muscles_primary?.length) parts.push(`**Músculos primários:** ${row.muscles_primary.join(", ")}`);
  if (row.muscles_secondary?.length) parts.push(`**Músculos secundários:** ${row.muscles_secondary.join(", ")}`);
  if (row.body_parts?.length) parts.push(`**Regiões corporais:** ${row.body_parts.join(", ")}`);
  if (row.description) parts.push(`\n## Descrição\n${row.description}`);
  if (row.instructions) parts.push(`\n## Instruções de Execução\n${row.instructions}`);
  if (row.benefits) parts.push(`\n## Benefícios Clínicos\n${row.benefits}`);
  if (row.tips) parts.push(`\n## Dicas Clínicas\n${row.tips}`);
  if (row.precautions) parts.push(`\n## Precauções\n${row.precautions}`);
  return parts.join("\n");
}

function buildProtocolDoc(row: {
  id: string; name: string; description: string | null;
  condition_name: string | null; weeks_total: number | null;
  objectives: string | null; contraindications: string | null;
  evidence_level: string | null; protocol_type: string | null;
}): string {
  const parts: string[] = [`# Protocolo Clínico: ${row.name}`];
  if (row.condition_name) parts.push(`**Condição clínica:** ${row.condition_name}`);
  if (row.protocol_type) parts.push(`**Tipo:** ${row.protocol_type}`);
  if (row.evidence_level) parts.push(`**Nível de evidência:** ${row.evidence_level}`);
  if (row.weeks_total) parts.push(`**Duração:** ${row.weeks_total} semanas`);
  if (row.description) parts.push(`\n## Descrição do Protocolo\n${row.description}`);
  if (row.objectives) parts.push(`\n## Objetivos\n${row.objectives}`);
  if (row.contraindications) parts.push(`\n## Contraindicações\n${row.contraindications}`);
  return parts.join("\n");
}

function buildWikiDoc(row: {
  id: string; title: string; content: string | null; category: string | null;
}): string {
  const parts: string[] = [`# ${row.title}`];
  if (row.category) parts.push(`**Categoria:** ${row.category}`);
  if (row.content) parts.push(`\n${row.content}`);
  return parts.join("\n");
}

export default aiSearchApp;
