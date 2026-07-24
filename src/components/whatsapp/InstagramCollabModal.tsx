import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, CheckCircle2, XCircle, Send, Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Instagram } from "@/components/icons/InstagramIcon";
import type { InstagramAttachmentData } from "@/features/whatsapp/messageDisplay";

interface InstagramCollabModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InstagramAttachmentData | null;
  onSendReply?: (text: string) => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function InstagramCollabModal({
  open,
  onOpenChange,
  data,
  onSendReply,
  onAccept,
  onDecline,
}: InstagramCollabModalProps) {
  if (!data) return null;

  const [status, setStatus] = useState<"pendente" | "aceito" | "recusado">(data.status);
  const [replyText, setReplyText] = useState(
    "Olá! Recebemos sua proposta de colaboração no Instagram e achamos excelente a iniciativa."
  );

  const handleAccept = () => {
    setStatus("aceito");
    onAccept?.();
    if (data.postUrl) {
      window.open(data.postUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDecline = () => {
    setStatus("recusado");
    onDecline?.();
  };

  const handleSend = () => {
    if (replyText.trim()) {
      onSendReply?.(replyText);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-border bg-background shadow-2xl">
        {/* Top Instagram Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 via-purple-600 to-indigo-600" />

        <DialogHeader className="p-4 pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                  <Instagram className="h-4 w-4 text-rose-500" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {data.title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{data.subtitle}</p>
              </div>
            </div>

            <Badge
              variant={status === "aceito" ? "default" : status === "recusado" ? "destructive" : "outline"}
              className={`text-xs font-semibold px-2.5 py-1 ${
                status === "aceito"
                  ? "bg-emerald-600 text-white"
                  : status === "pendente"
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : ""
              }`}
            >
              {status === "aceito" && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              {status === "recusado" && <XCircle className="h-3.5 w-3.5 mr-1" />}
              {status === "pendente" ? "Pendente no CRM" : status === "aceito" ? "Collab Aceita" : "Recusada"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Simulated Instagram Post View */}
          <div className="rounded-xl border border-border/80 bg-black/5 dark:bg-black/40 overflow-hidden shadow-inner">
            {/* Post Header */}
            <div className="flex items-center justify-between p-3 bg-background/80 backdrop-blur-xs border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-[1.5px]">
                  <div className="h-full w-full rounded-full bg-background flex items-center justify-center text-[10px] font-bold">
                    {data.authorUsername?.charAt(0).toUpperCase() || "I"}
                  </div>
                </div>
                <span className="text-xs font-bold text-foreground">
                  @{data.authorUsername?.replace(/^@/, "")}
                </span>
              </div>
              {data.postUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(data.postUrl, "_blank", "noopener,noreferrer")}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Abrir no Instagram
                </Button>
              )}
            </div>

            {/* Media Box */}
            {data.mediaUrl ? (
              <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                <img src={data.mediaUrl} alt={data.title} className="max-h-[320px] w-full object-contain" />
              </div>
            ) : (
              <div className="py-10 px-4 text-center bg-gradient-to-br from-purple-500/10 via-rose-500/10 to-amber-500/10">
                <Instagram className="h-12 w-12 text-rose-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-foreground">Prévia da Mídia Compartilhada</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  {data.description}
                </p>
              </div>
            )}

            {/* Simulated Action Bar */}
            <div className="flex items-center justify-between p-3 bg-background/80 border-t border-border/40">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Heart className="h-5 w-5 hover:text-rose-500 cursor-pointer" />
                <MessageCircle className="h-5 w-5 hover:text-foreground cursor-pointer" />
                <Share2 className="h-5 w-5 hover:text-foreground cursor-pointer" />
              </div>
              <Bookmark className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer" />
            </div>

            {/* Caption & Collab Details */}
            <div className="p-3 bg-background border-t border-border/40 text-xs text-foreground leading-relaxed space-y-1.5">
              <p>
                <span className="font-bold mr-1.5">@{data.authorUsername?.replace(/^@/, "")}</span>
                {data.description}
              </p>
            </div>
          </div>

          {/* Quick Actions & Status Change */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Ações Rápidas da Proposta:</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={status === "aceito" ? "default" : "outline"}
                  onClick={handleAccept}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Aceitar Collab
                </Button>
                <Button
                  size="sm"
                  variant={status === "recusado" ? "destructive" : "outline"}
                  onClick={handleDecline}
                  className="h-8 text-xs text-rose-600 border-rose-200 dark:border-rose-900"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Recusar
                </Button>
              </div>
            </div>

            {/* Message Reply Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Enviar Resposta no Direct:
              </label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Escreva sua resposta para o remetente no Instagram..."
                className="text-xs resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Fechar
          </Button>
          <Button size="sm" onClick={handleSend} className="text-xs font-medium gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Enviar no Direct
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
