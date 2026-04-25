import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StickyNote, MoreVertical, Edit3, Trash2, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { WhatsAppMessage } from "./WhatsAppMessage";
import type { Message } from "@/services/whatsapp-api";

interface MessageBubbleProps {
  message: Message;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message, scope: "local" | "everyone") => void;
}

export function MessageBubble({ message, onEdit, onDelete }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const isNote = message.type === "note";
  const isDeleted = Boolean(message.deletedAt);
  const canEdit = Boolean(onEdit) && !isDeleted;
  const canDelete = Boolean(onDelete) && !isDeleted;
  const canDeleteForEveryone = canDelete && isOutbound && message.canDeleteForEveryone === true;
  const deleteForEveryoneExpired =
    canDelete &&
    isOutbound &&
    message.canDeleteForEveryone === false &&
    Boolean(message.deleteForEveryoneExpiresAt);
  const time = message.timestamp
    ? formatDistanceToNow(new Date(message.timestamp), {
        addSuffix: true,
        locale: ptBR,
      })
    : "";

  if (isNote) {
    return (
      <div className="flex justify-center my-4">
        <div className="max-w-[85%] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1.5">
            <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-wider">
              Nota interna
            </span>
            {message.senderName && (
              <span className="text-[11px] text-amber-600/80 dark:text-amber-500/80">
                · {message.senderName}
              </span>
            )}
          </div>
          <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
            {message.content as string}
          </p>
          <span className="text-[10px] text-amber-500/80 dark:text-amber-600 mt-2 block font-medium">
            {time}
            {message.editedAt ? " · editada" : ""}
          </span>
          {(canEdit || canDelete) && (
            <div className="mt-2 flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-amber-700 hover:text-amber-900"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit?.(message)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar nota
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={() => onDelete?.(message, "local")}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Apagar nota
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3`}>
        <div
          className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm relative ${
            isOutbound
              ? "bg-muted/30 text-muted-foreground rounded-tr-sm border border-border/20"
              : "bg-muted/10 text-muted-foreground rounded-tl-sm border border-border/20"
          }`}
        >
          <div className="flex items-center gap-2 text-[13px] italic opacity-80">
            <Trash2 className="h-3.5 w-3.5 opacity-60" />
            <span>
              {message.deleteScope === "everyone"
                ? "Esta mensagem foi apagada para todos"
                : "Esta mensagem foi apagada"}
            </span>
          </div>
          <div className="text-[10px] mt-1 text-muted-foreground/60 text-right">{time}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3 group`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm relative ${
          isOutbound
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-background border border-border/50 text-foreground rounded-tl-sm"
        }`}
      >
        <WhatsAppMessage message={message} />
        {(canEdit || canDelete) && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow-sm">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit?.(message)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar mensagem
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={() => onDelete?.(message, "local")}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Apagar no FisioFlow
                  </DropdownMenuItem>
                )}
                {canDeleteForEveryone && (
                  <DropdownMenuItem onClick={() => onDelete?.(message, "everyone")}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Apagar para todos
                  </DropdownMenuItem>
                )}
                {deleteForEveryoneExpired && (
                  <DropdownMenuItem disabled>Prazo para todos expirado</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {message.interactiveData && (
          <div className="mt-2 space-y-1.5">
            {message.interactiveData.buttons?.map((btn) => (
              <div
                key={btn.id}
                className={`text-xs px-3 py-1.5 rounded-md border font-medium text-center cursor-default ${
                  isOutbound
                    ? "border-primary-foreground/30 bg-primary-foreground/10"
                    : "border-border bg-muted/30"
                }`}
              >
                {btn.title}
              </div>
            ))}
          </div>
        )}
        <div
          className={`flex items-center gap-1.5 mt-1.5 select-none ${isOutbound ? "justify-end" : "justify-end"}`}
        >
          <span
            className={`text-[10px] font-medium ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}
          >
            {time}
            {message.editedAt ? " · editada" : ""}
          </span>
          {isOutbound && message.status && (
            <span
              className={`text-[10px] flex items-center ${
                message.status === "failed"
                  ? "text-red-200 font-semibold"
                  : message.status === "read"
                    ? "text-blue-300"
                    : "text-primary-foreground/70"
              }`}
            >
              {message.status === "failed"
                ? "Falha"
                : message.status === "read"
                  ? "✓✓"
                  : message.status === "delivered"
                    ? "✓✓"
                    : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
