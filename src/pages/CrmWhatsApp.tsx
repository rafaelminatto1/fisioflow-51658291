import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarPlus,
  Camera,
  CheckCheck,
  ChevronDown,
  Clock3,
  Filter,
  Flame,
  Globe,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings,
  Smile,
  StickyNote,
  UserPlus,
  Zap,
} from "lucide-react";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addTags,
  fetchCrmSettings,
  fetchQuickReplies,
  fetchTags,
  removeTag,
  type FunnelStage,
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

function ChannelBadge({ channel }: { channel: "whatsapp" | "instagram" | "webchat" }) {
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
}

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

  const { conversations, loading, refetch } = useWhatsAppInbox({
    search: search || undefined,
    limit: 100,
  });
  const {
    conversation,
    messages,
    loading: loadingConversation,
    sendMessage,
    addNote,
    updateStatus,
    updateConversation: patchConversation,
    refetch: refetchConversation,
  } = useWhatsAppConversation(selectedId);

  useEffect(() => {
    fetchTags().then(setAvailableTags).catch(() => {});
    fetchQuickReplies().then(setQuickReplies).catch(() => {});
    fetchCrmSettings().then((cfg) => setFunnel(cfg.funnel)).catch(() => {});
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

  const filteredConversations = useMemo(() => {
    if (pipelineFilter === "all") return conversationCards;
    return conversationCards.filter((item) => item.stage.key === pipelineFilter);
  }, [conversationCards, pipelineFilter]);

  const selectedCard = useMemo(
    () => filteredConversations.find((item) => item.id === selectedId) ?? conversationCards.find((item) => item.id === selectedId) ?? null,
    [conversationCards, filteredConversations, selectedId],
  );

  useEffect(() => {
    if (!selectedId && filteredConversations.length > 0) {
      setSelectedId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedId]);

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
    setSending(true);
    try {
      await sendMessage(composer.trim());
      setComposer("");
      await Promise.all([refetch(), refetchConversation()]);
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

  const handleQuickReply = (quickReply: CrmQuickReplyViewModel) => {
    setComposer(quickReply.content);
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

  const quickReplyItems = useMemo(() => buildQuickReplies(quickReplies), [quickReplies]);
  const selectedConversationVm = selectedCard ?? (conversation ? toCrmConversationViewModel(conversation) : null);
  const availableTagOptions = useMemo(() => {
    const currentTagIds = new Set(conversation?.tags.map((tag) => tag.id) ?? []);
    return availableTags.filter((tag) => !currentTagIds.has(tag.id));
  }, [availableTags, conversation?.tags]);

  return (
    <PageLayout fullWidth noPadding compactHeader hideDefaultHeader showBreadcrumbs={false}>
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

          <div className="grid min-h-0 flex-1 grid-cols-[326px_minmax(0,1fr)_304px]">
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
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "relative flex w-full gap-3 border-b border-border/60 px-3.5 py-3 text-left transition-colors hover:bg-muted/40",
                      selectedId === item.id && "bg-primary/[0.07]",
                    )}
                  >
                    {selectedId === item.id && (
                      <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
                    )}
                    <div className="relative shrink-0">
                      <div
                        className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-sm font-extrabold text-white"
                        style={{ backgroundImage: item.avatarGradient }}
                      >
                        {item.initials}
                      </div>
                      <ChannelBadge channel={item.channel} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-bold">{item.name}</span>
                        {item.temperature === "quente" && (
                          <Flame
                            className="h-3 w-3 shrink-0 text-orange-500"
                            aria-label="Lead quente"
                          />
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
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white"
                      style={{ backgroundImage: selectedConversationVm.avatarGradient }}
                    >
                      {selectedConversationVm.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold">{selectedConversationVm.name}</div>
                      <div className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-muted-foreground">
                        {selectedConversationVm.phone ? <span>{selectedConversationVm.phone}</span> : null}
                        {selectedConversationVm.phone ? <span aria-hidden>·</span> : null}
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
                    <div className="mx-auto mb-3 rounded-full bg-[hsl(40_25%_90%)] px-3 py-1 text-[10px] font-bold text-[hsl(40_15%_40%)]">
                      Hoje
                    </div>
                        <div className="mb-3 self-center rounded-[10px] bg-[hsl(211_100%_95%)] px-3 py-2 text-center text-[11px] font-semibold text-[hsl(211_100%_32%)]">
                          <span className="inline-flex items-center gap-1">
                            <UserPlus className="h-[13px] w-[13px]" />
                            Lead capturado via {selectedConversationVm.sourceLabel}
                            {selectedConversationVm.campaignLabel !== "Não informado"
                              ? ` · ${selectedConversationVm.campaignLabel}`
                              : ""}
                          </span>
                        </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {loadingConversation && messages.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          Carregando conversa...
                        </div>
                      ) : (
                        messages.map((message) => {
                          const text = getMessageText(message.content);
                          const isSystem = message.type === "note";
                          const isTemplate = message.type === "template";
                          const isOutbound = message.direction === "outbound";
                          if (isSystem) {
                            return (
                              <div
                                key={message.id}
                                className="mx-auto max-w-[80%] rounded-[10px] bg-[hsl(211_100%_95%)] px-3 py-2 text-center text-[11px] font-semibold text-[hsl(211_100%_32%)]"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <StickyNote className="h-[13px] w-[13px]" />
                                  {text || "Nota interna adicionada"}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "max-w-[64%] rounded-xl px-3 py-2 text-[13px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,0.06)]",
                                isOutbound
                                  ? isTemplate
                                    ? "ml-auto rounded-tr-[3px] border border-[hsl(142_50%_75%)] bg-white"
                                    : "ml-auto rounded-tr-[3px] bg-[hsl(142_65%_88%)]"
                                  : "rounded-tl-[3px] bg-white",
                              )}
                            >
                              {isTemplate && (
                                <div className="mb-1 flex items-center gap-1 text-[9px] font-extrabold tracking-[0.04em] text-[hsl(142_55%_32%)]">
                                  <Zap className="h-[11px] w-[11px]" />
                                  RESPOSTA RÁPIDA
                                  {message.templateName ? ` · ${message.templateName}` : ""}
                                </div>
                              )}
                              <div>{text || "[mensagem sem texto]"}</div>
                              <div
                                className={cn(
                                  "mt-1 flex items-center justify-end gap-1 text-[9px] text-muted-foreground",
                                  isOutbound && "text-[hsl(142_40%_38%)]",
                                )}
                              >
                                {message.timestamp ? new Date(message.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                                {isOutbound && message.status !== "failed" && (
                                  <CheckCheck className="h-[13px] w-[13px] text-sky-500" />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

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
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-secondary">
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <div className="flex flex-1 items-center gap-2 rounded-full bg-muted/60 px-4 py-2.5">
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
                    <div
                      className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-[22px] font-extrabold text-white"
                      style={{ backgroundImage: selectedConversationVm.avatarGradient }}
                    >
                      {selectedConversationVm.initials}
                    </div>
                    <div className="text-base font-extrabold">{selectedConversationVm.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      {selectedConversationVm.phone}
                    </div>
                    <div className="mt-3 flex justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            selectedConversationVm.patientId
                              ? `/patients/${selectedConversationVm.patientId}`
                              : `/patients/new?name=${encodeURIComponent(selectedConversationVm.name)}&phone=${encodeURIComponent(selectedConversationVm.phone)}`,
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
                        onClick={() => setNoteOpen(true)}
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
      </PageContainer>
    </PageLayout>
  );
}
