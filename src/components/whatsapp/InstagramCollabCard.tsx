import { useState } from "react";
import { ExternalLink, CheckCircle2, XCircle, MessageCircle, Sparkles, Layers } from "lucide-react";
import { Instagram } from "@/components/icons/InstagramIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type InstagramAttachmentData } from "@/features/whatsapp/messageDisplay";

interface InstagramCollabCardProps {
  data: InstagramAttachmentData;
  onAccept?: () => void;
  onDecline?: () => void;
  onReply?: (templateText: string) => void;
  onOpenModal?: () => void;
  isOutbound?: boolean;
}

export function InstagramCollabCard({
  data,
  onAccept,
  onDecline,
  onReply,
  onOpenModal,
  isOutbound,
}: InstagramCollabCardProps) {
  const [localStatus, setLocalStatus] = useState<"pendente" | "aceito" | "recusado">(data.status);

  const handleAccept = () => {
    setLocalStatus("aceito");
    onAccept?.();
    if (data.postUrl) {
      window.open(data.postUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDecline = () => {
    setLocalStatus("recusado");
    onDecline?.();
  };

  return (
    <div className="w-full max-w-[340px] overflow-hidden rounded-xl border border-border/80 bg-gradient-to-b from-background to-muted/30 shadow-sm transition-all hover:shadow-md">
      {/* Top Gradient Bar with Instagram Branding */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 via-purple-600 to-indigo-600" />

      <div className="p-3.5 space-y-3">
        {/* Header: Badge + Title */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1px] text-white">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-black/40 backdrop-blur-xs">
                <Instagram className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <span className="text-[11px] font-bold tracking-tight text-foreground/90 uppercase">
              {data.isCollabCandidate ? "Proposta de Collab" : "Post do Instagram"}
            </span>
          </div>

          <Badge
            variant={
              localStatus === "aceito"
                ? "default"
                : localStatus === "recusado"
                  ? "destructive"
                  : "outline"
            }
            className={`text-[10px] font-semibold px-2 py-0.5 ${
              localStatus === "aceito"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : localStatus === "pendente"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : ""
            }`}
          >
            {localStatus === "aceito" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {localStatus === "recusado" && <XCircle className="h-3 w-3 mr-1" />}
            {localStatus === "pendente" ? "Pendente" : localStatus === "aceito" ? "Aceita" : "Recusada"}
          </Badge>
        </div>

        {/* Creator Info */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white font-bold text-xs shadow-xs">
            {data.subtitle.charAt(1).toUpperCase() || "I"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{data.subtitle}</p>
            <p className="text-[10px] text-muted-foreground truncate">{data.title}</p>
          </div>
        </div>

        {/* Media Preview or Fallback Visual Card */}
        <div
          onClick={onOpenModal}
          className="group relative cursor-pointer overflow-hidden rounded-lg border border-border/60 bg-muted/40 transition-all hover:border-primary/40 hover:opacity-95"
        >
          {data.mediaUrl ? (
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <img
                src={data.mediaUrl}
                alt={data.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
                <span className="text-[10px] font-medium backdrop-blur-md bg-black/40 px-2 py-0.5 rounded-full">
                  Clique para expandir
                </span>
                <Sparkles className="h-3.5 w-3.5 opacity-80" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-gradient-to-br from-purple-500/10 via-rose-500/10 to-amber-500/10 border border-dashed border-rose-500/30 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px] shadow-sm mb-2">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                  <Layers className="h-5 w-5 text-rose-500" />
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground">Conteúdo da Publicação</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                {data.description}
              </p>
            </div>
          )}
        </div>

        {/* Caption snippet */}
        {data.description && (
          <p className="text-xs text-foreground/90 leading-snug line-clamp-3 bg-muted/30 p-2 rounded-md border border-border/40 font-normal">
            "{data.description}"
          </p>
        )}

        {/* Note about native IG approval */}
        {data.isCollabCandidate && localStatus === "pendente" && !isOutbound && (
          <p className="text-[10px] text-muted-foreground italic bg-amber-500/5 border border-amber-500/20 p-1.5 rounded text-amber-700 dark:text-amber-300">
            💡 Aceitar enviará uma confirmação no Direct e abrirá o link direto no Instagram para confirmar a coautoria.
          </p>
        )}

        {/* Interactive Action Buttons */}
        {!isOutbound && (
          <div className="space-y-1.5 pt-1">
            {localStatus === "pendente" ? (
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Aceitar Collab
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecline}
                  className="h-8 text-xs font-medium border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Recusar
                </Button>
              </div>
            ) : null}

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  onReply?.(
                    localStatus === "aceito"
                      ? "Olá! Aceitamos a proposta de colaboração no post do Instagram. Vamos seguir com a parceria!"
                      : "Olá! Agradecemos o interesse na colaboração, mas no momento não conseguiremos aceitar este post. Um abraço!"
                  )
                }
                className="h-7 flex-1 text-[11px] font-medium"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Responder
              </Button>

              {data.postUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(data.postUrl, "_blank", "noopener,noreferrer")}
                  className="h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Instagram
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
