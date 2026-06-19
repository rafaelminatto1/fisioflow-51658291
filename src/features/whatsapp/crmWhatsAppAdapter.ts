import type { QuickReply } from "@/services/whatsapp-api";
import type { Conversation } from "@/services/whatsapp-api";

export type CrmStage = "lead" | "contact" | "evaluation" | "treatment";

export const CRM_PIPELINE_ORDER: CrmStage[] = ["lead", "contact", "evaluation", "treatment"];

export interface CrmStageMeta {
  key: CrmStage;
  label: string;
  chipClassName: string;
  dotClassName: string;
  progressIndex: number;
}

export interface CrmConversationViewModel {
  id: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  tags: { id: string; name: string; color: string }[];
  stage: CrmStageMeta;
  metadata: Record<string, unknown> | undefined;
}

export interface CrmQuickReplyViewModel {
  id: string;
  label: string;
  content: string;
  prominent: boolean;
}

const STAGE_META: Record<CrmStage, CrmStageMeta> = {
  lead: {
    key: "lead",
    label: "Lead",
    chipClassName: "bg-slate-100 text-slate-700",
    dotClassName: "bg-slate-400",
    progressIndex: 0,
  },
  contact: {
    key: "contact",
    label: "Contato",
    chipClassName: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-400",
    progressIndex: 1,
  },
  evaluation: {
    key: "evaluation",
    label: "Avaliação",
    chipClassName: "bg-amber-100 text-amber-700",
    dotClassName: "bg-amber-400",
    progressIndex: 2,
  },
  treatment: {
    key: "treatment",
    label: "Tratamento",
    chipClassName: "bg-emerald-100 text-emerald-700",
    dotClassName: "bg-emerald-400",
    progressIndex: 3,
  },
};

export function getStageMeta(stage: CrmStage): CrmStageMeta {
  return STAGE_META[stage];
}

function resolveStage(conversation: Conversation): CrmStage {
  const meta = conversation.metadata;
  if (meta && typeof meta === "object" && "stage" in meta) {
    const raw = (meta as Record<string, unknown>).stage;
    if (typeof raw === "string" && raw in STAGE_META) return raw as CrmStage;
  }
  return "lead";
}

export function toCrmConversationViewModel(conversation: Conversation): CrmConversationViewModel {
  const stage = resolveStage(conversation);
  return {
    id: conversation.id,
    name: conversation.contactName ?? conversation.id,
    avatarUrl: null,
    lastMessage: conversation.lastMessage ?? "",
    lastMessageAt: conversation.lastMessageAt ?? null,
    unreadCount: conversation.unreadCount ?? 0,
    tags: (conversation.tags ?? []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color ?? "#6b7280",
    })),
    stage: STAGE_META[stage],
    metadata: conversation.metadata ?? undefined,
  };
}

export function toCrmQuickReplies(quickReplies: QuickReply[]): CrmQuickReplyViewModel[] {
  return quickReplies.slice(0, 4).map((qr, index) => ({
    id: qr.id,
    label: qr.name,
    content: qr.content,
    prominent: index === 0,
  }));
}
