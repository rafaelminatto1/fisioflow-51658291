import { knowledgeApi } from '@/api/v2/knowledge';
import type {
  KnowledgeAnnotation,
  KnowledgeAuditEntry,
  KnowledgeCuration,
  KnowledgeCurationStatus,
  KnowledgeScope,
  KnowledgeSemanticResult,
} from '@/types/knowledge-base';
import type { EvidenceTier, KnowledgeArticle } from '@/data/knowledgeBase';

export const knowledgeBaseService = {
  async listArticles(_organizationId: string): Promise<KnowledgeArticle[]> {
    const res = await knowledgeApi.listArticles();
    return (res.data ?? []) as KnowledgeArticle[];
  },

  async createArticle(data: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
    const res = await knowledgeApi.createArticle(data as Record<string, unknown>);
    return res.data as unknown as KnowledgeArticle;
  },

  async updateArticle(articleId: string, data: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
    const res = await knowledgeApi.updateArticle(articleId, data as Record<string, unknown>);
    return res.data as unknown as KnowledgeArticle;
  },

  async deleteArticle(articleId: string): Promise<void> {
    await knowledgeApi.deleteArticle(articleId);
  },

  async listAnnotations(_organizationId: string, _userId?: string): Promise<KnowledgeAnnotation[]> {
    const res = await knowledgeApi.listAnnotations();
    return (res.data ?? []) as KnowledgeAnnotation[];
  },

  async upsertAnnotation(params: {
    organizationId: string;
    userId: string;
    articleId: string;
    scope: KnowledgeScope;
    highlights: string[];
    observations: string[];
    status?: KnowledgeCurationStatus;
    evidence?: EvidenceTier;
  }): Promise<void> {
    await knowledgeApi.upsertAnnotation(params.articleId, {
      scope: params.scope,
      highlights: params.highlights,
      observations: params.observations,
      status: params.status,
      evidence: params.evidence,
    });
  },

  async listCuration(_organizationId: string): Promise<KnowledgeCuration[]> {
    const res = await knowledgeApi.listCuration();
    return (res.data ?? []) as KnowledgeCuration[];
  },

  async updateCuration(params: {
    organizationId: string;
    userId: string;
    articleId: string;
    status: KnowledgeCurationStatus;
    notes?: string;
  }): Promise<void> {
    await knowledgeApi.updateCuration(params.articleId, {
      status: params.status,
      notes: params.notes,
    });
  },

  async addAuditEntry(entry: Omit<KnowledgeAuditEntry, 'id' | 'created_at'>): Promise<void> {
    await knowledgeApi.addAuditEntry(entry);
  },

  async listAudit(_organizationId: string): Promise<KnowledgeAuditEntry[]> {
    const res = await knowledgeApi.listAudit();
    return (res.data ?? []) as KnowledgeAuditEntry[];
  },

  async getProfilesByIds(ids: string[]): Promise<Record<string, { full_name?: string; avatar_url?: string }>> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return {};
    const res = await knowledgeApi.getProfiles(uniqueIds);
    return res.data ?? {};
  },

  async semanticSearch(params: {
    query: string;
    organizationId: string;
    limit?: number;
  }): Promise<KnowledgeSemanticResult[]> {
    if (!params.query.trim()) return [];
    const res = await knowledgeApi.semanticSearch({
      query: params.query,
      limit: params.limit || 20,
    });
    return (res.data ?? []) as KnowledgeSemanticResult[];
  },

  async indexKnowledgeArticles(_params: { organizationId: string }): Promise<{ indexed: number }> {
    const res = await knowledgeApi.indexArticles();
    return { indexed: res.indexed ?? 0 };
  },

  async syncArticles(params: {
    organizationId: string;
    userId: string;
    articles: KnowledgeArticle[];
  }): Promise<void> {
    await knowledgeApi.syncArticles(params.articles as unknown as Parameters<typeof knowledgeApi.syncArticles>[0]);
  },
};
