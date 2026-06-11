/**
 * SessionDetailsModal — visualização detalhada de uma sessão (abas Visão Geral,
 * Observação, Exercícios, Medições, Anexos). Extraído da EvolutionTimeline.
 * Memoizado: só re-renderiza quando suas props mudam.
 */
import { isValid } from "date-fns";
import {
  Activity,
  Calendar,
  Camera,
  Clock,
  Download,
  Dumbbell,
  Eye,
  FileText,
  Image as ImageIcon,
  Ruler,
} from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SoapRecord } from "@/hooks/useSoapRecords";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/utils/stripHtml";
import type { AttachmentData, MeasurementData, SessionExerciseData } from "@/types/evolution";
import { safeFormat, safeFormatDistance, SessionDetailsSkeleton } from "./timelineUtils";

export const SessionDetailsModal: React.FC<{
  session: SoapRecord;
  measurements: MeasurementData[];
  attachments: AttachmentData[];
  isOpen: boolean;
  onClose: () => void;
}> = React.memo(({ session, measurements, attachments, isOpen, onClose }) => {
  const [sessionExercises, setSessionExercises] = React.useState<SessionExerciseData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "soap" | "exercises" | "measurements" | "attachments"
  >("overview");

  // Reset active tab when session changes
  React.useEffect(() => {
    setActiveTab("overview");
  }, [session.id]);

  React.useEffect(() => {
    const fetchSessionExercises = async () => {
      setIsLoading(true);
      try {
        if (!session.appointment_id) {
          setSessionExercises([]);
          return;
        }

        // Exercises are stored directly in the session document
        const exercises = session.exercises_performed || [];
        setSessionExercises(exercises);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionExercises();
  }, [session.appointment_id, session.exercises_performed]);

  // Filtrar medições e anexos desta sessão
  const sessionDateObj = new Date(session.created_at);
  const sessionDate = isValid(sessionDateObj) ? sessionDateObj.toISOString().split("T")[0] : null;

  const sessionMeasurements = measurements.filter((m) => {
    if (!sessionDate) return false;
    const mDateObj = new Date(m.measured_at);
    return isValid(mDateObj) && mDateObj.toISOString().split("T")[0] === sessionDate;
  });
  const sessionAttachments = attachments.filter(
    (a) => (a as any).soap_record_id === session.id || (a as any).session_id === session.id,
  );

  // stripHtml importado de @/lib/utils/stripHtml
  const observacaoText = stripHtml((session as any).observacao || "");
  const hasObservacao = observacaoText.length > 0;
  const painScale = (session as any).pain_scale ?? (session as any).pain_level ?? null;

  // Função para exportar sessão como texto
  const handleExportSession = () => {
    const exportText = `
SESSÃO ${session.session_number || "?"} - ${safeFormat(session.created_at, "dd/MM/yyyy")}
${"=".repeat(50)}

ESCALA DE DOR (EVA): ${painScale != null ? `${painScale}/10` : "N/A"}

OBSERVAÇÃO CLÍNICA:
${observacaoText || "Não preenchida"}

EXERCÍCIOS (${sessionExercises.length}):
${
  sessionExercises.length > 0
    ? sessionExercises
        .map(
          (ex, i) =>
            `${i + 1}. ${ex.name}${ex.sets ? ` - ${ex.sets} séries` : ""}${ex.repetitions ? ` x ${ex.repetitions} reps` : ""}${ex.load ? ` - ${ex.load}` : ""}`,
        )
        .join("\n")
    : "Nenhum exercício registrado"
}

MEDIDAS (${sessionMeasurements.length}):
${
  sessionMeasurements.length > 0
    ? sessionMeasurements
        .map((m) => `- ${m.measurement_name}: ${m.value}${m.unit || ""}`)
        .join("\n")
    : "Nenhuma medida registrada"
}
    `.trim();

    // Criar blob e download
    const blob = new Blob([exportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sessao-${session.session_number || "N"}-${safeFormat(session.created_at, "dd-MM-yyyy")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0 w-[95vw]">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-b px-6 py-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold">Sessão {session.session_number || "?"}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {safeFormat(session.created_at, "dd 'de' MMMM 'de' yyyy")}
                  </div>
                </div>
              </DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportSession} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {safeFormatDistance(session.created_at)}
                </span>
              </div>
              <Badge
                variant={session.status === "finalized" ? "default" : "secondary"}
                className="text-xs"
              >
                {session.status === "finalized" ? "Finalizada" : "Rascunho"}
              </Badge>
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {hasObservacao ? "Observação registrada" : "Sem observação"}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Abas de navegação */}
          <div className="flex gap-1 px-6 pt-4">
            {[
              { value: "overview", label: "Visão Geral", icon: Activity },
              { value: "soap", label: "SOAP", icon: FileText },
              {
                value: "exercises",
                label: "Exercícios",
                icon: Dumbbell,
                count: sessionExercises.length,
              },
              {
                value: "measurements",
                label: "Medições",
                icon: Ruler,
                count: sessionMeasurements.length,
              },
              {
                value: "attachments",
                label: "Anexos",
                icon: Camera,
                count: sessionAttachments.length,
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() =>
                  setActiveTab(
                    tab.value as "overview" | "soap" | "exercises" | "measurements" | "attachments",
                  )
                }
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    variant={activeTab === tab.value ? "secondary" : "outline"}
                    className="ml-1 text-[10px] h-5 px-1"
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[calc(92vh-200px)]">
          <div className="px-6 py-6 space-y-6">
            {isLoading && activeTab !== "overview" ? (
              <SessionDetailsSkeleton />
            ) : (
              <>
                {/* Tab: Visão Geral */}
                {activeTab === "overview" && (
                  <>
                    {/* Escala de Dor */}
                    {session.pain_level !== undefined && (
                      <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                              <Activity className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                              <span className="font-semibold text-sm">
                                Escala Visual Analógica (EVA)
                              </span>
                              <div className="text-xs text-muted-foreground">
                                Nível de dor reportado
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-lg px-3 py-1 font-bold",
                              session.pain_level >= 7
                                ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300"
                                : session.pain_level >= 4
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300"
                                  : "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300",
                            )}
                          >
                            {session.pain_level}/10
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Observação clínica (texto livre) */}
                    {hasObservacao && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Observação clínica
                        </h3>
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                          <div
                            className="text-sm prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{
                              __html: (session as any).observacao || "",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                        <Dumbbell className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {sessionExercises.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Exercícios</div>
                      </div>
                      <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4 text-center">
                        <Ruler className="h-5 w-5 text-teal-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                          {sessionMeasurements.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Medições</div>
                      </div>
                      <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-xl p-4 text-center">
                        <Camera className="h-5 w-5 text-pink-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">
                          {sessionAttachments.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Anexos</div>
                      </div>
                      <div className="bg-muted/30 border rounded-xl p-4 text-center">
                        <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                        <div className="text-2xl font-bold">
                          {session.duration_minutes ? `${session.duration_minutes}m` : "--"}
                        </div>
                        <div className="text-xs text-muted-foreground">Duração</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Tab: Observação completa */}
                {activeTab === "soap" && (
                  <div className="space-y-4">
                    {hasObservacao ? (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                        <div
                          className="text-sm prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{
                            __html: (session as any).observacao || "",
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Sem observação registrada nesta sessão.
                      </p>
                    )}
                  </div>
                )}

                {/* Tab: Exercícios */}
                {activeTab === "exercises" && (
                  <div className="space-y-3">
                    {sessionExercises.length > 0 ? (
                      <div className="grid gap-3">
                        {sessionExercises.map((exercise, index) => (
                          <div
                            key={index}
                            className="bg-gradient-to-r from-emerald-50 to-pink-50 dark:from-emerald-950/20 dark:to-pink-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                                  <Dumbbell className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm">{exercise.name}</h4>
                                  {exercise.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {exercise.notes}
                                    </p>
                                  )}
                                  <div className="flex gap-2 mt-2 text-xs">
                                    {exercise.sets && (
                                      <Badge variant="secondary" className="bg-white/50">
                                        {exercise.sets} séries
                                      </Badge>
                                    )}
                                    {exercise.repetitions && (
                                      <Badge variant="secondary" className="bg-white/50">
                                        {exercise.repetitions} reps
                                      </Badge>
                                    )}
                                    {exercise.load && exercise.load !== "0 kg" && (
                                      <Badge variant="secondary" className="bg-white/50">
                                        {exercise.load}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhum exercício registrado nesta sessão</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Medições */}
                {activeTab === "measurements" && (
                  <div className="space-y-3">
                    {sessionMeasurements.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sessionMeasurements.map((measurement) => (
                          <div
                            key={measurement.id}
                            className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Ruler className="h-4 w-4 text-teal-600" />
                              <span className="text-xs text-muted-foreground">
                                {measurement.measurement_name}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                              {measurement.value}
                              <span className="text-sm font-normal text-muted-foreground ml-1">
                                {measurement.unit || ""}
                              </span>
                            </div>
                            {measurement.notes && (
                              <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {measurement.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Ruler className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhuma medição registrada nesta sessão</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Anexos */}
                {activeTab === "attachments" && (
                  <div className="space-y-3">
                    {sessionAttachments.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {sessionAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="group relative rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => window.open(attachment.file_url, "_blank")}
                          >
                            <div className="aspect-square bg-muted">
                              {attachment.file_type === "pdf" ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                                  <FileText className="h-12 w-12 text-red-400" />
                                </div>
                              ) : attachment.thumbnail_url ? (
                                <img
                                  src={attachment.thumbnail_url}
                                  alt={attachment.original_name || attachment.file_name}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Eye className="h-5 w-5 text-white" />
                              <span className="text-white text-sm font-medium">Ver</span>
                            </div>
                            {attachment.original_name && (
                              <div className="p-2 bg-background border-t text-xs truncate">
                                {attachment.original_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Camera className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhum anexo nesta sessão</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Footer com metadados */}
            <div className="bg-muted/30 rounded-2xl p-4 space-y-2 text-xs text-muted-foreground border">
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <Badge variant="outline" className="text-[10px]">
                  {session.status === "finalized" ? "Finalizada" : "Rascunho"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>ID do Registro:</span>
                <span className="font-mono">{session.id.slice(0, 8)}...</span>
              </div>
              {session.appointment_id && (
                <div className="flex justify-between items-center">
                  <span>ID do Agendamento:</span>
                  <span className="font-mono">{session.appointment_id.slice(0, 8)}...</span>
                </div>
              )}
              {session.last_auto_save_at && (
                <div className="flex justify-between items-center">
                  <span>Último auto-save:</span>
                  <span>{safeFormat(session.last_auto_save_at, "HH:mm")}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Criado em:</span>
                <span>{safeFormat(session.created_at, "dd/MM/yyyy 'as' HH:mm")}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

SessionDetailsModal.displayName = "SessionDetailsModal";
