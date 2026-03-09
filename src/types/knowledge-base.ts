import type { EvidenceTier } from '@/data/knowledgeBase';

export type KnowledgeTimestampLike =
  | string
  | Date
  | {
      toDate?: () => Date;
    };

export type KnowledgeScope = 'organization' | 'user';
export type KnowledgeCurationStatus = 'pending' | 'review' | 'verified' | 'rejected';

export interface KnowledgeAnnotation {
  id: string;
  article_id: string;
  organization_id: string;
  scope: KnowledgeScope;
  user_id?: string;
  highlights: string[];
  observations: string[];
  status?: KnowledgeCurationStatus;
  evidence?: EvidenceTier;
  created_by: string;
  updated_by: string;
  created_at: KnowledgeTimestampLike;
  updated_at: KnowledgeTimestampLike;
}

export interface KnowledgeCuration {
  id: string;
  article_id: string;
  organization_id: string;
  status: KnowledgeCurationStatus;
  notes?: string;
  assigned_to?: string;
  created_by: string;
  updated_by: string;
  created_at: KnowledgeTimestampLike;
  updated_at: KnowledgeTimestampLike;
}

export interface KnowledgeAuditEntry {
  id: string;
  article_id: string;
  organization_id: string;
  actor_id: string;
  action: 'create_annotation' | 'update_annotation' | 'update_curation';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at: KnowledgeTimestampLike;
  context?: Record<string, unknown>;
}

export interface KnowledgeSemanticResult {
  article_id: string;
  score: number;
}
