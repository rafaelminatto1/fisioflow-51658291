import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  CalendarPlus,
  Camera,
  CheckCheck,
  ChevronDown,
  Clock3,
  Copy,
  Edit3,
  Filter,
  Flame,
  Globe,
  ListTodo,
  MessageCircle,
  MessageCirclePlus,
  MessageSquarePlus,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  Reply,
  Search,
  Send,
  Settings,
  Smile,
  StickyNote,
  Trash2,
  UserPlus,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskQuickCreateModal } from "@/components/tarefas/v2/TaskQuickCreateModal";
import {
  addTags,
  deleteConversation,
  deleteMessage,
  fetchCrmSettings,
  fetchQuickReplies,
  fetchTags,
  findOrCreateConversation,
  markConversationRead,
  uploadAttachment,
  markConversationUnread,
  muteConversation,
  pinConversation,
  removeTag,
  resolveContact,
  updateMessage,
  type FunnelStage,
  type Message,
  type QuickReply,
  type Tag,
} from "@/services/whatsapp-api";
import { useWhatsAppConversation, useWhatsAppInbox } from "@/hooks/useWhatsApp";
import {
  CRM_PIPELINE_ORDER,
  getStageMeta,
  toCrmConversationViewModel,
  toCrmQuickReplies,
  type CrmQuickReplyViewModel,
  type CrmStage,
  type CrmStageMeta,
} from "@/features/whatsapp/crmWhatsAppAdapter";
import { cn } from "@/lib/utils";
import {
  isWhatsAppWindowOpen,
  REENGAGEMENT_TEMPLATE_NAME,
  REENGAGEMENT_TEMPLATE_LANGUAGE,
  REENGAGEMENT_TEMPLATE_TEXT,
} from "@/lib/whatsappWindow";
import { onlyDigits, looksLikePhone, canonicalBrazilPhone, formatBrazilPhone } from "@/lib/phone";

type PipelineFilter = "all" | "lead" | "contact" | "evaluation" | "treatment";

const PIPELINE_DEFAULT_LABELS: Record<PipelineFilter, string> = {
  all: "Todos",
  lead: "Novos leads",
  contact: "Aguardando",
  evaluation: "Avaliação",
  treatment: "Em tratamento",
};

const PROGRESS_DEFAULT_LABELS = ["Lead", "Contato", "Avaliação", "Tratamento", "Alta"];
const PROGRESS_STAGE_KEYS = ["lead", "contact", "evaluation", "treatment", "alta"] as const;

// Resolve rótulo + estilo de um estágio a partir da config do funil (organizations.settings.crm_whatsapp.funnel).
// Sem override → usa as classes Tailwind padrão do STAGE_META.
type StageView = {
  label: string;
  chipClassName?: string;
  dotClassName?: string;
  chipStyle?: CSSProperties;
  dotStyle?: CSSProperties;
};

function resolveStageView(meta: CrmStageMeta, funnelMap: Map<string, FunnelStage>): StageView {
  const override = funnelMap.get(meta.key);
  if (override?.color) {
    return {
      label: override.label || meta.label,
      chipStyle: { backgroundColor: `hsl(${override.color} / 0.16)`, color: `hsl(${override.color})` },
      dotStyle: { backgroundColor: `hsl(${override.color})` },
    };
  }
  return { label: override?.label || meta.label, chipClassName: meta.chipClassName, dotClassName: meta.dotClassName };
}

function StageChip({
  view,
  uppercase,
  className,
}: {
  view: StageView;
  uppercase?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full", view.chipClassName, className)}
      style={view.chipStyle}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", view.dotClassName)} style={view.dotStyle} />
      {uppercase ? view.label.toUpperCase() : view.label}
    </span>
  );
}

const QUICK_REPLY_FALLBACKS: Array<{ label: string; content: string }> = [
  {
    label: "Horários disponíveis",
    content: "Tenho horários disponíveis esta semana pela manhã e à tarde. Prefere qual período?",
  },
  {
    label: "Endereço",
    content: "Estamos na Mooca. Se quiser, eu já te envio o endereço completo e a localização.",
  },
  {
    label: "Tabela de valores",
    content: "Posso te passar os valores e as opções de atendimento conforme o seu convênio ou particular.",
  },
  {
    label: "Agendar avaliação",
    content: "Posso deixar sua avaliação reservada. Me diga se prefere manhã ou tarde.",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (isRecord(content)) {
    if (typeof content.text === "string") return content.text;
    if (typeof content.body === "string") return content.body;
  }
  return "";
}

function getMessageMediaUrl(message: Message): string | null {
  if (typeof message.mediaUrl === "string" && message.mediaUrl.trim()) return message.mediaUrl;
  if (isRecord(message.metadata) && typeof message.metadata.mediaUrl === "string" && message.metadata.mediaUrl.trim()) {
    return message.metadata.mediaUrl;
  }
  if (isRecord(message.content)) {
    if (typeof message.content.url === "string" && message.content.url.trim()) return message.content.url;
    if (typeof message.content.link === "string" && message.content.link.trim()) return message.content.link;
  }
  return null;
}

function getMessageTimeLabel(timestamp?: string) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getMessageDateLabel(timestamp?: string) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const today = getDayKey(now);
  const yesterday = getDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const key = getDayKey(date);
  if (key === today) return "Hoje";
  if (key === yesterday) return "Ontem";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function buildQuotedMessageText(message: Message) {
  const text = getMessageText(message.content).trim();
  const time = getMessageTimeLabel(message.timestamp);
  return [time ? `Mensagem ${time}:` : "Mensagem:", text ? `"${text}"` : "[mensagem sem texto]"].join("\n");
}

const ContactAvatar = memo(function ContactAvatar({
  name,
  avatarUrl,
  avatarGradient,
  initials,
  className,
  fallbackClassName,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarGradient: string;
  initials: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} className="object-cover" /> : null}
      <AvatarFallback
        className={cn("text-white", fallbackClassName)}
        style={{ backgroundImage: avatarGradient }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
});

function buildQuickReplies(allQuickReplies: QuickReply[]): CrmQuickReplyViewModel[] {
  const mapped = toCrmQuickReplies(allQuickReplies);
  if (mapped.length === 4) return mapped;

  const existingLabels = new Set(mapped.map((item) => item.label.toLowerCase()));
  const fallbacks = QUICK_REPLY_FALLBACKS.filter(
    (item) => !existingLabels.has(item.label.toLowerCase()),
  ).map((item, index) => ({
    id: `fallback-${index}`,
    label: item.label,
    content: item.content,
    prominent: mapped.length === 0 && index === 0,
  }));

  return [...mapped, ...fallbacks].slice(0, 4);
}

const CHANNEL_META: Record<
  "whatsapp" | "instagram" | "webchat",
  { icon: typeof MessageCircle; className: string; label: string }
> = {
  whatsapp: { icon: MessageCircle, className: "bg-[hsl(142_70%_42%)]", label: "WhatsApp" },
  instagram: {
    icon: Camera,
    className: "bg-gradient-to-br from-[hsl(330_75%_55%)] to-[hsl(28_85%_55%)]",
    label: "Instagram",
  },
  webchat: { icon: Globe, className: "bg-[hsl(211_100%_50%)]", label: "Chat do site" },
};

const ChannelBadge = memo(function ChannelBadge({
  channel,
}: {
  channel: "whatsapp" | "instagram" | "webchat";
}) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.whatsapp;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-card",
        meta.className,
      )}
      title={meta.label}
      aria-label={meta.label}
    >
      <Icon className="h-2.5 w-2.5 text-white" />
    </span>
  );
});

type CrmConversationViewModel = ReturnType<typeof toCrmConversationViewModel>;

const ConversationCard = memo(function ConversationCard({
  item,
  isSelected,
  isNew,
  funnelMap,
  onSelect,
  onContextMenu,
}: {
  item: CrmConversationViewModel;
  isSelected: boolean;
  isNew?: boolean;
  funnelMap: Map<string, FunnelStage>;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, item.id);
      }}
      className={cn(
        "relative flex w-full gap-3 border-b border-border/60 px-3.5 py-3 text-left transition-colors hover:bg-muted/40",
        isSelected && "bg-primary/[0.07]",
        isNew && "animate-pulse bg-green-500/5",
      )}
    >
      {isSelected && (
        <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
      )}
      <div className="relative shrink-0">
        <ContactAvatar
          name={item.name}
          avatarUrl={item.channel !== "webchat" ? item.avatarUrl : null}
          avatarGradient={item.avatarGradient}
          initials={item.initials}
          className="h-[42px] w-[42px]"
          fallbackClassName="text-sm font-extrabold"
        />
        <ChannelBadge channel={item.channel} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-bold">{item.name}</span>
          {item.temperature === "quente" && (
            <Flame className="h-3 w-3 shrink-0 text-orange-500" aria-label="Lead quente" />
          )}
          <span className="ml-auto shrink-0 text-[10px] font-semibold text-muted-foreground">
            {item.displayTime}
          </span>
        </div>
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground",
            item.unreadCount > 0 && "font-semibold text-foreground",
          )}
        >
          {item.previewDirection === "outbound" && (
            <CheckCheck className="h-[13px] w-[13px] shrink-0 text-sky-500" />
          )}
          <span className="truncate">{item.preview}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <StageChip
            view={resolveStageView(item.stage, funnelMap)}
            uppercase
            className="px-2 py-0.5 text-[9px] font-extrabold tracking-[0.03em]"
          />
        </div>
      </div>
      {item.unreadCount > 0 && (
        <div className="self-center rounded-full bg-[hsl(142_70%_42%)] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
          {item.unreadCount}
        </div>
      )}
    </button>
  );
});

function MessageBubble({
  message,
  isOutbound,
  isTemplate,
  isImage,
  mediaUrl,
  text,
  timeLabel,
  isReplying,
  onContextMenu,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
}: {
  message: Message;
  isOutbound: boolean;
  isTemplate: boolean;
  isImage: boolean;
  mediaUrl: string | null;
  text: string;
  timeLabel: string;
  isReplying: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
}) {
  return (
    <div
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      className={cn(
        "relative max-w-[64%] rounded-xl px-3 py-2 text-[13px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,0.06)]",
        isOutbound
          ? isTemplate
            ? "ml-auto rounded-tr-[3px] border border-[hsl(142_50%_75%)] bg-white"
            : "ml-auto rounded-tr-[3px] bg-[hsl(142_65%_88%)]"
          : "rounded-tl-[3px] bg-white",
        isReplying && "ring-2 ring-primary/35",
      )}
    >
      {isTemplate && (
        <div className="mb-1 flex items-center gap-1 text-[9px] font-extrabold tracking-[0.04em] text-[hsl(142_55%_32%)]">
          <Zap className="h-[11px] w-[11px]" />
          RESPOSTA RÁPIDA
          {message.templateName ? ` · ${message.templateName}` : ""}
        </div>
      )}
      {message.editedAt && (
        <div className="mb-1 text-[9px] font-semibold text-muted-foreground/70">editada</div>
      )}
      {isImage && mediaUrl ? (
        <div className="space-y-2">
          <img
            src={mediaUrl}
            alt={text || "Imagem recebida"}
            className="max-h-[280px] w-full rounded-lg object-cover"
            loading="lazy"
          />
          {text ? <div>{text}</div> : null}
        </div>
      ) : isImage ? (
        <div className="space-y-2">
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/35 px-3 py-6 text-center text-xs font-semibold text-muted-foreground">
            Imagem recebida
          </div>
          {text ? <div>{text}</div> : null}
        </div>
      ) : (
        <div>{text || "[mensagem sem texto]"}</div>
      )}
      <div
        className={cn(
          "mt-1 flex items-center justify-end gap-1 text-[9px] text-muted-foreground",
          isOutbound && "text-[hsl(142_40%_38%)]",
        )}
      >
        {timeLabel}
        {isOutbound && message.status !== "failed" && (
          <CheckCheck className="h-[13px] w-[13px] text-sky-500" />
        )}
      </div>
    </div>
  );
}

const MemoMessageBubble = memo(MessageBubble);

export default function CrmWhatsApp() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskInitialData, setTaskInitialData] = useState<{ titulo: string; descricao: string } | null>(null);
  const [messageMenu, setMessageMenu] = useState<{
    message: Message;
    x: number;
    y: number;
  } | null>(null);
  const [conversationMenu, setConversationMenu] = useState<{
    conversationId: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationQuery, setNewConversationQuery] = useState("");
  const [startingConversation, setStartingConversation] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { conversations, loading, refetch, newMessageIds } = useWhatsAppInbox({
    search: search || undefined,
    limit: 100,
  });
  const {
    conversation,
    messages,
    loading: loadingConversation,
    isFetching,
    sendMessage,
    addNote,
    updateStatus,
    updateConversation: patchConversation,
    refetch: refetchConversation,
  } = useWhatsAppConversation(selectedId);

  useEffect(() => {
    fetchTags().then(setAvailableTags).catch(() => {});
    fetchQuickReplies().then(setQuickReplies).catch(() => {});
    fetchCrmSettings()
      .then((cfg) => {
        setFunnel(cfg.funnel);
      })
      .catch(() => {});
  }, []);

  const funnelMap = useMemo(() => new Map(funnel.map((stage) => [stage.key, stage])), [funnel]);

  const pipelineLabels = useMemo<Record<PipelineFilter, string>>(
    () => ({
      all: PIPELINE_DEFAULT_LABELS.all,
      lead: funnelMap.get("lead")?.label || PIPELINE_DEFAULT_LABELS.lead,
      contact: funnelMap.get("contact")?.label || PIPELINE_DEFAULT_LABELS.contact,
      evaluation: funnelMap.get("evaluation")?.label || PIPELINE_DEFAULT_LABELS.evaluation,
      treatment: funnelMap.get("treatment")?.label || PIPELINE_DEFAULT_LABELS.treatment,
    }),
    [funnelMap],
  );

  const progressLabels = useMemo(
    () => PROGRESS_STAGE_KEYS.map((key, index) => funnelMap.get(key)?.label || PROGRESS_DEFAULT_LABELS[index]),
    [funnelMap],
  );

  const conversationCards = useMemo(
    () => conversations.map(toCrmConversationViewModel),
    [conversations],
  );

  // Busca estilo WhatsApp na "Nova conversa": casa contatos existentes por nome
  // ou número (canônico BR, tolera 55 e o 9º dígito) para evitar duplicar conversa.
  const newConvQueryDigits = onlyDigits(newConversationQuery);
  const newConvIsPhone = looksLikePhone(newConversationQuery);
  const newConvCanon = newConvIsPhone ? canonicalBrazilPhone(newConversationQuery) : "";
  const newConversationMatches = useMemo(() => {
    const term = newConversationQuery.trim().toLowerCase();
    if (!term) return conversationCards;
    return conversationCards.filter((card) => {
      const nameMatch = card.name?.toLowerCase().includes(term);
      const phoneDigits = onlyDigits(card.phone || "");
      const phoneMatch =
        phoneDigits.length > 0 &&
        (newConvIsPhone
          ? canonicalBrazilPhone(phoneDigits) === newConvCanon || phoneDigits.includes(newConvQueryDigits)
          : false);
      return nameMatch || phoneMatch;
    });
  }, [conversationCards, newConversationQuery, newConvIsPhone, newConvCanon, newConvQueryDigits]);
  const newConvHasExactMatch =
    newConvIsPhone &&
    newConversationMatches.some(
      (card) => canonicalBrazilPhone(onlyDigits(card.phone || "")) === newConvCanon,
    );

  const filteredConversations = useMemo(() => {
    let list = pipelineFilter === "all"
      ? conversationCards
      : conversationCards.filter((item) => item.stage.key === pipelineFilter);

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((item) => {
        // Busca por nome, telefone ou preview da última mensagem
        const nameMatch = item.name?.toLowerCase().includes(term);
        const phoneMatch = item.phone?.toLowerCase().includes(term);
        const previewMatch = item.preview?.toLowerCase().includes(term);
        return nameMatch || phoneMatch || previewMatch;
      });
    }
    return list;
  }, [conversationCards, pipelineFilter, search]);
  const selectedCard = useMemo(
    () => filteredConversations.find((item) => item.id === selectedId) ?? conversationCards.find((item) => item.id === selectedId) ?? null,
    [conversationCards, filteredConversations, selectedId],
  );

  useEffect(() => {
    if (!selectedId && filteredConversations.length > 0) {
      setSelectedId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    markConversationRead(selectedId).catch(() => {});
  }, [selectedId]);

  const pipelineCounts = useMemo(() => {
    return {
      all: conversationCards.length,
      lead: conversationCards.filter((item) => item.stage.key === "lead").length,
      contact: conversationCards.filter((item) => item.stage.key === "contact").length,
      evaluation: conversationCards.filter((item) => item.stage.key === "evaluation").length,
      treatment: conversationCards.filter((item) => item.stage.key === "treatment").length,
    } satisfies Record<PipelineFilter, number>;
  }, [conversationCards]);

  const handleSend = async () => {
    if (!selectedId || !composer.trim() || sending) return;

    // WhatsApp: texto livre fora da janela de 24h é aceito pela Meta mas não é
    // entregue (erro 131047). Oferece enviar o template de reengajamento aprovado.
    const channel = selectedConversationVm?.channel ?? "whatsapp";
    if (channel === "whatsapp" && !isWhatsAppWindowOpen(messages)) {
      const useTemplate = window.confirm(
        "A janela de 24h do WhatsApp está fechada — texto livre não será entregue (erro 131047).\n\n" +
          "Deseja enviar o modelo de reengajamento aprovado pela Meta?\n\n" +
          "OK = enviar modelo · Cancelar = não enviar",
      );
      if (!useTemplate) return;
      setSending(true);
      try {
        await sendMessage(REENGAGEMENT_TEMPLATE_TEXT, {
          type: "template",
          templateName: REENGAGEMENT_TEMPLATE_NAME,
          templateLanguage: REENGAGEMENT_TEMPLATE_LANGUAGE,
        });
        setComposer("");
        setReplyMessage(null);
        await Promise.all([refetch(), refetchConversation()]);
      } catch (error) {
        toast.error("Não foi possível enviar o modelo de reengajamento.", {
          description:
            error instanceof Error ? error.message : "Verifique se o template está aprovado na Meta.",
        });
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    try {
      await sendMessage(composer.trim());
      setComposer("");
      setReplyMessage(null);
      await Promise.all([refetch(), refetchConversation()]);
    } catch (error) {
      toast.error("Não foi possível enviar a mensagem.", {
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleAttachClick = () => {
    if (sending) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file || !selectedId || sending) return;

    const channel = selectedConversationVm?.channel ?? "whatsapp";
    if (channel === "whatsapp" && !isWhatsAppWindowOpen(messages)) {
      toast.error("Janela de 24h fechada", {
        description: "Não é possível enviar mídia por texto livre. Aguarde o cliente responder ou use um template.",
      });
      return;
    }

    setSending(true);
    try {
      const uploaded = await uploadAttachment(file);
      await sendMessage(composer.trim() || "", {
        type: uploaded.type,
        attachmentUrl: uploaded.url,
      });
      setComposer("");
      setReplyMessage(null);
      await Promise.all([refetch(), refetchConversation()]);
    } catch (error) {
      toast.error("Não foi possível enviar a mídia.", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteDraft.trim()) return;
    await addNote(noteDraft.trim());
    setNoteDraft("");
    setNoteOpen(false);
    await Promise.all([refetch(), refetchConversation()]);
  };

  // Abre uma conversa existente (sem duplicar) a partir da busca.
  const handleOpenExistingConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setNewConversationOpen(false);
    setNewConversationQuery("");
  };

  const handleStartNewConversation = async (rawPhone?: string) => {
    const phone = onlyDigits(rawPhone ?? newConversationQuery);
    if (phone.length < 10 || startingConversation) return;
    setStartingConversation(true);
    try {
      // resolveContact normaliza p/ E.164 no backend: se já existir contato/conversa
      // para este número, findOrCreateConversation retorna a conversa existente.
      const contact = await resolveContact({ phone });
      const conversation = await findOrCreateConversation(contact.id);
      setNewConversationOpen(false);
      setNewConversationQuery("");
      setSelectedId(conversation.id);
      await refetch();
      toast.success("Conversa iniciada.");
    } catch (error) {
      toast.error("Não foi possível iniciar a conversa.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setStartingConversation(false);
    }
  };

  const handleStageChange = async (stage: CrmStage) => {
    if (!conversation || savingStage) return;
    setSavingStage(true);
    try {
      await patchConversation({
        metadata: {
          ...(isRecord(conversation.metadata) ? conversation.metadata : {}),
          stage,
        },
      });
      await Promise.all([refetch(), refetchConversation()]);
    } finally {
      setSavingStage(false);
    }
  };

  const handleStatusAction = async (status: "pending" | "resolved" | "closed") => {
    await updateStatus(status);
    await Promise.all([refetch(), refetchConversation()]);
  };

  const handleArchiveConversation = async (conversationId: string) => {
    await markConversationRead(conversationId);
    toast.success("Conversa arquivada.");
    setConversationMenu(null);
    await Promise.all([refetch(), selectedId === conversationId ? refetchConversation() : Promise.resolve()]);
  };

  const handleQuickReply = (quickReply: CrmQuickReplyViewModel) => {
    setComposer(quickReply.content);
  };

  const closeMessageMenu = () => {
    setMessageMenu(null);
  };

  const openMessageMenu = (message: Message, x: number, y: number) => {
    setMessageMenu({ message, x, y });
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopyMessage = async (message: Message) => {
    const text = getMessageText(message.content).trim();
    if (!text) {
      toast.error("Essa mensagem não possui texto para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar a mensagem.");
    }
  };

  const handleReplyToMessage = (message: Message) => {
    setReplyMessage(message);
  };

  const handleOpenNoteFromMessage = (message: Message) => {
    setNoteDraft(buildQuotedMessageText(message));
    setNoteOpen(true);
  };

  const handleOpenTaskFromMessage = (message: Message) => {
    const text = getMessageText(message.content).trim();
    const contactName = selectedConversationVm?.name || "contato";
    setTaskInitialData({
      titulo: `Retornar ${contactName}`,
      descricao: buildQuotedMessageText(message) + (text ? "\n\nPróximo passo:\n" : ""),
    });
    setTaskModalOpen(true);
  };

  const handleAddTag = async (tagId: string) => {
    if (!conversation) return;
    await addTags(conversation.id, [tagId]);
    await Promise.all([refetch(), refetchConversation()]);
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!conversation) return;
    await removeTag(conversation.id, tagId);
    await Promise.all([refetch(), refetchConversation()]);
  };

  // ─── Conversation context menu handlers ───
  const handlePinConversation = async (conversationId: string) => {
    const conv = conversationCards.find((c) => c.id === conversationId);
    const isPinned = isRecord(conv?.metadata) && conv!.metadata.pinned === true;
    await pinConversation(conversationId, !isPinned);
    toast.success(isPinned ? "Conversa desafixada" : "Conversa fixada");
    setConversationMenu(null);
    await refetch();
  };

  const handleMuteConversation = async (conversationId: string) => {
    const conv = conversationCards.find((c) => c.id === conversationId);
    const mutedUntil = isRecord(conv?.metadata) && typeof conv!.metadata.mutedUntil === "string"
      ? conv!.metadata.mutedUntil : null;
    if (mutedUntil) {
      await muteConversation(conversationId, null);
      toast.success("Notificações reativadas");
    } else {
      const until = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      await muteConversation(conversationId, until);
      toast.success("Silenciado por 8 horas");
    }
    setConversationMenu(null);
    await refetch();
  };

  const handleMarkUnread = async (conversationId: string) => {
    await markConversationUnread(conversationId);
    toast.success("Marcada como não lida");
    setConversationMenu(null);
    await refetch();
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
    toast.success("Conversa excluída");
    setConversationMenu(null);
    if (selectedId === conversationId) setSelectedId(null);
    await refetch();
  };

  const handleCopyContactInfo = async (conversationId: string) => {
    const conv = conversationCards.find((c) => c.id === conversationId);
    if (!conv) return;
    const info = [conv.name, conv.phone].filter(Boolean).join(" · ");
    try {
      await navigator.clipboard.writeText(info);
      toast.success("Contato copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
    setConversationMenu(null);
  };


  // ─── Message edit/delete handlers ───
  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setEditDraft(getMessageText(message.content));
    setMessageMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editDraft.trim()) return;
    try {
      await updateMessage(editingMessage.conversationId, editingMessage.id, {
        content: editDraft.trim(),
      });
      toast.success("Mensagem editada");
    } catch {
      toast.error("Erro ao editar mensagem");
    }
    setEditingMessage(null);
    setEditDraft("");
    await Promise.all([refetch(), refetchConversation()]);
  };

  const handleDeleteMessage = async (message: Message) => {
    if (!window.confirm("Excluir mensagem? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      await deleteMessage(message.conversationId, message.id);
      toast.success("Mensagem excluída");
    } catch {
      toast.error("Erro ao excluir mensagem");
    }
    setMessageMenu(null);
    await Promise.all([refetch(), refetchConversation()]);
  };

  const quickReplyItems = useMemo(() => buildQuickReplies(quickReplies), [quickReplies]);
  const selectedConversationVm = selectedCard ?? (conversation ? toCrmConversationViewModel(conversation) : null);
  const availableTagOptions = useMemo(() => {
    const currentTagIds = new Set(conversation?.tags.map((tag) => tag.id) ?? []);
    return availableTags.filter((tag) => !currentTagIds.has(tag.id));
  }, [availableTags, conversation?.tags]);

  useEffect(() => {
    if (!messageMenu) return;
    const handleGlobalPointer = () => closeMessageMenu();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMessageMenu();
    };
    window.addEventListener("pointerdown", handleGlobalPointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [messageMenu]);

  useEffect(() => {
    if (!conversationMenu) return;
    const handleGlobalPointer = () => setConversationMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConversationMenu(null);
    };
    window.addEventListener("pointerdown", handleGlobalPointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [conversationMenu]);

  useEffect(() => () => clearLongPress(), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedId) return;
      // Ctrl+E – archive (mark as read)
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        void handleArchiveConversation(selectedId);
      }
      // Ctrl+Shift+M – mute/unmute for 8h
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        void handleMuteConversation(selectedId);
      }
      // Ctrl+Backspace – delete conversation
      if (e.ctrlKey && e.key === 'Backspace') {
        e.preventDefault();
        if (window.confirm('Excluir conversa?')) {
          void handleDeleteConversation(selectedId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId]);

  return (
    <PageLayout fullWidth noPadding compactHeader hideDefaultHeader showBreadcrumbs={false} fillViewport>
      <PageContainer maxWidth="full" noPadding className="h-full">
        <div className="flex h-full min-h-0 flex-col bg-background">
          <div className="flex items-center gap-3 border-b border-border px-5 py-3">
            <h1 className="flex items-center gap-2 text-[19px] font-extrabold tracking-[-0.01em]">
              CRM
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(142_70%_94%)] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.04em] text-[hsl(142_60%_28%)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(142_70%_42%)]" />
                WhatsApp conectado
              </span>
            </h1>
            <div className="ml-3 flex flex-1 flex-wrap gap-2">
              {(Object.keys(pipelineLabels) as PipelineFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPipelineFilter(key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                    pipelineFilter === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {pipelineLabels[key]}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums",
                      pipelineFilter === key ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {pipelineCounts[key]}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setNewConversationOpen(true)}
                className="h-9 rounded-[10px] bg-[hsl(142_70%_42%)] px-3 text-xs font-semibold text-white hover:bg-[hsl(142_70%_38%)]"
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Nova conversa
              </Button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary">
                <Filter className="h-[18px] w-[18px]" />
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary">
                <Bell className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/crm-whatsapp/configuracoes")}
                aria-label="Configurações do CRM·WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary"
              >
                <Settings className="h-[18px] w-[18px]" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(211_100%_92%)] text-xs font-extrabold text-[hsl(211_100%_30%)]">
                RM
              </div>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-rows-1 grid-cols-[326px_minmax(0,1fr)_304px] overflow-hidden">
            <aside className="flex min-h-0 flex-col border-r border-border">
              <div className="border-b border-border p-3.5">
                <div className="flex items-center gap-2 rounded-[10px] bg-muted/60 px-3 py-2.5">
                  <Search className="h-[15px] w-[15px] text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar conversa ou paciente..."
                    className="h-auto border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredConversations.map((item) => (
                  <ConversationCard
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    isNew={newMessageIds.has(item.id)}
                    funnelMap={funnelMap}
                    onSelect={setSelectedId}
                    onContextMenu={(e, id) => setConversationMenu({ conversationId: id, x: e.clientX, y: e.clientY })}
                  />
                ))}
                {!loading && filteredConversations.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma conversa encontrada.
                  </div>
                )}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col bg-[hsl(40_30%_96%)]">
              {selectedConversationVm ? (
                <>
                  <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
                    <ContactAvatar
                      name={selectedConversationVm.name}
                      avatarUrl={selectedConversationVm.channel !== "webchat" ? selectedConversationVm.avatarUrl : null}
                      avatarGradient={selectedConversationVm.avatarGradient}
                      initials={selectedConversationVm.initials}
                      className="h-10 w-10"
                      fallbackClassName="text-sm font-extrabold"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold">{selectedConversationVm.name}</div>
                      <div className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-muted-foreground">
                        {selectedConversationVm.phoneLabel ? <span>{selectedConversationVm.phoneLabel}</span> : null}
                        {selectedConversationVm.phoneLabel ? <span aria-hidden>·</span> : null}
                        <span
                          className={cn(
                            selectedConversationVm.presenceLabel === "Ativo agora" &&
                              "font-bold text-[hsl(142_60%_38%)]",
                          )}
                        >
                          {selectedConversationVm.presenceLabel}
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary">
                        <Phone className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          selectedConversationVm.patientId
                            ? navigate(`/schedule?patientId=${selectedConversationVm.patientId}`)
                            : undefined
                        }
                        disabled={!selectedConversationVm.patientId}
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <CalendarPlus className="h-[18px] w-[18px]" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary">
                            <MoreVertical className="h-[18px] w-[18px]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStatusAction("pending")}>Marcar como pendente</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusAction("resolved")}>Marcar como resolvida</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusAction("closed")}>Fechar conversa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(hsl(40_20%_88%)_1px,transparent_1px)] bg-[length:22px_22px] px-5 py-4">
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {loadingConversation ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          Carregando conversa...
                        </div>
                      ) : (
                        messages.map((message, index) => {
                          const text = getMessageText(message.content);
                          const isSystem = message.type === "note";
                          const isTemplate = message.type === "template";
                          const isOutbound = message.direction === "outbound";
                          const isImage = message.type === "image" || message.mediaType === "image";
                          const mediaUrl = getMessageMediaUrl(message);

                          const dayLabel = getMessageDateLabel(message.timestamp);
                          const prevDayLabel = index > 0 ? getMessageDateLabel(messages[index - 1].timestamp) : "";
                          const showDaySeparator = dayLabel !== "" && dayLabel !== prevDayLabel;
                          const daySeparator = showDaySeparator ? (
                            <div className="mx-auto my-3 w-fit rounded-full bg-[hsl(40_25%_90%)] px-3 py-1 text-[10px] font-bold text-[hsl(40_15%_40%)]">
                              {dayLabel}
                            </div>
                          ) : null;
                          const leadBanner = index === 0 ? (
                            <div className="mb-3 self-center rounded-[10px] bg-[hsl(211_100%_95%)] px-3 py-2 text-center text-[11px] font-semibold text-[hsl(211_100%_32%)]">
                              <span className="inline-flex items-center gap-1">
                                <UserPlus className="h-[13px] w-[13px]" />
                                Lead capturado via {selectedConversationVm.sourceLabel}
                                {selectedConversationVm.campaignLabel !== "Não informado"
                                  ? ` · ${selectedConversationVm.campaignLabel}`
                                  : ""}
                              </span>
                            </div>
                          ) : null;

                          if (isSystem) {
                            return (
                              <Fragment key={message.id}>
                                {daySeparator}
                                {leadBanner}
                                <div
                                  className="mx-auto max-w-[80%] rounded-[10px] bg-[hsl(211_100%_95%)] px-3 py-2 text-center text-[11px] font-semibold text-[hsl(211_100%_32%)]"
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <StickyNote className="h-[13px] w-[13px]" />
                                    {text || "Nota interna adicionada"}
                                  </span>
                                </div>
                              </Fragment>
                            );
                          }

                          return (
                            <Fragment key={message.id}>
                            {daySeparator}
                            {leadBanner}
                            <MemoMessageBubble
                              message={message}
                              isOutbound={isOutbound}
                              isTemplate={isTemplate}
                              isImage={isImage}
                              mediaUrl={mediaUrl}
                              text={text}
                              timeLabel={getMessageTimeLabel(message.timestamp)}
                              isReplying={replyMessage?.id === message.id}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                openMessageMenu(message, event.clientX, event.clientY);
                              }}
                              onPointerDown={(event) => {
                                if (event.pointerType === "mouse") return;
                                clearLongPress();
                                longPressTimerRef.current = setTimeout(() => {
                                  const target = event.currentTarget.getBoundingClientRect();
                                  openMessageMenu(message, target.left + target.width / 2, target.top + Math.min(target.height, 56));
                                }, 450);
                              }}
                              onPointerUp={() => clearLongPress()}
                              onPointerCancel={() => clearLongPress()}
                              onPointerLeave={() => clearLongPress()}
                            />
                            </Fragment>
                          );
                        })
                      )}
                    </div>

                    {editingMessage && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setEditingMessage(null); setEditDraft(""); }}>
                        <div className="w-full max-w-md rounded-2xl bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                          <div className="mb-2 text-sm font-bold">Editar mensagem</div>
                          <Textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={3}
                            autoFocus
                            className="mb-3"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setEditingMessage(null); setEditDraft(""); }}>
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={() => void handleSaveEdit()} disabled={!editDraft.trim()}>
                              Salvar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2 overflow-x-auto border-t border-border bg-card px-4 py-2">
                      {quickReplyItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleQuickReply(item)}
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors",
                            item.prominent
                              ? "border-[hsl(142_50%_80%)] bg-[hsl(142_60%_95%)] text-[hsl(142_55%_30%)]"
                              : "border-border bg-background text-muted-foreground hover:border-[hsl(142_50%_55%)] hover:text-[hsl(142_55%_30%)]",
                          )}
                        >
                          {item.prominent ? <Zap className="mr-1 h-3 w-3" /> : null}
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 border-t border-border bg-card px-4 py-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*,application/pdf"
                        className="hidden"
                        onChange={(event) => void handleFileSelected(event)}
                      />
                      <button
                        type="button"
                        onClick={handleAttachClick}
                        disabled={sending}
                        title="Anexar mídia"
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary disabled:opacity-50"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <div className="flex-1 rounded-[22px] bg-muted/60 px-4 py-2.5">
                        {replyMessage ? (
                          <div className="mb-2 flex items-start justify-between gap-3 rounded-2xl bg-background/85 px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-[10px] font-extrabold uppercase tracking-[0.05em] text-primary">
                                Respondendo mensagem
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {getMessageText(replyMessage.content) || "[mensagem sem texto]"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyMessage(null)}
                              className="text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                            >
                              limpar
                            </button>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <Smile className="h-[18px] w-[18px] text-muted-foreground" />
                          <input
                            value={composer}
                            onChange={(event) => setComposer(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void handleSend();
                              }
                            }}
                            placeholder="Escreva uma mensagem..."
                            className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary">
                        <Mic className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={!composer.trim() || sending}
                        className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[hsl(142_70%_42%)] text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Selecione uma conversa para continuar.
                </div>
              )}
            </section>

            <aside className="flex min-h-0 flex-col overflow-y-auto border-l border-border bg-muted/30">
              {selectedConversationVm ? (
                <>
                  <div className="border-b border-border bg-card px-4 pb-4 pt-5 text-center">
                    <ContactAvatar
                      name={selectedConversationVm.name}
                      avatarUrl={selectedConversationVm.channel !== "webchat" ? selectedConversationVm.avatarUrl : null}
                      avatarGradient={selectedConversationVm.avatarGradient}
                      initials={selectedConversationVm.initials}
                      className="mx-auto mb-3 h-16 w-16"
                      fallbackClassName="text-[22px] font-extrabold"
                    />
                    <div className="text-base font-extrabold">{selectedConversationVm.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      {selectedConversationVm.phoneLabel}
                    </div>
                    <div className="mt-3 flex justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            selectedConversationVm.patientId
                              ? `/patients/${selectedConversationVm.patientId}`
                              : `/patients/new?name=${encodeURIComponent(selectedConversationVm.name)}&phone=${encodeURIComponent(selectedConversationVm.phoneDigits)}`,
                          )
                        }
                        className="h-auto flex-col gap-1 rounded-xl px-3 py-2 text-[10px] font-bold"
                      >
                        <UserPlus className="h-[18px] w-[18px]" />
                        {selectedConversationVm.patientId ? "Ver paciente" : "Criar paciente"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!selectedConversationVm.patientId}
                        onClick={() =>
                          selectedConversationVm.patientId
                            ? navigate(`/schedule?patientId=${selectedConversationVm.patientId}`)
                            : undefined
                        }
                        className="h-auto flex-col gap-1 rounded-xl px-3 py-2 text-[10px] font-bold"
                      >
                        <CalendarPlus className="h-[18px] w-[18px]" />
                        Agendar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setNoteDraft("");
                          setNoteOpen(true);
                        }}
                        className="h-auto flex-col gap-1 rounded-xl px-3 py-2 text-[10px] font-bold"
                      >
                        <StickyNote className="h-[18px] w-[18px]" />
                        Nota
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-0">
                    <section className="border-b border-border px-4 py-4">
                      <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                        Estágio no funil
                      </h4>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-[10px] border border-border bg-card px-3 py-2.5 text-left"
                          >
                            <span className="flex items-center gap-2">
                              <StageChip
                                view={resolveStageView(selectedConversationVm.stage, funnelMap)}
                                className="px-2.5 py-1 text-[11px] font-extrabold"
                              />
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          {CRM_PIPELINE_ORDER.map((stage) => {
                            const meta = getStageMeta(stage);
                            return (
                              <DropdownMenuItem key={stage} onClick={() => void handleStageChange(stage)}>
                                <StageChip
                                  view={resolveStageView(meta, funnelMap)}
                                  className="gap-2 px-2 py-1 text-[11px] font-bold"
                                />
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="mt-3 flex gap-1">
                        {progressLabels.map((label, index) => (
                          <div
                            key={`${label}-${index}`}
                            className={cn(
                              "h-[5px] flex-1 rounded-full bg-secondary",
                              index <= selectedConversationVm.stage.progressIndex && "bg-primary",
                            )}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between text-[9px] font-bold text-muted-foreground">
                        {progressLabels.map((label, index) => (
                          <span
                            key={`${label}-${index}`}
                            className={cn(index === selectedConversationVm.stage.progressIndex && "text-primary")}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      {savingStage ? (
                        <div className="mt-2 text-[11px] text-muted-foreground">Salvando estágio...</div>
                      ) : null}
                    </section>

                    <section className="border-b border-border px-4 py-4">
                      <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                        Detalhes do lead
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                          <span className="font-semibold text-muted-foreground">Origem</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(142_60%_92%)] px-2 py-0.5 font-bold text-[hsl(142_55%_28%)]">
                            <Camera className="h-[11px] w-[11px]" />
                            {selectedConversationVm.sourceLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                          <span className="font-semibold text-muted-foreground">Campanha</span>
                          <span className="font-bold">{selectedConversationVm.campaignLabel}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                          <span className="font-semibold text-muted-foreground">Convênio</span>
                          <span className="font-bold">{selectedConversationVm.insuranceLabel}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                          <span className="font-semibold text-muted-foreground">Interesse</span>
                          <span className="font-bold">{selectedConversationVm.interestLabel}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                          <span className="font-semibold text-muted-foreground">Primeiro contato</span>
                          <span className="font-bold">{selectedConversationVm.firstContactLabel}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="font-semibold text-muted-foreground">Responsável</span>
                          <span className="font-bold">{selectedConversationVm.ownerLabel}</span>
                        </div>
                      </div>
                    </section>

                    <section className="border-b border-border px-4 py-4">
                      <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                        Próxima ação
                      </h4>
                      <div className="rounded-[10px] border border-[hsl(28_80%_85%)] bg-[hsl(28_92%_95%)] px-3 py-3">
                        <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[hsl(25_70%_38%)]">
                          <Clock3 className="h-3 w-3" />
                          {selectedConversationVm.nextActionTitle}
                        </div>
                        <div className="mt-1 text-xs font-bold text-[hsl(25_60%_25%)]">
                          {selectedConversationVm.nextActionBody}
                        </div>
                      </div>
                    </section>

                    <section className="px-4 py-4">
                      <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                        Etiquetas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(conversation?.tags ?? []).map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => void handleRemoveTag(tag.id)}
                            className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            #{tag.name}
                          </button>
                        ))}
                        {availableTagOptions.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full px-2.5 py-1 text-[11px] font-bold text-primary"
                              >
                                + adicionar
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {availableTagOptions.map((tag) => (
                                <DropdownMenuItem key={tag.id} onClick={() => void handleAddTag(tag.id)}>
                                  {tag.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Contexto CRM disponível ao selecionar uma conversa.
                </div>
              )}
            </aside>
          </div>
        </div>

        {messageMenu ? (
          <div
            className="fixed z-50 min-w-[220px] rounded-2xl border border-border bg-card p-1.5 shadow-2xl"
            style={{
              left: Math.min(messageMenu.x, window.innerWidth - 236),
              top: Math.min(messageMenu.y, window.innerHeight - 220),
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                void handleCopyMessage(messageMenu.message);
                closeMessageMenu();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
              Copiar
            </button>
            <button
              type="button"
              onClick={() => {
                handleReplyToMessage(messageMenu.message);
                closeMessageMenu();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              <Reply className="h-4 w-4 text-muted-foreground" />
              Responder
            </button>
            <button
              type="button"
              onClick={() => {
                handleOpenNoteFromMessage(messageMenu.message);
                closeMessageMenu();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              Adicionar nota
            </button>
            <button
              type="button"
              onClick={() => {
                handleOpenTaskFromMessage(messageMenu.message);
                closeMessageMenu();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              Criar tarefa
            </button>
            {messageMenu.message.direction === "outbound" && (() => {
              const msgTime = new Date(messageMenu.message.timestamp).getTime();
              const canEdit = Date.now() - msgTime < 15 * 60 * 1000;
              const canDelete = messageMenu.message.canDeleteForEveryone !== false;
              return (
                <>
                  <div className="my-1 border-t border-border/60" />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleEditMessage(messageMenu.message)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
                    >
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                      Editar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteMessage(messageMenu.message)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        ) : null}

        {conversationMenu ? (
          <div
            className="fixed z-50 min-w-[220px] rounded-2xl border border-border bg-card p-1.5 shadow-2xl"
            style={{
              left: Math.min(conversationMenu.x, window.innerWidth - 236),
              top: Math.min(conversationMenu.y, window.innerHeight - 280),
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => void handlePinConversation(conversationMenu.conversationId)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              <Pin className="h-4 w-4 text-muted-foreground" />
              {(() => {
                const conv = conversationCards.find((c) => c.id === conversationMenu.conversationId);
                const isPinned = isRecord(conv?.metadata) && conv!.metadata.pinned === true;
                return isPinned ? "Desafixar" : "Fixar conversa";
              })()}
            </button>
            <button
              type="button"
              onClick={() => void handleMuteConversation(conversationMenu.conversationId)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              {(() => {
                const conv = conversationCards.find((c) => c.id === conversationMenu.conversationId);
                const isMuted = isRecord(conv?.metadata) && typeof conv!.metadata.mutedUntil === "string";
                return isMuted ? (
                  <><Bell className="h-4 w-4 text-muted-foreground" /> Reativar notificações</>
                ) : (
                  <><BellOff className="h-4 w-4 text-muted-foreground" /> Silenciar 8h</>
                );
              })()}
            </button>
            <button
              type="button"
              onClick={() => void handleMarkUnread(conversationMenu.conversationId)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Marcar como não lida
            </button>
            <button
              type="button"
              onClick={() => void handleCopyContactInfo(conversationMenu.conversationId)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
              Copiar contato
            </button>
            <button
              type="button"
              onClick={() => {
                const conv = conversationCards.find((c) => c.id === conversationMenu.conversationId);
                if (conv?.patientId) {
                  void navigate(`/patients/${conv.patientId}`);
                } else {
                  // Redirect to new patient page with contact prefill (if supported)
                  void navigate(`/patients/new?contactId=${conv?.id ?? ''}`);
                }
                setConversationMenu(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors hover:bg-secondary"
            >
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              Criar/ver paciente
            </button>
            <div className="my-1 border-t border-border/60" />
            <button
              type="button"
              onClick={() => void handleDeleteConversation(conversationMenu.conversationId)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-left text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Excluir conversa
            </button>
          </div>
        ) : null}

        <Dialog
          open={newConversationOpen}
          onOpenChange={(open) => {
            setNewConversationOpen(open);
            if (!open) setNewConversationQuery("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova conversa</DialogTitle>
              <DialogDescription>
                Pesquise um contato existente ou digite um número para iniciar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                id="new-conversation-search"
                placeholder="Pesquisar nome ou número"
                value={newConversationQuery}
                onChange={(event) => setNewConversationQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && newConvIsPhone && !newConvHasExactMatch) {
                    event.preventDefault();
                    void handleStartNewConversation(newConvQueryDigits);
                  }
                }}
                autoFocus
              />

              <div className="max-h-80 overflow-y-auto -mx-1 px-1">
                {newConversationMatches.length > 0 && (
                  <ul className="divide-y divide-border">
                    {newConversationMatches.map((card) => (
                      <li key={card.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenExistingConversation(card.id)}
                          className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/60 rounded-md px-2"
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ backgroundImage: card.avatarGradient }}
                          >
                            {card.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{card.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {card.phoneLabel || card.lastMessage}
                            </span>
                          </span>
                          <ChannelBadge channel={card.channel} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {newConvIsPhone && !newConvHasExactMatch && (
                  <div className="pt-2">
                    <p className="px-2 py-1 text-xs text-muted-foreground">
                      Não está na sua lista de contatos
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleStartNewConversation(newConvQueryDigits)}
                      disabled={startingConversation}
                      className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/60 rounded-md px-2 disabled:opacity-60"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <MessageCirclePlus className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {formatBrazilPhone(newConvQueryDigits)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {startingConversation ? "Iniciando..." : "Iniciar nova conversa no WhatsApp"}
                        </span>
                      </span>
                    </button>
                  </div>
                )}

                {newConversationQuery.trim() &&
                  !newConvIsPhone &&
                  newConversationMatches.length === 0 && (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhum contato encontrado. Digite um número de WhatsApp para iniciar.
                    </p>
                  )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar nota interna</DialogTitle>
              <DialogDescription>
                Essa nota fica registrada no histórico da conversa.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={5}
              placeholder="Ex.: lead com interesse em avaliação de joelho pela manhã"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleAddNote()} disabled={!noteDraft.trim()}>
                Salvar nota
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <TaskQuickCreateModal
          open={taskModalOpen}
          onOpenChange={setTaskModalOpen}
          initialData={
            taskInitialData
              ? {
                  titulo: taskInitialData.titulo,
                  descricao: taskInitialData.descricao,
                }
              : undefined
          }
        />
      </PageContainer>
    </PageLayout>
  );
}
