import { Suspense, lazy, useMemo, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useSoapRecordsV2 } from "@/hooks/useSoapRecordsV2";
import { useCreateSoapRecord } from "@/hooks/useSoapRecords";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { usePatientEvaluationResponses } from "@/hooks/useEvaluationForms";
import { patientsApi } from "@/api/v2/patients";
import type { PatientMedicalRecord, PatientRow } from "@/types/workers";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Dumbbell,
  FileText,
  Goal,
  Pill,
  PlayCircle,
  ShieldAlert,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { formatAnyDate } from "@/lib/date-utils";

const LazySessionHistoryPanel = lazy(() =>
  import("@/components/session/SessionHistoryPanel").then((m) => ({
    default: m.SessionHistoryPanel,
  })),
);

interface PatientClinicalHistoryTabProps {
  patientId: string;
  patient?: Partial<PatientRow> | null;
}

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
  return formatAnyDate(value, "dd/MM/yyyy HH:mm", "Data inválida");
}

function asList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return String(record.name ?? record.allergen ?? record.text ?? record.value ?? "");
        }
        return String(item ?? "");
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return asList(JSON.parse(trimmed));
    } catch {
      return trimmed
        .split(/\n|;/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function latestZenFisioRecord(records: PatientMedicalRecord[]) {
  return records.find((record) => {
    const exam = record.physical_exam;
    return exam && typeof exam === "object" && exam.source === "zenfisio_evaluation_edit";
  });
}

function rawTextFromRecord(record?: PatientMedicalRecord) {
  const fields = record?.physical_exam?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return "";
  return Object.entries(fields as Record<string, unknown>)
    .map(([label, value]) => `${label}: ${String(value ?? "")}`)
    .join("\n");
}

function extractGoals(records: PatientMedicalRecord[], evaluations: Array<{ responses?: Record<string, unknown> | null }>) {
  const texts = [
    ...records.flatMap((record) => [record.medical_history, record.current_history, record.diagnosis]),
    ...evaluations.map((evaluation) => JSON.stringify(evaluation.responses ?? {})),
  ].filter((item): item is string => Boolean(item));

  const goals = new Set<string>();
  for (const text of texts) {
    if (/retorno\s+ao\s+esporte|gesto\s+esportivo|corrida|performance/i.test(text)) {
      goals.add("Retorno ao esporte/performance");
    }
    if (/redu[cç][aã]o\s+de\s+dor|analgesia|dor/i.test(text)) {
      goals.add("Redução de dor");
    }
    if (/for[cç]a|fortalecimento/i.test(text)) {
      goals.add("Ganho de força");
    }
    if (/mobilidade|ADM|amplitude/i.test(text)) {
      goals.add("Mobilidade/ADM");
    }
  }
  return Array.from(goals).slice(0, 6);
}

interface SummaryCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  empty: string;
  tone?: "red" | "amber" | "blue" | "emerald" | "slate";
}

function SummaryCard({ icon: Icon, title, items, empty, tone = "blue" }: SummaryCardProps) {
  const toneClass = {
    red: "text-red-700 bg-red-50 border-red-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    slate: "text-slate-700 bg-slate-50 border-slate-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-xl border p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-black uppercase tracking-tight">{title}</h4>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="outline" className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function ClinicalProfileSummary({
  patient,
  records,
  evaluations,
  pathologies,
  surgeries,
}: {
  patient?: Partial<PatientRow> | null;
  records: PatientMedicalRecord[];
  evaluations: Array<{ responses?: Record<string, unknown> | null }>;
  pathologies: Array<{ name?: string; status?: string; notes?: string }>;
  surgeries: Array<{ surgery_name?: string; surgery_date?: string | null; notes?: string | null }>;
}) {
  const latestImportedRecord = latestZenFisioRecord(records);
  const sports = unique(asList(patient?.sportsPracticed ?? patient?.sports_practiced));
  const activePathologies = unique([
    ...asList(patient?.pathologiesActive ?? patient?.pathologies_active),
    ...pathologies.map((pathology) => pathology.name ?? ""),
  ]);
  const medications = unique([
    ...asList(patient?.medicationsInUse ?? patient?.medications_in_use),
    ...records.flatMap((record) => [record.current_medications, ...asList(record.medications)]).filter(Boolean) as string[],
  ]).slice(0, 8);
  const allergies = unique([
    ...asList(patient?.allergiesGeneral ?? patient?.allergies_general),
    ...asList(patient?.allergiesMedicines ?? patient?.allergies_medicines),
    ...records.flatMap((record) => asList(record.allergies)),
  ]).slice(0, 8);
  const alerts = unique([
    ...asList(patient?.alerts),
    ...allergies.map((allergy) => `Alergia: ${allergy}`),
  ]).slice(0, 8);
  const surgeryItems = unique(
    surgeries.map((surgery) =>
      [surgery.surgery_name, surgery.surgery_date ? formatAnyDate(surgery.surgery_date, "dd/MM/yyyy") : null]
        .filter(Boolean)
        .join(" — "),
    ),
  );
  const goals = extractGoals(records, evaluations);
  const rawPreview = rawTextFromRecord(latestImportedRecord);

  return (
    <Card className="border-blue-100 bg-white p-6 shadow-premium-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Perfil clínico estruturado
          </h3>
          <p className="text-sm text-muted-foreground">
            Resumo conservador de anamnese, avaliações ZenFisio e campos clínicos editáveis do paciente.
          </p>
        </div>
        {latestImportedRecord ? (
          <Badge variant="outline" className="w-fit rounded-xl border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
            Fonte ZenFisio preservada
          </Badge>
        ) : (
          <Badge variant="outline" className="w-fit rounded-xl px-3 py-1">
            Sem avaliação ZenFisio importada
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={Dumbbell} title="Esportes" items={sports} empty="Nenhum esporte estruturado." />
        <SummaryCard icon={ClipboardList} title="Patologias/diagnósticos" items={activePathologies} empty="Nenhum diagnóstico estruturado." tone="emerald" />
        <SummaryCard icon={ShieldAlert} title="Cirurgias" items={surgeryItems} empty="Nenhuma cirurgia estruturada." tone="amber" />
        <SummaryCard icon={Pill} title="Medicações" items={medications} empty="Nenhuma medicação contínua estruturada." tone="slate" />
        <SummaryCard icon={AlertTriangle} title="Alertas/alergias" items={alerts} empty="Nenhum alerta ou alergia estruturado." tone={alerts.length ? "red" : "slate"} />
        <SummaryCard icon={Goal} title="Objetivos prováveis" items={goals} empty="Sem objetivos extraídos com confiança." tone="blue" />
      </div>

      {latestImportedRecord && rawPreview ? (
        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">
            Ver dados brutos preservados da avaliação ZenFisio
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-700">
            {rawPreview}
          </pre>
        </details>
      ) : null}
    </Card>
  );
}

export function PatientClinicalHistoryTab({ patientId, patient }: PatientClinicalHistoryTabProps) {
  const navigate = useNavigate();
  const { data: records = [] } = useSoapRecordsV2(patientId);
  const { data: medicalRecords = [] } = useMedicalRecords(patientId);
  const { data: evaluations = [], isLoading: isLoadingEvaluations } =
    usePatientEvaluationResponses(patientId);
  const { data: pathologies = [] } = useQuery({
    queryKey: ["patient-pathologies", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const response = await patientsApi.pathologies(patientId);
      return response.data ?? [];
    },
    enabled: !!patientId,
  });
  const { data: surgeries = [] } = useQuery({
    queryKey: ["patient-surgeries", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const response = await patientsApi.surgeries(patientId);
      return response.data ?? [];
    },
    enabled: !!patientId,
  });
  const createSoapRecord = useCreateSoapRecord();
  const [replicatingId, setReplicatingId] = useState<string | null>(null);

  const sessions = useMemo(
    () =>
      records.map((record) => ({
        id: record.id,
        session_date: record.record_date,
        subjective: record.subjective,
        objective: record.objective,
        assessment: record.assessment,
        plan: record.plan,
        created_at: record.created_at || record.record_date,
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
      <ClinicalProfileSummary
        patient={patient}
        records={medicalRecords}
        evaluations={evaluations}
        pathologies={pathologies}
        surgeries={surgeries}
      />

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
