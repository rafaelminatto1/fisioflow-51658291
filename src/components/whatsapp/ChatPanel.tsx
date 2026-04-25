import { useEffect, useState, useMemo, useRef } from "react";
import {
  MessageCircle,
  Loader2,
  Paperclip,
  StickyNote,
  LayoutTemplate,
  AlertTriangle,
  Send,
  MoreVertical,
  Trash2,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWhatsAppConversation } from "@/hooks/useWhatsApp";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import { fetchQuickReplies, type Message, type QuickReply } from "@/services/whatsapp-api";
import { uploadFile } from "@/lib/storage/upload";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
import { ptBR } from "date-fns/locale";
import { MessageBubble } from "./MessageBubble";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30",
  pending:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30",
  resolved:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  closed:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30",
};

interface ChatPanelProps {
  selectedId: string | null;
  onAddNote: (content: string) => Promise<void> | void;
  quickReplyText: string | null;
  onQuickReplyUsed: () => void;
  onMessageSent?: () => Promise<void> | void;
  onConversationDeleted?: () => Promise<void> | void;
}

export function ChatPanel({
  selectedId,
  onAddNote,
  quickReplyText,
  onQuickReplyUsed,
  onMessageSent,
  onConversationDeleted,
}: ChatPanelProps) {
  const {
    conversation,
    messages,
    loading,
    sendMessage,
    updateMessage,
    deleteMessage,
    deleteConversation,
    refetch,
  } = useWhatsAppConversation(selectedId);
  const { data: templates = [] } = useWhatsAppTemplates();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [attachment, setAttachment] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const is24hWindowOpen = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    const lastInboundMsg = [...messages].reverse().find((m) => m.direction === "inbound");
    if (!lastInboundMsg) return false;
    const diff = new Date().getTime() - new Date(lastInboundMsg.timestamp).getTime();
    return diff <= 24 * 60 * 60 * 1000;
  }, [messages]);

  const handleSendTemplate = async (templateName: string, templateLanguage: string = "pt_BR") => {
    if (sending) return;
    setSending(true);
    try {
      await sendMessage(`[Template: ${templateName}]`, {
        type: "template",
        templateName,
        templateLanguage,
      });
      toast.success("Template enviado com sucesso");
      await onMessageSent?.();
    } catch (error) {
      toast.error("Erro ao enviar template");
    } finally {
      setSending(false);
    }
  };

  // Slash command state
  const [slashQuery, setSlashQuery] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [allQuickReplies, setAllQuickReplies] = useState<QuickReply[]>([]);

  useEffect(() => {
    fetchQuickReplies()
      .then(setAllQuickReplies)
      .catch(() => {});
  }, []);

  const slashFiltered = slashQuery
    ? allQuickReplies
        .filter(
          (qr) => accentIncludes(qr.name, slashQuery) || accentIncludes(qr.content, slashQuery),
        )
        .slice(0, 5)
    : allQuickReplies.slice(0, 5);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (quickReplyText) {
      setInput(quickReplyText);
      onQuickReplyUsed();
    }
  }, [quickReplyText, onQuickReplyUsed]);

  if (!selectedId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/20">
        <div className="text-center max-w-sm px-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">WhatsApp Web CRM</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Selecione uma conversa na lista ao lado para começar a interagir com seus pacientes e
            gerenciar atendimentos.
          </p>
        </div>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Carregando conversa...</span>
        </div>
      </div>
    );
  }

  if (!conversation) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : file.name;

    setAttachment({ file, preview });
    e.target.value = "";
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || sending) return;
    setSending(true);
    try {
      if (attachment) {
        setUploading(true);
        const upload = await uploadFile(attachment.file, {
          folder: "whatsapp-attachments",
        });
        await sendMessage(input.trim(), {
          type: attachment.file.type.startsWith("image/") ? "image" : "document",
          attachmentUrl: upload.url,
        });
        setUploading(false);
      } else {
        await sendMessage(input.trim());
      }
      setInput("");
      setAttachment(null);
      await onMessageSent?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[WhatsAppInbox] Failed to send message from chat panel", {
        conversationId: selectedId,
        hasAttachment: Boolean(attachment),
        messageLength: input.trim().length,
        error,
      });
      toast.error("Mensagem não enviada", {
        description: errorMessage,
      });
      setUploading(false);
      void refetch();
    } finally {
      setSending(false);
    }
  };

  const handleNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await onAddNote(noteContent.trim());
      setNoteContent("");
      setShowNoteDialog(false);
      toast.success("Nota interna adicionada");
      void refetch();
    } catch (error) {
      toast.error("Não foi possível adicionar a nota", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const openEditMessage = (messageToEdit: Message) => {
    const currentContent =
      typeof messageToEdit.content === "string"
        ? messageToEdit.content
        : JSON.stringify(messageToEdit.content);
    setEditingMessage(messageToEdit);
    setEditContent(currentContent);
  };

  const handleSaveMessageEdit = async () => {
    if (!editingMessage || !editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateMessage(editingMessage.id, editContent.trim());
      setEditingMessage(null);
      setEditContent("");
      toast.success("Mensagem editada");
      await onMessageSent?.();
    } catch (error) {
      toast.error("Não foi possível editar a mensagem", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMessage = async (messageToDelete: Message, scope: "local" | "everyone") => {
    const confirmText =
      scope === "everyone"
        ? "Apagar esta mensagem para todos no atendimento? O WhatsApp permite essa ação apenas dentro do prazo padrão."
        : "Apagar esta mensagem no FisioFlow?";
    if (!window.confirm(confirmText)) return;

    try {
      await deleteMessage(messageToDelete.id, { scope });
      toast.success(
        scope === "everyone" ? "Mensagem marcada como apagada para todos" : "Mensagem apagada",
      );
      await onMessageSent?.();
    } catch (error) {
      toast.error("Não foi possível apagar a mensagem", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDeleteConversation = async () => {
    if (
      !window.confirm("Excluir esta conversa da inbox? O histórico será preservado para auditoria.")
    ) {
      return;
    }

    try {
      await deleteConversation("Excluida pela inbox");
      toast.success("Conversa excluída da inbox");
      await onConversationDeleted?.();
    } catch (error) {
      toast.error("Não foi possível excluir a conversa", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    const lastSegment = val.split(/[\s\n]/).pop() ?? "";
    if (lastSegment.startsWith("/")) {
      setSlashQuery(lastSegment.slice(1));
      setShowSlashMenu(true);
      setSlashIndex(0);
    } else {
      setShowSlashMenu(false);
      setSlashQuery("");
    }
  };

  const applySlashReply = (content: string) => {
    const lastIdx = Math.max(input.lastIndexOf(" "), input.lastIndexOf("\n"));
    const newInput = lastIdx >= 0 ? input.slice(0, lastIdx + 1) + content : content;
    setInput(newInput);
    setShowSlashMenu(false);
    setSlashQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, slashFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (slashFiltered[slashIndex]) applySlashReply(slashFiltered[slashIndex].content);
      } else if (e.key === "Escape") {
        setShowSlashMenu(false);
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/30 dark:bg-background relative">
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at center, #000 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      ></div>

      <div className="h-16 border-b px-5 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border shadow-sm">
            <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
              {conversation.contactName?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-semibold">{conversation.contactName}</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{conversation.contactPhone}</p>
              {conversation.patientName && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="text-[11px] text-primary font-medium">
                    {conversation.patientName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={`${STATUS_COLORS[conversation.status] || ""} font-medium shadow-sm`}
          >
            {conversation.status === "open"
              ? "Aberta"
              : conversation.status === "pending"
                ? "Pendente"
                : conversation.status === "resolved"
                  ? "Resolvida"
                  : "Fechada"}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDeleteConversation}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 z-10">
        <div className="py-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="bg-background border shadow-sm rounded-lg px-4 py-3 text-center max-w-sm">
                <p className="text-sm font-medium text-foreground mb-1">Nova Conversa</p>
                <p className="text-xs text-muted-foreground">
                  Esta é sua primeira interação. Envie uma mensagem para começar.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg, index) => {
                const prevMsg = messages[index - 1];
                const showDate =
                  !prevMsg ||
                  new Date(msg.timestamp).toDateString() !==
                    new Date(prevMsg.timestamp).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-6">
                        <span className="text-[11px] font-medium bg-background border shadow-sm px-3 py-1 rounded-full text-muted-foreground uppercase tracking-wider">
                          {new Date(msg.timestamp).toLocaleDateString(ptBR.code, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      message={msg}
                      onEdit={openEditMessage}
                      onDelete={handleDeleteMessage}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t z-10 shrink-0">
        {attachment && (
          <div className="mb-3 flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            {attachment.file.type.startsWith("image/") ? (
              <img
                src={attachment.preview}
                alt="Attachment preview"
                className="h-12 w-12 object-cover rounded"
              />
            ) : (
              <div className="h-12 w-12 bg-primary/10 rounded flex items-center justify-center">
                <Paperclip className="h-5 w-5 text-primary" />
              </div>
            )}
            <span className="text-sm truncate flex-1">{attachment.file.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setAttachment(null)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-3 max-w-5xl mx-auto">
          <div className="flex gap-1.5 pb-1">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={() => setShowNoteDialog(true)}
              title="Adicionar Nota Interna"
            >
              <StickyNote className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Enviar Template"
                >
                  <LayoutTemplate className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 mb-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Templates Aprovados
                </div>
                {templates.filter(
                  (t: any) => (t?.status || "").toString().toUpperCase() === "APPROVED",
                ).length === 0 ? (
                  <DropdownMenuItem disabled>Nenhum template aprovado</DropdownMenuItem>
                ) : (
                  templates
                    .filter((t: any) => (t?.status || "").toString().toUpperCase() === "APPROVED")
                    .map((t: any) => (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => handleSendTemplate(t.name, t.language)}
                      >
                        <div className="flex flex-col gap-1 w-full">
                          <span className="font-medium">{t.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate w-full block">
                            {Array.isArray(t.components)
                              ? t.components.find((c: any) => c.type === "BODY")?.text
                              : t.content || "..."}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex-1 relative">
            {showSlashMenu && slashFiltered.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
                  Respostas rápidas — <kbd className="bg-border px-1 rounded">↑↓</kbd> navegar ·{" "}
                  <kbd className="bg-border px-1 rounded">Enter</kbd> inserir
                </div>
                {slashFiltered.map((qr, i) => (
                  <button
                    key={qr.id}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 transition-colors ${i === slashIndex ? "bg-primary/10" : "hover:bg-muted/50"}`}
                    onClick={() => applySlashReply(qr.content)}
                    onMouseEnter={() => setSlashIndex(i)}
                  >
                    <div className="font-medium text-xs">/{qr.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{qr.content}</div>
                  </button>
                ))}
              </div>
            )}

            {!is24hWindowOpen ? (
              <div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-500 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Janela de 24h Fechada
                </div>
                <p className="text-xs opacity-90">
                  O paciente não interagiu nas últimas 24h. Para retomar o contato, você precisa
                  enviar um modelo aprovado pela Meta.
                </p>
              </div>
            ) : (
              <div className="bg-muted/60 dark:bg-muted/40 rounded-3xl border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-colors flex items-end min-h-[44px]">
                <Textarea
                  placeholder="Digite uma mensagem... (/ para respostas rápidas)"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="min-h-[44px] max-h-[120px] bg-transparent border-none resize-none py-3 px-4 shadow-none focus-visible:ring-0 text-[15px]"
                  rows={1}
                />
              </div>
            )}
          </div>
          <Button
            size="icon"
            className={`h-11 w-11 rounded-full shrink-0 shadow-md transition-all ${
              input.trim() || attachment
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={handleSend}
            disabled={!is24hWindowOpen || sending || (!input.trim() && !attachment) || uploading}
          >
            {sending || uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
              <StickyNote className="h-5 w-5" />
              Adicionar nota interna
            </DialogTitle>
            <DialogDescription>
              Registre uma observação privada para a equipe nesta conversa.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              placeholder="Escreva uma nota que ficará visível apenas para sua equipe..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
              className="resize-none border-amber-200 focus-visible:ring-amber-500/30"
            />
            <p className="text-xs text-muted-foreground mt-2">
              O paciente não verá esta nota. Ela será salva no histórico da conversa.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleNote}
              disabled={!noteContent.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Salvar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingMessage)}
        onOpenChange={(open) => {
          if (!open && !savingEdit) {
            setEditingMessage(null);
            setEditContent("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Editar mensagem
            </DialogTitle>
            <DialogDescription>
              A edição será salva no histórico da mensagem para auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              placeholder="Digite o novo conteúdo da mensagem..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setEditingMessage(null);
                setEditContent("");
              }}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveMessageEdit} disabled={!editContent.trim() || savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar edição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
