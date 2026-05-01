/**
 * FisioBrain — Busca unificada na base de conhecimento clínico
 * GET /api/fisiobrain/search?q=...&source=...&area=...
 *
 * Sources: paper | wiki | protocol | exercise | all (default)
 */
import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { rateLimit } from "../middleware/rateLimit";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth, rateLimit({ endpoint: "fisiobrain", limit: 60, windowSeconds: 3600 }));

export interface FisioBrainSource {
  id: string;
  title: string;
  source: "paper" | "wiki" | "protocol" | "exercise";
  excerpt: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface FisioBrainResult {
  answer: string;
  sources: FisioBrainSource[];
  cached?: boolean;
}

app.get("/search", async (c) => {
  const query = c.req.query("q")?.trim();
  const sourceFilter = c.req.query("source") ?? "all";
  const areaClinica = c.req.query("area")?.trim();

  if (!query || query.length < 3) {
    return c.json({ error: "query must be at least 3 characters" }, 400);
  }

  if (!c.env.AI_SEARCH) {
    return c.json(
      {
        answer:
          "FisioBrain ainda não está configurado. Crie a instância 'fisioflow-knowledge' no Cloudflare Dashboard > AI > AI Search e configure o binding AI_SEARCH.",
        sources: [],
        configured: false,
      },
      200,
    );
  }

  try {
    // Construir filtros baseados nos parâmetros
    const filters: Record<string, string | string[]> = {};
    if (sourceFilter !== "all") {
      filters.source = sourceFilter.split(",").map((s) => s.trim());
    }
    if (areaClinica) {
      filters.area_clinica = areaClinica;
    }

    const result = await c.env.AI_SEARCH.search({
      messages: [
        {
          role: "system",
          content:
            "Você é o FisioBrain, assistente de conhecimento clínico da FisioFlow. " +
            "Responda em Português do Brasil com base nos documentos disponíveis. " +
            "Seja conciso, clínico e baseado em evidências. " +
            "Se não encontrar evidência relevante, diga claramente.",
        },
        { role: "user", content: query },
      ],
      limit: 5,
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
    });

    const sources: FisioBrainSource[] = (result.sources ?? []).map((s) => {
      const meta = (s.metadata ?? {}) as Record<string, unknown>;
      return {
        id: s.id,
        title: String(meta.title ?? s.filename ?? s.id),
        source: (String(meta.source ?? "wiki") as FisioBrainSource["source"]) ?? "wiki",
        excerpt: s.content?.slice(0, 300) ?? "",
        score: s.score,
        metadata: meta,
      };
    });

    return c.json({
      answer: result.response ?? "",
      sources,
      configured: true,
    } satisfies FisioBrainResult & { configured: boolean });
  } catch (err) {
    console.error("[fisiobrain/search]", err);
    return c.json({ error: "search failed", answer: "", sources: [] }, 500);
  }
});

export { app as fisioBrainRoutes };
