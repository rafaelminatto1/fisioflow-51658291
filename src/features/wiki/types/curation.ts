export const EDITORIAL_CAPABILITIES = [
  "manage_library",
  "clinical_review",
  "publish_knowledge",
  "manage_library_policy",
] as const;

export type EditorialCapability = (typeof EDITORIAL_CAPABILITIES)[number];

export type EditorialStatus =
  | "draft"
  | "triage"
  | "clinical_review"
  | "changes_requested"
  | "rejected"
  | "approved"
  | "published"
  | "review_due"
  | "superseded"
  | "archived";

export type TechnicalStatus =
  | "not_started"
  | "pending"
  | "queued"
  | "fetching"
  | "processing"
  | "imported"
  | "indexed"
  | "suggested"
  | "failed"
  | "cancelled";

export type CurationAction =
  | "submit"
  | "start_review"
  | "request_changes"
  | "reject"
  | "approve"
  | "publish"
  | "unpublish"
  | "reopen"
  | "archive";

export interface CurationPerson {
  id: string;
  name: string;
}

export interface CurationProvenance {
  sourceType?: string;
  sourceId?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  doi?: string;
  pmid?: string;
  license?: string;
}

export interface CurationQueueItem {
  id: string;
  versionId: string;
  rowVersion: number;
  title: string;
  kind: string;
  editorialStatus: EditorialStatus;
  technicalStatus?: TechnicalStatus | string;
  assignee?: CurationPerson | null;
  priority?: string | null;
  dueAt?: string | null;
  validUntil?: string | null;
  provenance?: CurationProvenance | null;
  allowedActions: CurationAction[];
}

export interface CurationReview {
  reviewer?: CurationPerson | null;
  submittedBy?: CurationPerson | null;
  approvedBy?: CurationPerson | null;
  decision?: string | null;
  reason?: string | null;
  reviewedAt?: string | null;
  validUntil?: string | null;
}

export interface CurationItemDetail extends CurationQueueItem {
  summary?: string | null;
  limitations?: string | null;
  sources?: CurationProvenance[];
  review?: CurationReview | null;
  reviews?: CurationReview[];
  assignments?: CurationAssignment[];
}

export interface CurationAssignment {
  id?: string;
  assignee: CurationPerson;
  assignmentType?: "owner" | "reviewer" | string;
  priority?: string | null;
  dueAt?: string | null;
}

export interface CurationCounts {
  inbox?: number;
  triage?: number;
  clinical_review?: number;
  approved?: number;
  review_due?: number;
  technical_failures?: number;
  archived?: number;
  [key: string]: number | undefined;
}

export interface CurationQueueFilters {
  status?: string;
  assignee?: string;
  priority?: string;
  validity?: string;
  kind?: string;
  technicalStatus?: string;
  q?: string;
}

export interface CurationQueuePage {
  data: CurationQueueItem[];
  meta: {
    nextCursor?: string | null;
    counts: CurationCounts;
    requestId?: string;
  };
}

export interface TransitionInput {
  item: CurationQueueItem;
  action: CurationAction;
  reason?: string;
  validUntil?: string;
}

export interface AssignmentInput {
  item: CurationQueueItem;
  assigneeId?: string | null;
  priority?: string | null;
  dueAt?: string | null;
}
