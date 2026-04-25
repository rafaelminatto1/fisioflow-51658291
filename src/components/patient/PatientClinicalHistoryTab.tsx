import { Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useSoapRecordsV2 } from "@/hooks/useSoapRecordsV2";
import { useCreateSoapRecord } from "@/hooks/useSoapRecords";
import { usePatientEvaluationResponses } from "@/hooks/useEvaluationForms";
import { lazy } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarClock, CheckCircle2, Clock3, FileText, PlayCircle, XCircle } from "lucide-react";

const LazySessionHistoryPanel = lazy(() =>
  import("@/components/session/SessionHistoryPanel").then((m) => ({
    default: m.SessionHistoryPanel,
  })),
);

interface PatientClinicalHistoryTabProps {
  patientId: string;
}

const evaluationDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const statusConfig = {
  scheduled: {
    label: "Agendada",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CalendarClock,
    action: "Preencher",
  },
  in_progress: {
    label: "Em preenchimento",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock3,
    action: "Continuar",
  },
  completed: {
    label: "Concluída",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    action: "Ver",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-slate-50 text-slate-600 border-slate-200",
    icon: XCircle,
    action: "Ver",
  },
} as const;

function formatEvaluationDate(value?: string | null) {
  if (!value) return "Data não definida";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return evaluationDateFormatter.format(date);
}

export function PatientClinicalHistoryTab({ patientId }: PatientClinicalHistoryTabProps) {
  const navigate = useNavigate();
  const { data: records = [] } = useSoapRecordsV2(patientId);
  const { data: evaluations = [], isLoading: isLoadingEvaluations } =
    usePatientEvaluationResponses(patientId);
  const createSoapRecord = useCreateSoapRecord();
  const [replicatingId, setReplicatingId] = useState<string | null>(null);

  const sessions = useMemo(
    () =>
      records.map((record) => ({
        id: record.id,
        session_date: record.recordDate,
        subjective: record.subjective,
        objective: record.objective,
        assessment: record.assessment,
        plan: record.plan,
        created_at: record.createdAt,
        pain_level_after: 0,
      })),
    [records],
  );

  const handleReplicate = async (session: (typeof sessions)[0]) => {
    if (!session.plan) {
      toast.error("Esta sessão não tem plano para replicar");
      return;
    }

    setReplicatingId(session.id);
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      await createSoapRecord.mutateAsync({
        patient_id: patientId,
        record_date: dateStr,
        subjective: `Replicado de sessão ${session.session_date}`,
        objective: "",
        assessment: "",
        plan: session.plan,
      });
      toast.success("Conduta replicada com sucesso!");
    } catch (error) {
      toast.error("Erro ao replicar conduta");
      console.error(error);
    } finally {
      setReplicatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 p-6 shadow-premium-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
              <FileText className="h-5 w-5 text-blue-600" />
              Avaliações
            </h3>
            <p className="text-sm text-muted-foreground">
              Fichas agendadas, em preenchimento e concluídas deste paciente.
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-xl px-3 py-1">
            {evaluations.length} registros
          </Badge>
        </div>

        {isLoadingEvaluations ? (
          <LoadingSkeleton type="card" rows={2} />
        ) : evaluations.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold text-muted-foreground">
              Nenhuma avaliação registrada ainda.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use a biblioteca de templates ou inicie uma nova avaliação pelo cabeçalho do paciente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {evaluations.map((evaluation) => {
              const status = statusConfig[evaluation.status] ?? statusConfig.in_progress;
              const StatusIcon = status.icon;
              const date =
                evaluation.scheduled_for ||
                evaluation.completed_at ||
                evaluation.started_at ||
                evaluation.created_at;
              const answeredCount =
                evaluation.answered_count ?? Object.keys(evaluation.responses ?? {}).length;
              const fieldsCount = evaluation.fields_count ?? 0;
              const mode = evaluation.status === "completed" ? "&mode=view" : "";

              return (
                <div
                  key={evaluation.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`${status.className} gap-1.5 rounded-lg`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {formatEvaluationDate(date)}
                      </span>
                    </div>
                    <div>
                      <p className="truncate text-sm font-bold">
                        {evaluation.form_nome || "Avaliação sem nome"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {answeredCount} de {fieldsCount} campos respondidos
                      </p>
                    </div>
                  </div>

                  <Button
                    variant={evaluation.status === "completed" ? "outline" : "default"}
                    size="sm"
                    className="rounded-xl font-bold"
                    onClick={() =>
                      navigate(
                        `/patients/${patientId}/evaluations/new/${evaluation.form_id}?evaluationId=${evaluation.id}${mode}`,
                      )
                    }
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {status.action}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="h-[600px]">
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazySessionHistoryPanel
            sessions={sessions}
            onReplicate={handleReplicate}
            replicatingId={replicatingId}
          />
        </Suspense>
      </div>
    </div>
  );
}
