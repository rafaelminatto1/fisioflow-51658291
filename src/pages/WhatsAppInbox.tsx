import {
  Activity,
  AlarmClock,
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  CalendarCheck,
  ChevronDown,
  Filter,
  ListChecks,
  Loader2,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Tag,
  User,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useWhatsAppConversation, useWhatsAppInbox } from "@/hooks/useWhatsApp";
import { organizationMembersApi } from "@/api/v2/system";
import type { Contact, Tag as TagType } from "@/services/whatsapp-api";
import {
  addTags,
  fetchAgentsWorkload,
  fetchMetrics,
  removeTag as apiRemoveTag,
  fetchContacts,
  fetchTags,
  findOrCreateConversation,
  updatePriority,
  snoozeConversation,
} from "@/services/whatsapp-api";
import { accentIncludes } from "@/lib/utils/bilingualSearch";

// WhatsApp Components
import { MetricsStrip } from "@/components/whatsapp/MetricsStrip";
import { BroadcastModal } from "@/components/whatsapp/BroadcastModal";
import { ConfirmationsModal } from "@/components/whatsapp/ConfirmationsModal";
import { ConversationListItem } from "@/components/whatsapp/ConversationListItem";
import { ConversationDetailPanel } from "@/components/whatsapp/ConversationDetailPanel";
import { ChatPanel } from "@/components/whatsapp/ChatPanel";
import {
  STATUS_TABS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  SNOOZE_OPTIONS,
} from "@/components/whatsapp/constants";

function getMemberUserId(member: any): string {
  return member.userId ?? member.user_id ?? member.user?.id ?? member.id;
}

function getMemberName(member: any): string {
  return (
    member.user?.name ??
    member.profiles?.full_name ??
    member.profiles?.name ??
    member.name ??
    member.profiles?.email ??
    member.user?.email ??
    "Membro"
  );
}

function getMemberEmail(member: any): string {
  return member.user?.email ?? member.profiles?.email ?? member.email ?? "";
}

export default function WhatsAppInboxPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();
  const [availableTags, setAllTags] = useState<TagType[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [creatingConversationId, setCreatingConversationId] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [agentsWorkload, setAgentsWorkload] = useState<any[]>([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showConfirmationsModal, setShowConfirmationsModal] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  const [showAddNumberDialog, setShowAddNumberDialog] = useState(false);
  const [selectedPatientForNumber, setSelectedPatientForNumber] = useState<Contact | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [showAttachToPatientDialog, setShowAttachToPatientDialog] = useState(false);
  const [manualPhoneNumber, setManualPhoneNumber] = useState("");

  useEffect(() => {
    fetchMetrics()
      .then(setMetrics)
      .catch(() => {});
    fetchTags()
      .then(setAllTags)
      .catch(() => {});
  }, []);

  const inboxFilters = useMemo(
    () => ({
      status:
        statusFilter === "all" ? undefined : statusFilter === "mine" ? undefined : statusFilter,
      assignedTo: statusFilter === "mine" ? "me" : undefined,
      priority: priorityFilter,
      search: search || undefined,
      tagId: tagFilter,
    }),
    [statusFilter, priorityFilter, search, tagFilter],
  );

  const { conversations, loading, pagination, refetch } = useWhatsAppInbox(inboxFilters);

  const {
    conversation,
    addNote,
    assign,
    transfer,
    updateStatus,
    refetch: refetchConversation,
  } = useWhatsAppConversation(selectedId);

  const filteredConversations = conversations;

  useEffect(() => {
    if (!showNewConversationDialog) return;

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setContactsLoading(true);
      try {
        const result = await fetchContacts({
          search: contactSearch || undefined,
          limit: 50,
        });
        if (active) setContacts(result.data);
      } catch (error) {
        console.error("[WhatsAppInbox] Failed to fetch contacts", error);
        if (active) setContacts([]);
      } finally {
        if (active) setContactsLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [showNewConversationDialog, contactSearch]);

  useEffect(() => {
    if (showAssignDialog || showTransferDialog) {
      organizationMembersApi
        .list()
        .then((res) => setTeamMembers(res.data))
        .catch(() => {});
      fetchAgentsWorkload()
        .then(setAgentsWorkload)
        .catch(() => {});
    }
  }, [showAssignDialog, showTransferDialog]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return teamMembers;
    return teamMembers.filter((m) => {
      const name = getMemberName(m);
      const email = getMemberEmail(m);
      return accentIncludes(name, memberSearch) || accentIncludes(email, memberSearch);
    });
  }, [teamMembers, memberSearch]);

  const handleCreateConversation = async (contact: Contact) => {
    if (!contact.phone && contact.patientId) {
      setSelectedPatientForNumber(contact);
      setShowAddNumberDialog(true);
      return;
    }

    setCreatingConversationId(contact.id);
    try {
      const conv = await findOrCreateConversation(contact.phone || "", contact.patientId);
      setSelectedId(conv.id);
      setShowNewConversationDialog(false);
      setContactSearch("");
      await refetch();
    } catch (error) {
      toast.error("Erro ao abrir conversa");
    } finally {
      setCreatingConversationId(null);
    }
  };

  const handleCreateWithNumber = async (phone: string, patientId?: string) => {
    try {
      const conv = await findOrCreateConversation(phone, patientId);
      setSelectedId(conv.id);
      setShowNewConversationDialog(false);
      setShowAttachToPatientDialog(false);
      setContactSearch("");
      await refetch();
    } catch (error) {
      toast.error("Erro ao iniciar conversa");
    }
  };

  const handleAssign = async (userId: string) => {
    if (!selectedId) return;
    try {
      await assign(userId);
      setShowAssignDialog(false);
      toast.success("Conversa atribuída");
      await Promise.all([refetch(), refetchConversation()]);
    } catch (error) {
      toast.error("Erro ao atribuir conversa");
    }
  };

  const handleTransfer = async (userId: string) => {
    if (!selectedId) return;
    try {
      await transfer(userId);
      setShowTransferDialog(false);
      toast.success("Conversa transferida");
      await Promise.all([refetch(), refetchConversation()]);
    } catch (error) {
      toast.error("Erro ao transferir conversa");
    }
  };

  const handlePriorityChange = async (priority: "low" | "medium" | "high" | "urgent") => {
    if (!selectedId) return;
    try {
      await updatePriority(selectedId, priority);
      toast.success("Prioridade atualizada");
      await Promise.all([refetch(), refetchConversation()]);
    } catch (error) {
      toast.error("Erro ao atualizar prioridade");
    }
  };

  const handleSnoozeOption = async (hours: number) => {
    if (!selectedId) return;
    try {
      await snoozeConversation(selectedId, hours);
      setShowSnoozeDialog(false);
      setSelectedId(null);
      toast.success(`Conversa adiada por ${hours}h`);
      await refetch();
    } catch (error) {
      toast.error("Erro ao adiar conversa");
    }
  };

  const handleBulkAction = async (action: "resolve" | "close") => {
    // Bulk action implementation...
  };

  const toggleBulkSelect = (id: string) => {
    setSelectedConvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendConfirmation = async (
    phone: string,
    patientName: string,
    date: string,
    time: string,
  ) => {
    // Confirmation implementation...
  };

  return (
    <MainLayout title="WhatsApp Inbox">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
        {/* Sidebar: Lista de Conversas */}
        <div className="w-[380px] border-r flex flex-col bg-muted/5 z-20">
          <div className="p-4 space-y-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Mensagens</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-full ${bulkMode ? "bg-primary/10 text-primary" : ""}`}
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    setSelectedConvIds(new Set());
                  }}
                  title="Ações em massa"
                >
                  <ListChecks className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setShowConfirmationsModal(true)}
                  title="Confirmar Consultas"
                >
                  <CalendarCheck className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setShowBroadcastModal(true)}
                  title="Nova Campanha"
                >
                  <Megaphone className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full shadow-md"
                  onClick={() => setShowNewConversationDialog(true)}
                  title="Nova Conversa"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar conversas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-none rounded-full h-10 focus-visible:ring-primary/20 focus-visible:bg-background transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs gap-1 rounded-full px-2.5 ${priorityFilter ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  >
                    <Filter className="h-3 w-3" />
                    {priorityFilter ? PRIORITY_LABELS[priorityFilter] : "Prioridade"}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => setPriorityFilter(undefined)}
                  >
                    Todas as prioridades
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <DropdownMenuItem
                      key={p}
                      className={`text-xs ${PRIORITY_COLORS[p]}`}
                      onClick={() => setPriorityFilter(p)}
                    >
                      {PRIORITY_LABELS[p]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {availableTags.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs gap-1 rounded-full px-2.5 ${tagFilter ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                    >
                      <Tag className="h-3 w-3" />
                      {tagFilter
                        ? (availableTags.find((t) => t.id === tagFilter)?.name ?? "Tag")
                        : "Tag"}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem className="text-xs" onClick={() => setTagFilter(undefined)}>
                      Todas as tags
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {availableTags.map((tag) => (
                      <DropdownMenuItem
                        key={tag.id}
                        className="text-xs"
                        onClick={() => setTagFilter(tag.id)}
                      >
                        <div
                          className="h-2 w-2 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="px-2 py-2 bg-background border-b shadow-sm z-10">
            <ScrollArea className="w-full whitespace-nowrap" type="scroll">
              <div className="flex w-max space-x-1.5 p-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      statusFilter === tab.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
          </div>

          <MetricsStrip metrics={metrics} />

          <ScrollArea className="flex-1 bg-background">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Carregando conversas...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground px-6 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Filter className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhuma conversa encontrada</p>
                <p className="text-xs mt-1">Tente ajustar os filtros ou termo de busca.</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredConversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedId === conv.id}
                    onClick={() => {
                      if (bulkMode) {
                        toggleBulkSelect(conv.id);
                      } else {
                        setSelectedId(conv.id);
                      }
                    }}
                    bulkMode={bulkMode}
                    isSelectedBulk={selectedConvIds.has(conv.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {pagination.totalPages > 1 && (
            <div className="p-3 border-t text-center text-xs text-muted-foreground bg-muted/20 font-medium">
              Página {pagination.page} de {pagination.totalPages}
            </div>
          )}

          {bulkMode && selectedConvIds.size > 0 && (
            <div className="p-3 border-t bg-primary/5 flex items-center gap-2">
              <span className="text-xs font-medium flex-1">
                {selectedConvIds.size} selecionadas
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleBulkAction("resolve")}
                disabled={bulkAssigning}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive"
                onClick={() => handleBulkAction("close")}
                disabled={bulkAssigning}
              >
                <XCircle className="h-3 w-3 mr-1" /> Fechar
              </Button>
            </div>
          )}
        </div>

        {/* Panel: Chat Principal */}
        <ChatPanel
          selectedId={selectedId}
          onAddNote={async (content) => {
            await addNote(content);
            await Promise.all([refetch(), refetchConversation()]);
          }}
          quickReplyText={quickReplyText}
          onQuickReplyUsed={() => setQuickReplyText(null)}
          onMessageSent={refetch}
          onConversationDeleted={async () => {
            setSelectedId(null);
            await refetch();
          }}
        />

        {/* Panel: Detalhes da Conversa */}
        <div
          className={`transition-all duration-300 ease-in-out border-l bg-background shrink-0 flex flex-col shadow-[-1px_0_10px_rgba(0,0,0,0.02)] z-20 ${
            conversation
              ? "w-[320px] translate-x-0"
              : "w-0 translate-x-full overflow-hidden border-none"
          }`}
        >
          {conversation && (
            <ConversationDetailPanel
              conversation={conversation}
              onAssign={() => setShowAssignDialog(true)}
              onTransfer={() => setShowTransferDialog(true)}
              onResolve={async () => {
                try {
                  await updateStatus("resolved");
                  await Promise.all([refetch(), refetchConversation()]);
                } catch {
                  toast.error("Não foi possível resolver a conversa");
                }
              }}
              onClose={async () => {
                try {
                  await updateStatus("closed");
                  await Promise.all([refetch(), refetchConversation()]);
                } catch {
                  toast.error("Não foi possível fechar a conversa");
                }
              }}
              onAddTag={async (tagId) => {
                try {
                  await addTags(conversation.id, [tagId]);
                  await Promise.all([refetch(), refetchConversation()]);
                  toast.success("Categoria adicionada");
                } catch {
                  toast.error("Não foi possível adicionar a categoria");
                }
              }}
              onRemoveTag={async (tagId) => {
                try {
                  await apiRemoveTag(conversation.id, tagId);
                  await Promise.all([refetch(), refetchConversation()]);
                  toast.success("Categoria removida");
                } catch {
                  toast.error("Não foi possível remover a categoria");
                }
              }}
              onQuickReply={(content) => setQuickReplyText(content)}
              onPriorityChange={handlePriorityChange}
              onSnooze={() => setShowSnoozeDialog(true)}
            />
          )}
        </div>
      </div>

      {/* Modais */}
      <Dialog
        open={showNewConversationDialog}
        onOpenChange={(open) => {
          setShowNewConversationDialog(open);
          if (!open) {
            setContactSearch("");
            setContacts([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Nova conversa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="rounded-full bg-muted/50"
            />
            <ScrollArea className="h-[320px] rounded-2xl border bg-muted/10 px-2 py-2">
              {contactsLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Buscando contatos...</span>
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <User className="h-5 w-5 opacity-60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Nenhum contato encontrado</p>
                  {/^\d+$/.test(contactSearch.replace(/\D/g, "")) && contactSearch.length >= 8 ? (
                    <Button
                      variant="outline"
                      className="mt-4 rounded-full border-primary text-primary hover:bg-primary/5"
                      onClick={() => {
                        setManualPhoneNumber(contactSearch);
                        setShowAttachToPatientDialog(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Iniciar com {contactSearch}
                    </Button>
                  ) : (
                    <p className="text-xs mt-1">Tente buscar pelo nome ou número do WhatsApp.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      className="w-full flex items-center gap-3 rounded-xl border border-transparent bg-background px-3 py-3 text-left transition-colors hover:bg-muted/60 hover:border-border disabled:opacity-60"
                      onClick={() => handleCreateConversation(contact)}
                      disabled={creatingConversationId !== null}
                    >
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                          {contact.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phone || "Sem número cadastrado"}
                        </p>
                      </div>
                      {creatingConversationId === contact.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                      ) : (
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Atribuir conversa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Buscar membro da equipe..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="rounded-full bg-muted/50"
            />
            <ScrollArea className="h-[200px]">
              {filteredMembers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Nenhum membro encontrado
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMembers.map((member) => {
                    const memberName = getMemberName(member);
                    const memberUserId = getMemberUserId(member);
                    const wl = agentsWorkload.find((w) => w.agentId === memberUserId);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors text-left"
                        onClick={() => handleAssign(memberUserId)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {memberName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{memberName}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.role || getMemberEmail(member) || "Equipe"}
                          </p>
                        </div>
                        {wl && (
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                wl.openConversations > 10
                                  ? "bg-red-50 text-red-600"
                                  : wl.openConversations > 5
                                    ? "bg-orange-50 text-orange-600"
                                    : "bg-green-50 text-green-600"
                              }`}
                            >
                              {wl.openConversations} ativas
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transferir conversa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Buscar setor ou responsável..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="rounded-full bg-muted/50"
            />
            <ScrollArea className="h-[200px]">
              {filteredMembers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Nenhum membro encontrado
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMembers.map((member) => {
                    const memberName = getMemberName(member);
                    const memberUserId = getMemberUserId(member);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors text-left"
                        onClick={() => handleTransfer(memberUserId)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {memberName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{memberName}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.role || getMemberEmail(member) || "Equipe"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSnoozeDialog} onOpenChange={setShowSnoozeDialog}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-primary" />
              Snooze da conversa
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              Selecione por quanto tempo adiar esta conversa:
            </p>
            {SNOOZE_OPTIONS.map((opt) => (
              <Button
                key={opt.hours}
                variant="outline"
                className="w-full justify-start text-sm"
                onClick={() => handleSnoozeOption(opt.hours)}
              >
                <AlarmClock className="h-4 w-4 mr-2 text-muted-foreground" />
                {opt.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BroadcastModal open={showBroadcastModal} onClose={() => setShowBroadcastModal(false)} />

      <ConfirmationsModal
        open={showConfirmationsModal}
        onClose={() => setShowConfirmationsModal(false)}
        onSendConfirmation={handleSendConfirmation}
      />
    </MainLayout>
  );
}
