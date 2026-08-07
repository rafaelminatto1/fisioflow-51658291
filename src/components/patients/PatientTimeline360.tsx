import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  FileText, 
  MessageSquare, 
  DollarSign, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useAppointments } from "@/hooks/useAppointmentsData";
import { useLeadHistorico } from "@/hooks/useLeads";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientTimeline360Props {
  patientId?: string;
  leadId?: string;
  patientName?: string;
}

export function PatientTimeline360({ patientId, leadId, patientName }: PatientTimeline360Props) {
  const { data: appointments = [] } = useAppointments({
    patientId: patientId || undefined,
  });

  const { data: leadHistorico = [] } = useLeadHistorico(leadId);

  // Consolidação de todos os eventos em linha do tempo cronológica
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      date: Date;
      type: "appointment" | "contact" | "note" | "financial";
      title: string;
      description?: string;
      status?: string;
      icon: React.ReactNode;
      badgeColor: string;
    }> = [];

    // Agendamentos
    appointments.forEach((app) => {
      const date = app.date ? new Date(app.date) : new Date();
      events.push({
        id: `app-${app.id}`,
        date,
        type: "appointment",
        title: `Sessão de Fisioterapia — ${app.status || "agendada"}`,
        description: app.notes || app.tipo_atendimento || "Atendimento agendado na clínica",
        status: app.status,
        icon: <Calendar className="w-4 h-4 text-blue-500" />,
        badgeColor: app.status === "concluido" 
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
          : "bg-blue-500/10 text-blue-600 border-blue-500/20",
      });
    });

    // Histórico de Contato / CRM
    leadHistorico.forEach((hist) => {
      const date = hist.created_at ? new Date(hist.created_at) : new Date();
      events.push({
        id: `hist-${hist.id}`,
        date,
        type: "contact",
        title: `Interação ${hist.tipo_contato || "WhatsApp"}`,
        description: hist.descricao || "Contato registrado no histórico comercial",
        status: hist.resultado,
        icon: <MessageSquare className="w-4 h-4 text-emerald-500" />,
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      });
    });

    // Ordenação decrescente por data
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [appointments, leadHistorico]);

  return (
    <Card className="border shadow-xs">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Clock className="w-4 h-4 text-primary" />
            Linha do Tempo 360° do Paciente
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            {timelineEvents.length} eventos registrados
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {timelineEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Nenhum evento registrado no histórico 360° ainda.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timelineEvents.map((event) => (
              <div key={event.id} className="relative flex items-start gap-3 text-xs group">
                {/* Marcador da Timeline */}
                <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-white dark:bg-slate-950 border shadow-2xs">
                  {event.icon}
                </div>

                <div className="flex-1 bg-slate-50/60 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{event.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {format(event.date, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {event.status && (
                    <div className="mt-2">
                      <Badge variant="outline" className={`text-[10px] uppercase font-semibold ${event.badgeColor}`}>
                        {event.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
