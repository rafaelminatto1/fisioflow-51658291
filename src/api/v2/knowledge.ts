import { request } from './base';
import type {
  KnowledgeArticleRow,
  KnowledgeSemanticResultRow,
  KnowledgeAnnotationRow,
  KnowledgeCurationRow,
  KnowledgeAuditRow,
  KnowledgeProfileSummary,
  WikiPage,
  WikiPageFull,
  PaginatedResponse,
} from '@/types/workers';

export const knowledgeApi = {
  listArticles: () => request<{ data: KnowledgeArticleRow[] }>('/api/knowledge/articles'),
  createArticle: (data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/api/knowledge/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateArticle: (articleId: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  syncArticles: (articles: KnowledgeArticleRow[]) =>
    request<{ indexed: number }>('/api/knowledge/articles/sync', {
      method: 'POST',
      body: JSON.stringify({ articles }),
    }),
  indexArticles: () =>
    request<{ indexed: number }>('/api/knowledge/articles/index', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  semanticSearch: (params: { query: string; limit?: number }) =>
    request<{ data: KnowledgeSemanticResultRow[] }>('/api/knowledge/semantic-search', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  listAnnotations: () => request<{ data: KnowledgeAnnotationRow[] }>('/api/knowledge/annotations'),
  upsertAnnotation: (
    articleId: string,
    data: {
      scope: 'organization' | 'user';
      highlights: string[];
      observations: string[];
      status?: string;
      evidence?: string;
    },
  ) =>
    request<{ data: KnowledgeAnnotationRow }>(`/api/knowledge/annotations/${encodeURIComponent(articleId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listCuration: () => request<{ data: KnowledgeCurationRow[] }>('/api/knowledge/curation'),
  updateCuration: (
    articleId: string,
    data: { status: string; notes?: string; assigned_to?: string },
  ) =>
    request<{ data: KnowledgeCurationRow }>(`/api/knowledge/curation/${encodeURIComponent(articleId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listAudit: () => request<{ data: KnowledgeAuditRow[] }>('/api/knowledge/audit'),
  addAuditEntry: (
    data: Omit<KnowledgeAuditRow, 'id' | 'organization_id' | 'created_at'>,
  ) =>
    request<{ data: KnowledgeAuditRow }>('/api/knowledge/audit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProfiles: (ids: string[]) => {
    const qs = new URLSearchParams();
    if (ids.length) qs.set('ids', ids.join(','));
    return request<{ data: Record<string, KnowledgeProfileSummary> }>(`/api/knowledge/profiles${qs.toString() ? `?${qs}` : ''}`);
  },
  listNotes: (articleId: string) =>
    request<{ data: Array<Record<string, unknown>> }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}/notes`),
  addNote: (articleId: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  askArticle: (articleId: string, query: string) =>
    request<{ data: { answer: string; contextUsed?: string } }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}/ask`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  processArticle: (articleId: string, textContent?: string) =>
    request<{ data: { success: boolean } }>(`/api/knowledge/articles/${encodeURIComponent(articleId)}/process`, {
      method: 'POST',
      body: JSON.stringify({ textContent }),
    }),
};

export const wikiApi = {
  list: (params?: { q?: string; category?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return request<PaginatedResponse<WikiPage>>(`/api/wiki${qs ? `?${qs}` : ''}`);
  },

  get: (slug: string) =>
    request<{ data: WikiPageFull }>(`/api/wiki/${slug}`),

  children: (slug: string) =>
    request<{ data: WikiPage[] }>(`/api/wiki/${slug}/children`),

  versions: (slug: string) =>
    request<{ data: unknown[] }>(`/api/wiki/${slug}/versions`),

  create: (data: Omit<WikiPageFull, 'id' | 'slug' | 'updatedAt' | 'createdAt' | 'viewCount' | 'version'> & { comment?: string }) =>
    request<{ data: WikiPageFull }>('/api/wiki', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (slug: string, data: Partial<WikiPageFull> & { comment?: string }) =>
    request<{ data: WikiPageFull }>(`/api/wiki/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (slug: string) =>
    request<{ ok: boolean }>(`/api/wiki/${slug}`, {
      method: 'DELETE',
    }),

  listOrg: (params?: { q?: string; category?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])),
    ).toString();
    return request<{ data: WikiPage[] }>(`/api/wiki/org/list${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) =>
    request<{ data: WikiPageFull }>(`/api/wiki/by-id/${encodeURIComponent(id)}`),

  updateTriage: (updates: Array<{ id: string; triage_order?: number; tags?: string[]; category?: string }>) =>
    request<{ ok: boolean }>('/api/wiki/triage', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    }),

  listCategories: () =>
    request<{ data: unknown[] }>('/api/wiki/categories'),

  createCategory: (data: { name: string; slug?: string; description?: string; icon?: string; color?: string; parent_id?: string; order_index?: number }) =>
    request<{ data: unknown }>('/api/wiki/categories', { method: 'POST', body: JSON.stringify(data) }),

  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`/api/wiki/categories/${id}`, { method: 'DELETE' }),

  listComments: (pageId: string) =>
    request<{ data: unknown[] }>(`/api/wiki/${pageId}/comments`),

  addComment: (pageId: string, data: { content: string; parent_comment_id?: string; block_id?: string; selection_text?: string; selection_start?: number; selection_end?: number }) =>
    request<{ data: unknown }>(`/api/wiki/${pageId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

  resolveComment: (commentId: string) =>
    request<{ ok: boolean }>(`/api/wiki/comments/${commentId}/resolve`, { method: 'PATCH' }),
};
