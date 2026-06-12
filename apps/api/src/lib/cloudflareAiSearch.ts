import type { Env } from "../types/env";

export type AiSearchMessage = {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content: string;
};

export type AiSearchFilterValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | Record<string, unknown>;

export type AiSearchSource = {
  id: string;
  filename: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
};

type SearchParams = {
  query?: string;
  messages?: AiSearchMessage[];
  maxNumResults?: number;
  filters?: Record<string, AiSearchFilterValue>;
  retrievalType?: "vector" | "keyword" | "hybrid";
  matchThreshold?: number;
  contextExpansion?: 0 | 1 | 2 | 3;
  rerank?: boolean;
  rewrite?: boolean;
};

export function buildAiSearchRequest(params: SearchParams): Record<string, unknown> {
  const request: Record<string, unknown> = params.query
    ? { query: params.query }
    : { messages: params.messages ?? [] };

  request.ai_search_options = {
    retrieval: {
      retrieval_type: params.retrievalType ?? "hybrid",
      max_num_results: params.maxNumResults ?? 10,
      context_expansion: params.contextExpansion ?? 0,
      ...(params.matchThreshold !== undefined ? { match_threshold: params.matchThreshold } : {}),
      ...(params.filters ? { filters: normalizeAiSearchFilters(params.filters) } : {}),
    },
    query_rewrite: { enabled: params.rewrite ?? true },
    reranking: { enabled: params.rerank ?? true },
    cache: { enabled: true, cache_threshold: "close_enough" },
  };

  return request;
}

export async function searchAiSearch(env: Env, params: SearchParams): Promise<{
  raw: any;
  sources: AiSearchSource[];
}> {
  if (!env.AI_SEARCH) {
    throw new Error("AI Search nao configurado");
  }

  const raw = await env.AI_SEARCH.search(buildAiSearchRequest(params));
  return { raw, sources: normalizeAiSearchSources(raw) };
}

export async function chatAiSearch(env: Env, params: SearchParams & { model?: string }): Promise<{
  raw: any;
  answer: string;
  sources: AiSearchSource[];
}> {
  if (!env.AI_SEARCH) {
    throw new Error("AI Search nao configurado");
  }

  const request = {
    ...buildAiSearchRequest(params),
    model: params.model ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    stream: false,
  };

  const raw =
    typeof env.AI_SEARCH.chatCompletions === "function"
      ? await env.AI_SEARCH.chatCompletions(request)
      : await env.AI_SEARCH.search(request);

  return {
    raw,
    answer: extractAiSearchAnswer(raw),
    sources: normalizeAiSearchSources(raw),
  };
}

export function normalizeAiSearchSources(raw: any): AiSearchSource[] {
  if (Array.isArray(raw?.sources)) {
    return raw.sources.map((source: any) => ({
      id: String(source.id ?? source.filename ?? source.key ?? crypto.randomUUID()),
      filename: String(source.filename ?? source.key ?? source.id ?? "documento"),
      content: String(source.content ?? source.text ?? ""),
      metadata: normalizeMetadata(source.metadata),
      score: Number(source.score ?? 1),
    }));
  }

  if (Array.isArray(raw?.chunks)) {
    return raw.chunks.map((chunk: any) => {
      const item = chunk.item ?? {};
      return {
        id: String(chunk.id ?? item.key ?? crypto.randomUUID()),
        filename: String(item.key ?? chunk.id ?? "documento"),
        content: String(chunk.text ?? ""),
        metadata: normalizeMetadata(item.metadata),
        score: Number(chunk.score ?? 1),
      };
    });
  }

  return [];
}

export function extractAiSearchAnswer(raw: any): string {
  return String(
    raw?.choices?.[0]?.message?.content ??
      raw?.response ??
      raw?.answer ??
      "",
  );
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeAiSearchFilters(filters: Record<string, AiSearchFilterValue>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => {
      if (Array.isArray(value)) return [key, { $in: value }];
      if (value && typeof value === "object") return [key, value];
      return [key, { $eq: value }];
    }),
  );
}
