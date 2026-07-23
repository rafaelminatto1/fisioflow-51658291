import { request } from "./base";

export type AiSearchSource = {
  id: string;
  filename?: string;
  content?: string;
  score?: number;
};

export type AskResponse = {
  answered: boolean;
  answer: string | null;
  sources: AiSearchSource[];
  topScore?: number;
};

export type ReindexResponse = {
  success: boolean;
  enqueued: Record<string, number>;
};

export type ReindexStatus = { errors: number; pending: number; errorKeys: string[] };

export const aiSearchApi = {
  ask: (query: string) =>
    request<AskResponse>("/api/ai-search/ask", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  /** Enfileira a reindexação assíncrona da base (protocolos, exercícios, wiki). */
  reindex: (types?: Array<"protocols" | "exercises" | "wiki">) =>
    request<ReindexResponse>("/api/ai-search/reindex", {
      method: "POST",
      body: JSON.stringify(types ? { types } : {}),
    }),
  reindexStatus: () => request<ReindexStatus>("/api/ai-search/reindex/status", { method: "GET" }),
};
