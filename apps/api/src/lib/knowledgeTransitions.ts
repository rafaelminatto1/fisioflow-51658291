import type { KnowledgeCapability } from "./knowledgeCapabilities";

export const EDITORIAL_STATUSES = [
  "draft",
  "triage",
  "clinical_review",
  "changes_requested",
  "rejected",
  "approved",
  "published",
  "review_due",
  "superseded",
  "archived",
] as const;

export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];
export type TransitionAction =
  | "submit"
  | "start_review"
  | "request_changes"
  | "reject"
  | "approve"
  | "publish"
  | "unpublish"
  | "mark_review_due"
  | "reopen"
  | "archive";

export interface TransitionRule {
  from: readonly EditorialStatus[];
  to: EditorialStatus;
  capability: KnowledgeCapability | null;
  requiresReason?: boolean;
}

export const TRANSITION_RULES: Record<TransitionAction, TransitionRule> = {
  submit: { from: ["draft"], to: "triage", capability: null },
  start_review: {
    from: ["triage", "changes_requested"],
    to: "clinical_review",
    capability: "clinical_review",
  },
  request_changes: {
    from: ["clinical_review"],
    to: "changes_requested",
    capability: "clinical_review",
    requiresReason: true,
  },
  reject: {
    from: ["clinical_review"],
    to: "rejected",
    capability: "clinical_review",
    requiresReason: true,
  },
  approve: {
    from: ["clinical_review"],
    to: "approved",
    capability: "clinical_review",
  },
  publish: {
    from: ["approved"],
    to: "published",
    capability: "publish_knowledge",
  },
  unpublish: {
    from: ["published", "review_due"],
    to: "approved",
    capability: "publish_knowledge",
  },
  mark_review_due: {
    from: ["published"],
    to: "review_due",
    capability: "manage_library_policy",
  },
  reopen: {
    from: ["approved", "rejected", "review_due"],
    to: "triage",
    capability: "manage_library",
  },
  archive: {
    from: [
      "draft",
      "triage",
      "clinical_review",
      "changes_requested",
      "rejected",
      "approved",
      "review_due",
      "superseded",
    ],
    to: "archived",
    capability: "manage_library",
  },
};

export type TransitionValidation =
  | { ok: true; rule: TransitionRule }
  | {
      ok: false;
      code:
        | "INVALID_TRANSITION"
        | "FORBIDDEN"
        | "REASON_REQUIRED"
        | "SELF_APPROVAL_FORBIDDEN";
    };

export function validateKnowledgeTransition(input: {
  action: TransitionAction;
  status: EditorialStatus;
  actorId: string;
  submittedBy?: string | null;
  reason?: string | null;
  capabilities: readonly KnowledgeCapability[];
}): TransitionValidation {
  const rule = TRANSITION_RULES[input.action];
  if (!rule.from.includes(input.status)) {
    return { ok: false, code: "INVALID_TRANSITION" };
  }
  if (rule.capability && !input.capabilities.includes(rule.capability)) {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (rule.requiresReason && !input.reason?.trim()) {
    return { ok: false, code: "REASON_REQUIRED" };
  }
  if (input.action === "approve" && input.submittedBy === input.actorId) {
    return { ok: false, code: "SELF_APPROVAL_FORBIDDEN" };
  }
  return { ok: true, rule };
}

export function allowedKnowledgeActions(input: {
  status: EditorialStatus;
  actorId: string;
  submittedBy?: string | null;
  capabilities: readonly KnowledgeCapability[];
}): TransitionAction[] {
  return (Object.keys(TRANSITION_RULES) as TransitionAction[]).filter(
    (action) =>
      validateKnowledgeTransition({ ...input, action, reason: "allowed" }).ok,
  );
}
