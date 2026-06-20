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
  initials: string;
  phone: string;
  patientId?: string;
  avatarUrl: string | null;
  presenceLabel: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  tags: { id: string; name: string; color: string }[];
  stage: CrmStageMeta;
  sourceLabel: string;
  campaignLabel: string;
  insuranceLabel: string;
  interestLabel: string;
  firstContactLabel: string;
  ownerLabel: string;
  nextActionTitle: string;
  nextActionBody: string;
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

function readStringMetadata(metadata: Record<string, unknown> | undefined, keys: string[]) {
  if (!metadata) return undefined;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function formatInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPresenceLabel(conversation: Conversation) {
  const lastMessageAt = conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : null;
  if (lastMessageAt && !Number.isNaN(lastMessageAt.getTime())) {
    const elapsedMinutes = (Date.now() - lastMessageAt.getTime()) / 60000;
    if (elapsedMinutes <= 15) return "Ativo agora";
    return `Atualizado em ${formatDateTime(conversation.lastMessageAt)}`;
  }

  if (conversation.status === "resolved" || conversation.status === "closed") {
    return "Conversa encerrada";
  }

  return "Sem atividade recente";
}

function formatLabel(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

export function toCrmConversationViewModel(conversation: Conversation): CrmConversationViewModel {
  const stage = resolveStage(conversation);
  const metadata = conversation.metadata ?? undefined;
  const source = readStringMetadata(metadata, ["source", "leadSource", "origin"]);
  const campaign = readStringMetadata(metadata, ["campaign", "campaignName", "utm_campaign"]);
  const insurance = readStringMetadata(metadata, ["insurance", "convenio", "healthPlan"]);
  const interest = readStringMetadata(metadata, ["interest", "complaint", "serviceInterest"]);
  const nextAction = readStringMetadata(metadata, ["nextAction", "next_action"]);
  const patientId = conversation.patientId ?? undefined;
  const name = conversation.contactName ?? conversation.patientName ?? conversation.id;
  const phone = conversation.contactPhone || "";

  const derivedNextActionTitle =
    stage === "lead"
      ? "Pendente"
      : stage === "contact"
        ? "Aguardando resposta"
        : stage === "evaluation"
          ? "Confirmar avaliação"
          : "Acompanhar tratamento";

  const derivedNextActionBody =
    nextAction ??
    (stage === "lead"
      ? "Qualificar lead e responder a primeira mensagem."
      : stage === "contact"
        ? "Oferecer horários e conduzir para agendamento."
        : stage === "evaluation"
          ? patientId
            ? "Confirmar a avaliação e preparar o primeiro atendimento."
            : "Vincular paciente e confirmar horário da avaliação."
          : "Acompanhar a evolução e a próxima sessão.");

  return {
    id: conversation.id,
    name,
    initials: formatInitials(name),
    phone,
    patientId,
    avatarUrl: null,
    presenceLabel: formatPresenceLabel(conversation),
    lastMessage: conversation.lastMessage ?? "",
    lastMessageAt: conversation.lastMessageAt ?? null,
    unreadCount: conversation.unreadCount ?? 0,
    tags: (conversation.tags ?? []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color ?? "#6b7280",
    })),
    stage: STAGE_META[stage],
    sourceLabel: formatLabel(source, "Não informado"),
    campaignLabel: formatLabel(campaign, "Não informado"),
    insuranceLabel: formatLabel(insurance, "Não informado"),
    interestLabel: formatLabel(interest, "Não informado"),
    firstContactLabel: formatDateTime(conversation.createdAt),
    ownerLabel: conversation.assignedToName ?? "Não atribuído",
    nextActionTitle: nextAction ? "Próxima ação" : derivedNextActionTitle,
    nextActionBody: derivedNextActionBody,
    metadata,
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
