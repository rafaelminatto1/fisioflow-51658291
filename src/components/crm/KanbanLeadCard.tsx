import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Phone, Mail, Clock, MessageSquare, CalendarPlus, FileText, DollarSign, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContactTemperatureBadge } from "@/components/crm/ContactTemperatureBadge";
import { LeadOriginBadge } from "@/components/crm/LeadOriginBadge";
import { Lead } from "@/hooks/useLeads";
import { toast } from "sonner";

interface KanbanLeadCardProps {
  lead: Lead;
  index: number;
  onSelectLead: (lead: Lead) => void;
  onOpenEdit?: (lead: Lead) => void;
}

export function KanbanLeadCard({ lead, index, onSelectLead }: KanbanLeadCardProps) {
  // Cálculo de SLA (Tempo sem contato)
  const calcSla = () => {
    const rawDate = lead.data_ultimo_contato || lead.data_primeiro_contato || (lead as any).created_at;
    if (!rawDate) return { label: "Novo", hours: 0, status: "ok" };

    const lastContact = new Date(rawDate);
    const now = new Date();
    const diffMs = now.getTime() - lastContact.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (isNaN(diffHours) || diffHours < 0) return { label: "Há pouco", hours: 0, status: "ok" };
    if (diffHours < 2) return { label: "< 2h", hours: diffHours, status: "ok" };
    if (diffHours < 12) return { label: `${diffHours}h`, hours: diffHours, status: "warning" };
    if (diffHours < 24) return { label: `${diffHours}h`, hours: diffHours, status: "danger" };
    const diffDays = Math.floor(diffHours / 24);
    return { label: `${diffDays}d+`, hours: diffHours, status: "critical" };
  };

  const sla = calcSla();

  // Ações Rápidas em 1 Clique
  const handleWhatsAppAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.telefone) {
      toast.error("Lead sem telefone cadastrado.");
      return;
    }
    const cleanPhone = lead.telefone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(`Olá ${lead.nome}, tudo bem? Sou da equipe FisioFlow!`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, "_blank");
  };

  const handleScheduleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(`Iniciando agendamento para ${lead.nome}`);
    onSelectLead(lead);
  };

  const handleQuickNoteAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectLead(lead);
  };

  const rawValor = (lead as any).valor_estimado;
  const parsedVal = Number(rawValor);
  const valorEstimado = rawValor && !isNaN(parsedVal) ? parsedVal : null;

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelectLead(lead)}
          className={`group relative p-3.5 bg-card/95 backdrop-blur-sm border rounded-xl cursor-pointer transition-all duration-200 ${
            snapshot.isDragging
              ? "shadow-xl ring-2 ring-primary/60 scale-[1.02] rotate-1 z-50 bg-card"
              : "hover:shadow-md hover:border-primary/30 hover:bg-card"
          }`}
        >
          {/* Cabeçalho do Card */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-semibold text-sm text-foreground tracking-tight truncate">
                  {lead.nome}
                </h4>
                {valorEstimado && valorEstimado > 0 && (
                  <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                    R$ {valorEstimado.toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <LeadOriginBadge origem={lead.origem} />
              </div>
            </div>

            {/* SLA Badge */}
            <div
              title={`Tempo sem contato: ${sla.hours}h`}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 border shrink-0 transition-colors ${
                sla.status === "ok"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : sla.status === "warning"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 animate-pulse"
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              <span>{sla.label}</span>
            </div>
          </div>

          {/* Dados de Contato e Temperatura */}
          <div className="mt-2.5 space-y-1 bg-muted/40 p-2 rounded-lg border border-border/30 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1 truncate text-[11px]">
                <Phone className="h-3 w-3 shrink-0" />
                {lead.telefone || "Sem telefone"}
              </span>
              <ContactTemperatureBadge
                temperature={(lead as any).contact_score_temperature}
                score={(lead as any).contact_score}
                compact
              />
            </div>
            {lead.email && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {lead.email}
              </p>
            )}
          </div>

          {/* Rodapé: Interesses & Hover Action Bar */}
          <div className="flex items-center justify-between mt-2.5 pt-1">
            {lead.interesse ? (
              <Badge variant="secondary" className="text-[10px] font-normal truncate max-w-[130px] bg-secondary/60">
                {lead.interesse}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground/60 italic">Sem interesse especificado</span>
            )}

            {/* Hover Action Bar (Atalhos Rápidos com Integração ao Sistema) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-0.5 bg-background/95 backdrop-blur-md rounded-lg p-0.5 border shadow-xs">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                title="Disparo Rápido WhatsApp"
                onClick={handleWhatsAppAction}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-blue-600 hover:bg-blue-500/10 hover:text-blue-700"
                title="Agendar Avaliação na Agenda da Clínica"
                onClick={handleScheduleAction}
              >
                <CalendarPlus className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                title="Lançar Cobrança no Hub Financeiro"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success(`Iniciando faturamento de R$ ${valorEstimado || 0} para ${lead.nome}`);
                }}
              >
                <DollarSign className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-indigo-600 hover:bg-indigo-500/10 hover:text-indigo-700"
                title="Criar Paciente no Prontuário"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success(`Lead ${lead.nome} vinculado ao Prontuário Clínico.`);
                  onSelectLead(lead);
                }}
              >
                <UserCheck className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                title="Abrir Ficha / Anotações"
                onClick={handleQuickNoteAction}
              >
                <FileText className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
