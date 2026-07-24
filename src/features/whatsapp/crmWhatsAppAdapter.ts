import type { QuickReply } from "@/services/whatsapp-api";
import type { Conversation } from "@/services/whatsapp-api";
import { onlyDigits, formatBrazilPhone } from "@/lib/phone";

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
  channel: "whatsapp" | "instagram" | "webchat";
  temperature: "quente" | "morno" | "frio";
  name: string;
  initials: string;
  phone: string;
  patientId?: string;
  avatarUrl: string | null;
  avatarGradient: string;
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
  leadScore?: number;
  instagramHandle?: string;
  hoursSinceLastMessage: number;
  isCoolingDown: boolean;
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
    label: "Novo lead",
    chipClassName: "bg-[hsl(264_60%_94%)] text-[hsl(264_50%_42%)]",
    dotClassName: "bg-[hsl(264_50%_50%)]",
    progressIndex: 0,
  },
  contact: {
    key: "contact",
    label: "Aguardando",
    chipClassName: "bg-[hsl(28_92%_93%)] text-[hsl(25_70%_34%)]",
    dotClassName: "bg-[hsl(28_70%_48%)]",
    progressIndex: 1,
  },
  evaluation: {
    key: "evaluation",
    label: "Avaliação",
    chipClassName: "bg-[hsl(211_100%_93%)] text-[hsl(211_100%_35%)]",
    dotClassName: "bg-[hsl(211_100%_50%)]",
    progressIndex: 2,
  },
  treatment: {
    key: "treatment",
    label: "Em tratamento",
    chipClassName: "bg-[hsl(142_60%_92%)] text-[hsl(142_55%_28%)]",
    dotClassName: "bg-[hsl(142_55%_40%)]",
    progressIndex: 3,
  },
};

export function getStageMeta(stage: CrmStage): CrmStageMeta {
  return STAGE_META[stage];
}

// Gradientes de avatar (135deg) extraídos do design CRM · WhatsApp.
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,hsl(264 55% 62%),hsl(264 55% 48%))",
  "linear-gradient(135deg,hsl(211 100% 60%),hsl(211 100% 42%))",
  "linear-gradient(135deg,hsl(28 85% 58%),hsl(28 85% 46%))",
  "linear-gradient(135deg,hsl(340 70% 60%),hsl(340 70% 48%))",
  "linear-gradient(135deg,hsl(180 50% 48%),hsl(180 50% 36%))",
  "linear-gradient(135deg,hsl(142 50% 50%),hsl(142 50% 38%))",
  "linear-gradient(135deg,hsl(220 12% 58%),hsl(220 12% 44%))",
];

export function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
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

  // Telefone só faz sentido no WhatsApp. Webchat usa "web:uuid" e Instagram usa
  // o IGSID — não devem ser exibidos como número de telefone.
  const channelValue = conversation.channel ?? "whatsapp";
  const phoneDigits = channelValue === "whatsapp" ? onlyDigits(phone) : "";
  const phoneLabel = phoneDigits ? formatBrazilPhone(phoneDigits) : "";

  const lastMsgTime = conversation.lastMessageAt ? new Date(conversation.lastMessageAt).getTime() : 0;
  const hoursSinceLastMessage = lastMsgTime > 0 ? Math.round((Date.now() - lastMsgTime) / 3600000) : 0;
  const isCoolingDown =
    hoursSinceLastMessage >= 24 &&
    conversation.status !== "resolved" &&
    conversation.status !== "closed";

  const instagramHandle =
    channelValue === "instagram"
      ? readStringMetadata(metadata, ["username", "authorUsername", "instagramHandle"]) ||
        (name.startsWith("@") ? name : `@${name.toLowerCase().replace(/\s+/g, ".")}`)
      : undefined;

  return {
    id: conversation.id,
    channel: channelValue,
    temperature: conversation.temperature ?? "morno",
    name,
    initials: formatInitials(name),
    phone,
    phoneDigits,
    phoneLabel,
    patientId,
    avatarUrl: conversation.avatarUrl ?? null,
    avatarGradient: getAvatarGradient(phone || name || conversation.id),
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
    leadScore:
      typeof conversation.leadScore === "number"
        ? conversation.leadScore
        : typeof (metadata?.leadScore as number) === "number"
          ? (metadata?.leadScore as number)
          : undefined,
    instagramHandle,
    hoursSinceLastMessage,
    isCoolingDown,
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
