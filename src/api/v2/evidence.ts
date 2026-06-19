import { request } from "./base";

export type EvidenceArticle = {
  pmid: string;
  title: string;
  journal?: string;
  pub_date?: string;
  doi?: string;
  abstract?: string;
  study_type?: string;
};

export type EvidenceLink = {
  id: string;
  article_pmid: string;
  title?: string;
  journal?: string;
  pub_date?: string;
  doi?: string;
  evidence_level?: string;
  note?: string;
};

export type Cid10Entry = { code: string; label: string; query: string };

export type CidSuggestion = { code: string; label: string; confidence?: number };

export const evidenceApi = {
  search: (q: string, limit = 10) =>
    request<{ count: number; data: EvidenceArticle[]; cached: boolean }>(
      `/api/evidence/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  links: (targetType: string, targetId: string) =>
    request<{ data: EvidenceLink[] }>(
      `/api/evidence/links?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
    ),

  save: (body: {
    pmid: string;
    targetType: string;
    targetId: string;
    evidenceLevel?: string;
    note?: string;
  }) =>
    request<{ ok: boolean }>("/api/evidence/save", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  removeLink: (id: string) =>
    request<{ ok: boolean }>(`/api/evidence/link/${id}`, { method: "DELETE" }),

  cid10: (code: string) => request<{ data: Cid10Entry }>(`/api/evidence/cid10/${encodeURIComponent(code)}`),

  suggestCid: (text: string) =>
    request<{ data: CidSuggestion[] }>("/api/evidence/cid10/suggest", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};
