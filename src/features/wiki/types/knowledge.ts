export type EvidenceTier =
  | 'CPG' // Clinical Practice Guideline
  | 'Consensus'
  | 'SystematicReview'
  | 'RCT' // Randomized Controlled Trial
  | 'Protocol'
  | 'ExpertOpinion';

export type KnowledgeStatus = 'verified' | 'pending' | 'draft' | 'archived';

export type KnowledgeGroup = 'Ortopedia' | 'Esportiva' | 'Pós-Operatório' | 'Preventiva' | 'Geriatria' | 'Neurologia';

export interface KnowledgeAuthor {
  name: string;
  affiliation?: string;
}

export interface KnowledgeMetadata {
  year: number;
  authors: KnowledgeAuthor[];
  journal?: string;
  doi?: string;
  publisher?: string;
}

export interface KnowledgeArtifact {
  id: string;
  organizationId: string;
  title: string;
  type: 'pdf' | 'link' | 'video' | 'internal_doc';
  url: string; // Storage URL or external link
  
  // Categorization
  group: KnowledgeGroup;
  subgroup: string; // e.g., 'Joelho', 'LCA', 'Ombro'
  tags: string[];
  
  // Clinical Value
  evidenceLevel: EvidenceTier;
  status: KnowledgeStatus;
  
  // AI & Processing
  summary?: string;
  keyFindings?: string[];
  clinicalImplications?: string[];
  vectorStatus?: 'pending' | 'indexing' | 'completed' | 'error';
  
  // Metadata
  metadata: KnowledgeMetadata;
  
  // Stats
  viewCount: number;
  citationCount?: number; // Internal or external citations
  
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  createdBy: string;
}

export interface KnowledgeNote {
  id: string;
  artifactId: string;
  userId: string;
  content: string; // Markdown
  pageRef?: number; // If PDF
  highlightColor?: string;
  createdAt: any;
}
