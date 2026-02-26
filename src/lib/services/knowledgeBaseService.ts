import {
  db,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
} from '@/integrations/firebase/app';
import { cleanForFirestore } from '@/utils/firestoreData';
import type {
  KnowledgeAnnotation,
  KnowledgeAuditEntry,
  KnowledgeCuration,
  KnowledgeCurationStatus,
  KnowledgeScope,
  KnowledgeSemanticResult,
} from '@/types/knowledge-base';
import type { EvidenceTier, KnowledgeArticle } from '@/data/knowledgeBase';
import { callFunction } from '@/integrations/firebase/functions';

const KNOWLEDGE_ANNOTATIONS = 'knowledge_annotations';
const KNOWLEDGE_CURATION = 'knowledge_curation';
const KNOWLEDGE_AUDIT = 'knowledge_audit';
const KNOWLEDGE_ARTICLES = 'knowledge_articles';

function buildAnnotationId(
  organizationId: string,
  articleId: string,
  scope: KnowledgeScope,
  userId?: string
) {
  const suffix = scope === 'user' ? userId || 'unknown' : 'org';
  return `${organizationId}_${scope}_${suffix}_${articleId}`;
}

function buildCurationId(organizationId: string, articleId: string) {
  return `${organizationId}_${articleId}`;
}

export const knowledgeBaseService = {
  async listArticles(organizationId: string): Promise<KnowledgeArticle[]> {
    const q = query(
      collection(db, KNOWLEDGE_ARTICLES),
      where('organization_id', '==', organizationId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      return {
        id: String(data.article_id || docSnap.id),
        title: String(data.title || ''),
        group: data.group as KnowledgeArticle['group'],
        subgroup: String(data.subgroup || ''),
        focus: Array.isArray(data.focus) ? (data.focus as string[]) : [],
        evidence: data.evidence as KnowledgeArticle['evidence'],
        year: data.year ? Number(data.year) : undefined,
        source: data.source ? String(data.source) : undefined,
        url: data.url ? String(data.url) : undefined,
        status: (data.status as KnowledgeArticle['status']) || 'pending',
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
        highlights: Array.isArray(data.highlights) ? (data.highlights as string[]) : [],
        observations: Array.isArray(data.observations) ? (data.observations as string[]) : [],
        keyQuestions: Array.isArray(data.keyQuestions) ? (data.keyQuestions as string[]) : [],
      } as KnowledgeArticle;
    });
  },

  async listAnnotations(organizationId: string, userId?: string): Promise<KnowledgeAnnotation[]> {
    const annotations: KnowledgeAnnotation[] = [];

    const orgQuery = query(
      collection(db, KNOWLEDGE_ANNOTATIONS),
      where('organization_id', '==', organizationId),
      where('scope', '==', 'organization')
    );
    const orgSnapshot = await getDocs(orgQuery);
    orgSnapshot.forEach((docSnap) => {
      annotations.push({ id: docSnap.id, ...(docSnap.data() as Omit<KnowledgeAnnotation, 'id'>) });
    });

    if (userId) {
      const userQuery = query(
        collection(db, KNOWLEDGE_ANNOTATIONS),
        where('organization_id', '==', organizationId),
        where('scope', '==', 'user'),
        where('user_id', '==', userId)
      );
      const userSnapshot = await getDocs(userQuery);
      userSnapshot.forEach((docSnap) => {
        annotations.push({ id: docSnap.id, ...(docSnap.data() as Omit<KnowledgeAnnotation, 'id'>) });
      });
    }

    return annotations;
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
    const docId = buildAnnotationId(
      params.organizationId,
      params.articleId,
      params.scope,
      params.scope === 'user' ? params.userId : undefined
    );
    const ref = doc(db, KNOWLEDGE_ANNOTATIONS, docId);

    const payload = cleanForFirestore({
      article_id: params.articleId,
      organization_id: params.organizationId,
      scope: params.scope,
      user_id: params.scope === 'user' ? params.userId : null,
      highlights: params.highlights,
      observations: params.observations,
      status: params.status,
      evidence: params.evidence,
      updated_by: params.userId,
      updated_at: serverTimestamp(),
    });

    await setDoc(
      ref,
      {
        ...payload,
        created_by: params.userId,
        created_at: serverTimestamp(),
      },
      { merge: true }
    );

    if (params.scope === 'organization') {
      const articleRef = doc(db, KNOWLEDGE_ARTICLES, `${params.organizationId}_${params.articleId}`);
      await setDoc(
        articleRef,
        cleanForFirestore({
          highlights: params.highlights,
          observations: params.observations,
          updated_by: params.userId,
          updated_at: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  },

  async listCuration(organizationId: string): Promise<KnowledgeCuration[]> {
    const curationQuery = query(
      collection(db, KNOWLEDGE_CURATION),
      where('organization_id', '==', organizationId)
    );
    const snapshot = await getDocs(curationQuery);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<KnowledgeCuration, 'id'>),
    }));
  },

  async updateCuration(params: {
    organizationId: string;
    userId: string;
    articleId: string;
    status: KnowledgeCurationStatus;
    notes?: string;
  }): Promise<void> {
    const docId = buildCurationId(params.organizationId, params.articleId);
    const ref = doc(db, KNOWLEDGE_CURATION, docId);

    await setDoc(
      ref,
      cleanForFirestore({
        article_id: params.articleId,
        organization_id: params.organizationId,
        status: params.status,
        notes: params.notes || null,
        updated_by: params.userId,
        updated_at: serverTimestamp(),
        created_by: params.userId,
        created_at: serverTimestamp(),
      }),
      { merge: true }
    );
  },

  async addAuditEntry(entry: Omit<KnowledgeAuditEntry, 'id' | 'created_at'>): Promise<void> {
    const ref = collection(db, KNOWLEDGE_AUDIT);
    await addDoc(ref, cleanForFirestore({
      ...entry,
      created_at: serverTimestamp(),
    }));
  },

  async listAudit(organizationId: string): Promise<KnowledgeAuditEntry[]> {
    const auditQuery = query(
      collection(db, KNOWLEDGE_AUDIT),
      where('organization_id', '==', organizationId)
    );
    const snapshot = await getDocs(auditQuery);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<KnowledgeAuditEntry, 'id'>),
    }));
  },

  async getProfilesByIds(ids: string[]): Promise<Record<string, { full_name?: string; avatar_url?: string }>> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    const profileMap: Record<string, { full_name?: string; avatar_url?: string }> = {};

    await Promise.all(
      uniqueIds.map(async (id) => {
        const snap = await getDoc(doc(db, 'profiles', id));
        if (snap.exists()) {
          const data = snap.data() as { full_name?: string; avatar_url?: string };
          profileMap[id] = { full_name: data.full_name, avatar_url: data.avatar_url };
        }
      })
    );

    return profileMap;
  },

  async semanticSearch(params: {
    query: string;
    organizationId: string;
    limit?: number;
  }): Promise<KnowledgeSemanticResult[]> {
    if (!params.query.trim()) return [];
    return callFunction<typeof params, KnowledgeSemanticResult[]>('semanticSearchKnowledge', {
      query: params.query,
      organizationId: params.organizationId,
      limit: params.limit || 20,
    });
  },

  async indexKnowledgeArticles(params: { organizationId: string }): Promise<{ indexed: number }> {
    return callFunction<typeof params, { indexed: number }>('indexKnowledgeArticles', params);
  },

  async syncArticles(params: {
    organizationId: string;
    userId: string;
    articles: KnowledgeArticle[];
  }): Promise<void> {
    const batch = writeBatch(db);
    params.articles.forEach((article) => {
      const ref = doc(db, KNOWLEDGE_ARTICLES, `${params.organizationId}_${article.id}`);
      batch.set(
        ref,
        cleanForFirestore({
          article_id: article.id,
          organization_id: params.organizationId,
          title: article.title,
          group: article.group,
          subgroup: article.subgroup,
          focus: article.focus,
          evidence: article.evidence,
          year: article.year || null,
          source: article.source || null,
          url: article.url || null,
          tags: article.tags,
          status: article.status,
          highlights: article.highlights,
          observations: article.observations,
          keyQuestions: article.keyQuestions,
          created_by: params.userId,
          updated_by: params.userId,
          updated_at: serverTimestamp(),
          created_at: serverTimestamp(),
        }),
        { merge: true }
      );
    });
    await batch.commit();
  },
};
