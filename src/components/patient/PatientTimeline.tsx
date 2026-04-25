import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { TimelineEntry, usePatientTimeline } from "@/hooks/usePatientTimeline";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Mail, MessageSquare, Phone, Stethoscope, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClinicalText } from "@/lib/evolution/formatters";

interface PatientTimelineProps {
  patientId: string | undefined;
}

type SoapSectionKey = "subjective" | "objective" | "assessment" | "plan";

const SOAP_SECTION_LABELS: Array<{
  key: SoapSectionKey;
  title: string;
}> = [
  { key: "subjective", title: "Subjetivo" },
  { key: "objective", title: "Objetivo" },
  { key: "assessment", title: "Avaliação" },
  { key: "plan", title: "Plano" },
];

export function PatientTimeline({ patientId }: PatientTimelineProps) {
  const { data: entries = [], isLoading } = usePatientTimeline(patientId);
  const navigate = useNavigate();

  const translateStatus = (status?: string) => {
    switch ((status ?? "").toLowerCase()) {
      case "draft":
        return "Rascunho";
      case "finalized":
        return "Finalizada";
      case "scheduled":
        return "Agendada";
      case "confirmed":
        return "Confirmada";
      case "cancelled":
        return "Cancelada";
      case "completed":
        return "Concluída";
      case "pending":
        return "Pendente";
      case "sent":
      case "enviado":
        return "Enviado";
      case "failed":
        return "Falhou";
      case "delivered":
        return "Entregue";
      case "read":
        return "Lido";
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : "";
    }
  };

  const getStatusDotClass = (status?: string) => {
    switch ((status ?? "").toLowerCase()) {
      case "completed":
      case "confirmed":
      case "finalized":
      case "sent":
      case "enviado":
      case "delivered":
      case "read":
        return "bg-green-500";
      case "cancelled":
      case "failed":
        return "bg-red-500";
      default:
        return "bg-amber-500";
    }
  };

  const formatClockTime = (value?: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      return trimmed.slice(0, 5);
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;

    return format(parsed, "HH:mm", { locale: ptBR });
  };

  const formatAppointmentLabel = (entry: TimelineEntry) => {
    const start = formatClockTime(entry.start_time);
    const end = formatClockTime(entry.end_time);

    if (start && end) {
      return `Sessão agendada para ${start} às ${end}`;
    }

    if (start) {
      return `Sessão agendada para ${start}`;
    }

    return "Sessão agendada";
  };

  const openEvolution = (entry: TimelineEntry, section?: SoapSectionKey) => {
    if (!patientId || entry.entry_type !== "evolution") return;
    const params = new URLSearchParams({ sessionId: entry.id });
    if (section) params.set("section", section);
    navigate(`/prontuario/${patientId}?${params.toString()}`);
  };

  const getEntryIcon = (entry: TimelineEntry) => {
    switch (entry.entry_type) {
      case "appointment":
        return <Calendar className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      case "sms":
        return <Phone className="h-4 w-4" />;
      case "evolution":
        return <Stethoscope className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEntryColor = (entry: TimelineEntry) => {
    if (entry.category === "clinical") return "bg-blue-500/10 text-blue-600 border-blue-200";
    return "bg-purple-500/10 text-purple-600 border-purple-200";
  };

  const renderEvolutionSections = (entry: TimelineEntry) => {
    const sections = SOAP_SECTION_LABELS.filter(({ key }) => Boolean(entry[key]));

    if (sections.length === 0) {
      return (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {entry.body || "Sem detalhes"}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {sections.map(({ key, title }) => {
          const value = entry[key];
          if (!value) return null;

          return (
            <button
              key={key}
              type="button"
              onClick={() => openEvolution(entry, key)}
              className="w-full rounded-xl border border-border/30 bg-background/80 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-primary">
                {title}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                {formatClinicalText(value)}
              </p>
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center p-12 bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Sem atividades registradas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/40 before:to-transparent">
      {entries.map((entry) => (
        <div key={entry.id} className="relative flex items-start gap-6 group">
          {/* dot */}
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shadow-sm z-10 shrink-0 transition-transform group-hover:scale-110",
              getEntryColor(entry),
            )}
          >
            {getEntryIcon(entry)}
          </div>

          <div className="flex-1 pb-6 border-b border-border/40 last:border-0">
            <div className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black uppercase tracking-tight">
                  {entry.entry_type === "appointment"
                    ? "Agendamento"
                    : entry.entry_type === "evolution"
                      ? "Evolução SOAP"
                      : `Mensagem: ${entry.entry_type}`}
                </h4>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase tracking-tighter h-4 px-1.5"
                >
                  {entry.category === "clinical" ? "Clínico" : "Comunicação"}
                </Badge>
              </div>
              <time className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">
                {format(new Date(entry.created_at), "dd MMM · HH:mm", {
                  locale: ptBR,
                })}
              </time>
            </div>

            <div className="bg-muted/30 rounded-2xl p-3 border border-border/20 transition-all hover:bg-muted/50 hover:shadow-premium-sm">
              {entry.subject && entry.entry_type !== "evolution" && (
                <p className="text-xs font-bold mb-1 text-foreground/80">{entry.subject}</p>
              )}
              {entry.entry_type === "evolution" ? (
                renderEvolutionSections(entry)
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {entry.body ||
                    (entry.entry_type === "appointment"
                      ? formatAppointmentLabel(entry)
                      : "Sem detalhes")}
                </p>
              )}

              {entry.status && (
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/20">
                  <div
                    className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClass(entry.status))}
                  />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Status: {translateStatus(entry.status)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
