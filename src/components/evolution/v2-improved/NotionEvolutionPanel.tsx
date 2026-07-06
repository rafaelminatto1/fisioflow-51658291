/**
 * NotionEvolutionPanel - Improved V2 Evolution editor
 *
 * Notion/Evernote-style block editor for clinical evolutions with
 * enhanced UX/UI including:
 *   - Better visual hierarchy and spacing
 *   - Smooth animations and transitions
 *   - Professional color scheme
 *   - Improved responsive design
 *   - Enhanced accessibility
 *   - Micro-interactions
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import type YProvider from "y-partyserver/provider";
import {
  StickyNote,
  History,
  Activity,
  Dumbbell,
  Ruler,
  Home,
  Paperclip,
  Library,
  Stethoscope,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { RichTextBlock } from "./RichTextBlock";
import type { RichTextEditorHandle } from "@/components/ui/RichTextEditor";
import { EvolutionBlockV3 } from "../v3-unified/EvolutionBlockV3";
import { EvolutionItemV3 } from "../v3-unified/types";
import { PainLevelBlock } from "./PainLevelBlock";
import { HomeCareBlock } from "./HomeCareBlock";
import { AttachmentsBlock } from "./AttachmentsBlock";
import { MeasurementsBlock } from "./MeasurementsBlock";
import { EvolutionSectionCard } from "./EvolutionSectionCard";
import { SessionTimelineStrip } from "./SessionTimelineStrip";
import { toast } from "sonner";
import type { SoapRecord } from "@/hooks/useSoapRecords";
import { ExerciseLibraryModal } from "@/components/exercises/ExerciseLibraryModal";
import { COMMON_PROCEDURES, PROCEDURE_CATEGORY_LABELS } from "./types";
import type { EvolutionV2Data, MeasurementItem } from "./types";
import { useSoapRecords } from "@/hooks/useSoapRecords";
import { Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAIClinicalCopilot } from "@/hooks/useAIClinicalCopilot";
import { ClinicalCopilotPanel } from "./ClinicalCopilotPanel";
import { CollaborationPresence } from "../CollaborationPresence";

/** Tempo máximo de espera pela conexão do provider antes de cair no modo clássico. */
const COLLAB_CONNECT_TIMEOUT_MS = 5000;

export type CollabStatus = "connecting" | "connected" | "fallback";

interface NotionEvolutionPanelProps {
  data: EvolutionV2Data;
  onChange: (data: EvolutionV2Data) => void;
  onSave?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  autoSaveEnabled?: boolean;
  lastSaved?: Date | null;
  className?: string;
  patientId?: string;
  evolutionId?: string;
  onNavigateToHistorico?: () => void;
  collaborationId?: string;
  userName?: string;
  userColor?: string;
}

export const NotionEvolutionPanel: React.FC<NotionEvolutionPanelProps> = ({
  data,
  onChange,
  onSave: _onSave,
  isSaving: _isSaving = false,
  disabled = false,
  autoSaveEnabled: _autoSaveEnabled = false,
  lastSaved: _lastSaved,
  className,
  patientId,
  evolutionId,
  onNavigateToHistorico,
  collaborationId,
  userName,
  userColor,
}) => {
  const [procedureLibraryOpen, setProcedureLibraryOpen] = useState(false);
  const [exerciseLibraryOpen, setExerciseLibraryOpen] = useState(false);
  const [clinicalPanelOpen, setClinicalPanelOpen] = useState(true);
  const [observationsFocus, setObservationsFocus] = useState(false);
  const [measurementsExpanded, setMeasurementsExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [replicatedContentRevision, setReplicatedContentRevision] = useState(0);
  // Texto replicado enquanto conectado à colaboração: o Y.Doc é o único dono
  // da escrita, então o texto entra no editor por este override local (nunca
  // por `data.evolutionText`, que não muda nesse modo) e chega ao servidor
  // via `setContent` no editor vinculado ao Yjs — não pelo `onChange` clássico.
  const [pendingCollabText, setPendingCollabText] = useState<string | null>(null);

  // Máquina de dois estados da colaboração: "connecting" (tentando conectar
  // ao Durable Object) → "connected" (DO é o dono da escrita, autosave
  // clássico desligado) ou, em falha/timeout de conexão, "fallback" (editor
  // remonta sem colaboração, autosave clássico volta a funcionar).
  const [collabStatus, setCollabStatus] = useState<CollabStatus>(
    collaborationId ? "connecting" : "fallback",
  );
  const [collabProvider, setCollabProvider] = useState<YProvider | null>(null);
  const richTextRef = useRef<RichTextEditorHandle | null>(null);

  useEffect(() => {
    if (!collaborationId) {
      setCollabStatus("fallback");
      setCollabProvider(null);
      return;
    }

    // A transição fallback/undefined → colaborando remonta o editor (troca de
    // `key` clássico↔colaborativo). Antes de remontar, força o flush do
    // debounce clássico pendente (últimos ~300ms digitados) para que o
    // conteúdo mais recente já esteja em `data` quando o novo editor montar
    // — senão o `content` inicial do editor colaborativo usaria um `data`
    // desatualizado e o texto digitado nesse intervalo se perderia.
    richTextRef.current?.flushPendingValue();

    setCollabStatus("connecting");
    setCollabProvider(null);

    const timeout = setTimeout(() => {
      setCollabStatus((current) => (current === "connected" ? current : "fallback"));
    }, COLLAB_CONNECT_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [collaborationId]);

  const handleCollabStatusChange = useCallback(
    (status: "connecting" | "connected" | "disconnected") => {
      if (status === "connected") {
        setCollabStatus("connected");
      }
    },
    [],
  );

  const handleCollabProviderChange = useCallback((provider: YProvider | null) => {
    setCollabProvider(provider);
  }, []);

  // O DO é o dono da escrita enquanto a colaboração estiver ativa/conectando;
  // o autosave clássico só roda de fato quando caímos no modo fallback.
  const handleObservationsChange = useCallback(
    (val: string) => {
      if (collabStatus === "connected") return;
      onChange({ ...data, evolutionText: val, observations: val });
    },
    [collabStatus, data, onChange],
  );

  const effectiveCollaborationId = collabStatus === "fallback" ? undefined : collaborationId;

  // Hook do Clinical Copilot
  const combinedText = data.evolutionText || data.observations || "";
  const { insights, isAnalyzing } = useAIClinicalCopilot(combinedText);

  // Histórico (usado por: banner "Replicar última sessão" + sparklines de medições)
  const { data: recentRecords = [] } = useSoapRecords(patientId ?? "", 8);
  const lastSession = React.useMemo(() => {
    const list = evolutionId ? recentRecords.filter((r) => r.id !== evolutionId) : recentRecords;
    return list[0] ?? null;
  }, [recentRecords, evolutionId]);

  // Série histórica de medições por nome (cronológica antiga→nova) para sparklines
  const measurementHistory = React.useMemo<Record<string, number[]>>(() => {
    const series: Record<string, number[]> = {};
    const chronological = [...recentRecords]
      .filter((r) => !evolutionId || r.id !== evolutionId)
      .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
    for (const rec of chronological) {
      const meas = (rec.measurements as MeasurementItem[] | undefined) || [];
      for (const m of meas) {
        const key = (m.measurement_name || "").trim().toLowerCase();
        if (!key) continue;
        const n = parseFloat(String(m.value ?? "").replace(",", "."));
        if (Number.isFinite(n)) {
          series[key] = series[key] || [];
          series[key].push(n);
        }
      }
    }
    return series;
  }, [recentRecords, evolutionId]);

  const currentIsEmpty = React.useMemo(() => {
    const hasUnified = (data.unifiedItems?.length ?? 0) > 0;
    const hasLegacy = (data.procedures?.length ?? 0) > 0 || (data.exercises?.length ?? 0) > 0;
    const hasText = (data.evolutionText || data.observations || "").trim().length > 0;
    const hasMeas = (data.measurements?.length ?? 0) > 0;
    return !hasUnified && !hasLegacy && !hasText && !hasMeas;
  }, [data]);

  // Migration logic (run once if unifiedItems is empty but legacy items exist)
  React.useEffect(() => {
    if (!data.unifiedItems && (data.procedures?.length > 0 || data.exercises?.length > 0)) {
      const migratedItems: EvolutionItemV3[] = [];

      // Add procedures
      if (data.procedures?.length > 0) {
        data.procedures.forEach((p) => {
          migratedItems.push({
            id: p.id,
            name: p.name,
            completed: p.completed,
            type: "procedure",
            notes: p.notes,
            intensity: p.intensity,
            category: p.category,
          });
        });
      }

      // Add exercises
      if (data.exercises?.length > 0) {
        data.exercises.forEach((e) => {
          migratedItems.push({
            id: e.id,
            name: e.name,
            completed: e.completed,
            type: "exercise",
            prescription: e.prescription,
            patientFeedback: e.patientFeedback?.notes || "",
            difficulty: e.difficulty,
          });
        });
      }

      if (migratedItems.length > 0) {
        onChange({ ...data, unifiedItems: migratedItems });
      }
    }
  }, []);

  const handleFieldChange = useCallback(
    <K extends keyof EvolutionV2Data>(field: K, value: EvolutionV2Data[K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  const unifiedItems = data.unifiedItems || [];
  const procedureCount = unifiedItems.filter((item) => item.type === "procedure").length;
  const exerciseCount = unifiedItems.filter((item) => item.type === "exercise").length;
  const measurementsCount = data.measurements?.length ?? 0;
  const painLabel =
    typeof data.painLevel === "number"
      ? data.painLevel <= 3
        ? "leve"
        : data.painLevel <= 6
          ? "moderada"
          : "intensa"
      : "não registrada";
  const showClinicalPanel = clinicalPanelOpen && !observationsFocus;

  const normalizeUnifiedItems = (items: EvolutionItemV3[]) =>
    items.map((item, index) => ({ ...item, order: index }));

  const handleUnifiedItemsChange = (items: EvolutionItemV3[]) => {
    handleFieldChange("unifiedItems", normalizeUnifiedItems(items));
  };

  const appendUnifiedItem = (item: Omit<EvolutionItemV3, "id" | "completed" | "order">) => {
    handleUnifiedItemsChange([
      ...unifiedItems,
      {
        id: crypto.randomUUID(),
        completed: false,
        order: unifiedItems.length,
        ...item,
      },
    ]);
  };

  const handleReplicate = useCallback(
    (record: SoapRecord) => {
      const procedures = (record.procedures || []) as any[];
      const exercises = (record.exercises || []) as any[];
      const observacao =
        record.observacao ||
        [record.subjective, record.objective, record.assessment, record.plan]
          .filter((value) => typeof value === "string" && value.trim().length > 0)
          .join("\n\n");

      const replicatedItems: EvolutionItemV3[] = [
        ...procedures.map((p, i) => ({
          id: crypto.randomUUID(),
          name: p.name,
          completed: false,
          order: i,
          type: "procedure" as const,
          notes: p.notes,
          intensity: p.intensity,
          category: p.category,
        })),
        ...exercises.map((e, i) => ({
          id: crypto.randomUUID(),
          name: e.name,
          completed: false,
          order: procedures.length + i,
          type: "exercise" as const,
          exerciseId: e.exerciseId || e.exercise_id,
          prescription: e.prescription,
          difficulty: e.difficulty,
        })),
      ];

      const homeExercises = record.home_exercises;
      const homeCareExercises =
        Array.isArray(homeExercises) && homeExercises.length > 0
          ? JSON.stringify(
              homeExercises.map((h: any, i: number) => ({
                id: `hc_${i}`,
                name: h.name || "",
                prescription: h.prescription || "3x10",
                instructions: h.instructions || "",
              })),
            )
          : data.homeCareExercises;

      const isCollabConnected = collabStatus === "connected";

      onChange({
        ...data,
        // Enquanto conectado, o DO é o único dono da escrita do texto: não
        // duplicamos com uma escrita clássica (REST) do mesmo conteúdo — o
        // texto entra pelo override local + `setContent` colaborativo abaixo.
        ...(isCollabConnected
          ? {}
          : {
              evolutionText: observacao || data.evolutionText,
              observations: observacao || data.observations,
            }),
        painLevel: record.pain_scale ?? data.painLevel,
        unifiedItems: replicatedItems.length > 0 ? replicatedItems : data.unifiedItems,
        measurements: (record.measurements as any) || data.measurements,
        homeCareExercises,
      });

      if (isCollabConnected) {
        setPendingCollabText(observacao || null);
      }
      setReplicatedContentRevision((revision) => revision + 1);

      toast.success("Sessão replicada", {
        description: "Os dados foram carregados na evolução atual. Não esqueça de salvar.",
      });
    },
    [data, onChange, collabStatus],
  );

  return (
    <>
      <Card
        data-collab-status={collaborationId ? collabStatus : undefined}
        className={cn("flex flex-col border-none shadow-none bg-background", className)}
      >
        <div className="flex-1 p-3 sm:p-4 xl:p-5">
          <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 pb-12">
            {/* Banner: Replicar última sessão (1 clique) */}
            {lastSession && currentIsEmpty && !disabled && (
              <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 flex-shrink-0">
                    <Copy className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-blue-900">Replicar última sessão</p>
                    <p className="text-xs text-blue-700/80 truncate">
                      Sessão de{" "}
                      {format(new Date(lastSession.record_date), "dd/MM • HH'h'mm", {
                        locale: ptBR,
                      })}
                      {typeof lastSession.pain_scale === "number" &&
                        ` • EVA ${lastSession.pain_scale}`}
                      {(lastSession.procedures?.length ?? 0) +
                        (lastSession.exercises?.length ?? 0) >
                        0 &&
                        ` • ${
                          (lastSession.procedures?.length ?? 0) +
                          (lastSession.exercises?.length ?? 0)
                        } itens`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleReplicate(lastSession)}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 self-stretch sm:self-auto"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Replicar agora
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600">
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                  Dor {painLabel}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                  {procedureCount} procedimentos
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                  {exerciseCount} exercícios
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                  {measurementsCount} medições
                </span>
              </div>
              <div className="flex items-center gap-2">
                {collabStatus === "connected" && (
                  <CollaborationPresence provider={collabProvider} />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl bg-white text-xs"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  Histórico
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden h-8 rounded-xl bg-white text-xs min-[1180px]:inline-flex"
                  onClick={() => setClinicalPanelOpen((open) => !open)}
                >
                  {showClinicalPanel ? (
                    <PanelRightClose className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <PanelRightOpen className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {showClinicalPanel ? "Ocultar painel" : "Mostrar painel"}
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "grid grid-cols-1 gap-4 items-start",
                showClinicalPanel &&
                  "min-[1180px]:grid-cols-[minmax(420px,1.25fr)_minmax(360px,0.95fr)_320px] 2xl:grid-cols-[minmax(520px,1.35fr)_minmax(420px,1fr)_340px]",
              )}
            >
              <div className="min-w-0">
                <EvolutionSectionCard
                  accent="amber"
                  icon={StickyNote}
                  title="Observações Clínicas"
                  subtitle={observationsFocus ? "Modo foco" : "Registro principal da sessão"}
                  flushContent
                  className={cn(observationsFocus ? "min-h-[calc(100vh-16rem)]" : "min-h-[calc(100vh-18rem)]")}
                  actions={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl border border-amber-200 text-xs text-amber-700 hover:bg-amber-50"
                      onClick={() => setObservationsFocus((focus) => !focus)}
                    >
                      {observationsFocus ? (
                        <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {observationsFocus ? "Sair do foco" : "Foco"}
                    </Button>
                  }
                >
                  <div
                    className={cn(
                      "flex flex-col",
                      observationsFocus ? "min-h-[calc(100vh-16rem)]" : "min-h-[calc(100vh-18rem)]",
                    )}
                  >
                    <RichTextBlock
                      ref={richTextRef}
                      key={collabStatus === "fallback" ? "classic" : "collab"}
                      placeholder="Orientações gerais, encaminhamentos, cuidados e notas da sessão..."
                      value={
                        collabStatus === "connected" && pendingCollabText !== null
                          ? pendingCollabText
                          : data.evolutionText || data.observations || ""
                      }
                      onValueChange={handleObservationsChange}
                      disabled={disabled}
                      showToolbar={true}
                      collaborationId={effectiveCollaborationId}
                      userName={userName}
                      userColor={userColor}
                      externalValueRevision={replicatedContentRevision}
                      onCollabStatusChange={handleCollabStatusChange}
                      onCollabProviderChange={handleCollabProviderChange}
                      className={cn(
                        "border-none bg-transparent shadow-none",
                        observationsFocus ? "min-h-[calc(100vh-23rem)]" : "min-h-[calc(100vh-25rem)]",
                      )}
                    />
                    <div className="px-5 pb-5 pt-2">
                      <ClinicalCopilotPanel
                        insights={insights}
                        isAnalyzing={isAnalyzing}
                        onAction={(actionPayload) => {
                          if (actionPayload?.type === "add_exercise") {
                            const newItem: EvolutionItemV3 = {
                              id: `ex-${Date.now()}`,
                              type: "exercise",
                              name: actionPayload.name,
                              completed: false,
                            };
                            handleUnifiedItemsChange([...unifiedItems, newItem]);
                            toast.success(
                              `"${actionPayload.name}" adicionado à sequência da sessão.`,
                            );
                          }
                        }}
                      />
                    </div>
                  </div>
                </EvolutionSectionCard>
              </div>

              <div className="min-w-0 space-y-4">
                <EvolutionSectionCard
                  accent="emerald"
                  icon={Activity}
                  title="Procedimentos & Exercícios"
                  subtitle="Sequência de trabalho da sessão"
                  className="min-h-[360px]"
                  actions={
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl border border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setProcedureLibraryOpen(true)}
                        disabled={disabled}
                      >
                        <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                        Procedimentos
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl border border-blue-200 text-xs text-blue-700 hover:bg-blue-50"
                        onClick={() => setExerciseLibraryOpen(true)}
                        disabled={disabled}
                      >
                        <Dumbbell className="h-3.5 w-3.5 mr-1.5" />
                        Exercícios
                      </Button>
                    </>
                  }
                >
                  <EvolutionBlockV3
                    items={unifiedItems}
                    onChange={handleUnifiedItemsChange}
                    type="unified"
                    title="Sequência da sessão"
                    disabled={disabled}
                    variant="embedded"
                  />
                </EvolutionSectionCard>

                <EvolutionSectionCard
                  accent="slate"
                  icon={Home}
                  title="Exercícios para Casa"
                  subtitle="HEP — Home Exercise Program"
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                      onClick={() => setExerciseLibraryOpen(true)}
                      disabled={disabled}
                    >
                      <Library className="h-3.5 w-3.5 mr-1.5" />
                      Biblioteca
                    </Button>
                  }
                >
                  <HomeCareBlock
                    value={data.homeCareExercises || ""}
                    onChange={(val) => handleFieldChange("homeCareExercises", val)}
                    disabled={disabled}
                    className="rounded-xl border-none bg-slate-50/60 shadow-none"
                    variant="embedded"
                    sessionExercises={unifiedItems
                      .filter((item) => item.type === "exercise")
                      .map((item) => ({
                        name: item.name,
                        prescription: item.prescription,
                      }))}
                  />
                </EvolutionSectionCard>
              </div>

              {showClinicalPanel && (
                <aside className="min-w-0 space-y-4 min-[1180px]:pr-1">
                  <EvolutionSectionCard
                    accent="rose"
                    icon={Activity}
                    title="Nível de Dor"
                    subtitle="Escala Visual Analógica (EVA)"
                    flushContent
                    density="compact"
                  >
                    <div className="px-4 pb-4">
                      <PainLevelBlock
                        painLevel={data.painLevel}
                        painLocation={data.painLocation}
                        onPainLevelChange={(level) => handleFieldChange("painLevel", level)}
                        onPainLocationChange={(location) =>
                          handleFieldChange("painLocation", location)
                        }
                        disabled={disabled}
                      />
                    </div>
                  </EvolutionSectionCard>

                  <EvolutionSectionCard
                    accent="pink"
                    icon={Ruler}
                    title="Medições"
                    subtitle="Sinais vitais e antropometria"
                    density="compact"
                    actions={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl border border-pink-200 text-xs text-pink-700 hover:bg-pink-50"
                        onClick={() => setMeasurementsExpanded((expanded) => !expanded)}
                      >
                        {measurementsExpanded ? "Resumo" : "Detalhar"}
                      </Button>
                    }
                  >
                    {measurementsExpanded ? (
                      <MeasurementsBlock
                        measurements={data.measurements || []}
                        onChange={(meas) => handleFieldChange("measurements", meas)}
                        disabled={disabled}
                        history={measurementHistory}
                      />
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[10px] font-semibold uppercase text-slate-400">
                              Registradas
                            </p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                              {measurementsCount}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[10px] font-semibold uppercase text-slate-400">
                              Concluídas
                            </p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                              {
                                (data.measurements || []).filter(
                                  (measurement) => measurement.completed,
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                        {(data.measurements || []).slice(0, 3).map((measurement) => (
                          <div
                            key={measurement.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-800">
                                {measurement.measurement_name ||
                                  measurement.measurement_type ||
                                  "Medição"}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {measurement.measurement_type || "Sem tipo"}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-bold tabular-nums text-slate-700">
                              {measurement.value || "—"} {measurement.unit}
                            </span>
                          </div>
                        ))}
                        {measurementsCount === 0 && (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                            Nenhuma medição registrada.
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-full rounded-xl bg-white text-xs"
                          onClick={() => setMeasurementsExpanded(true)}
                        >
                          Abrir medições
                        </Button>
                      </div>
                    )}
                  </EvolutionSectionCard>

                  <EvolutionSectionCard
                    accent="blue"
                    icon={History}
                    title="Histórico de Sessões"
                    subtitle="Últimas evoluções"
                    density="compact"
                  >
                    <div className="space-y-3">
                      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                        <p className="text-xs font-semibold text-blue-900">
                          {Math.max(recentRecords.length - (evolutionId ? 1 : 0), 0)} sessões
                          recentes
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-blue-700/80">
                          Última atualização clínica disponível
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-full rounded-xl bg-white text-xs text-blue-700"
                        onClick={() => setHistoryOpen(true)}
                      >
                        <History className="mr-1.5 h-3.5 w-3.5" />
                        Abrir histórico
                      </Button>
                    </div>
                  </EvolutionSectionCard>

                  <EvolutionSectionCard
                    accent="zinc"
                    icon={Paperclip}
                    title="Anexos"
                    subtitle="Fotos, exames e documentos"
                    density="compact"
                  >
                    <AttachmentsBlock
                      patientId={patientId}
                      evolutionId={evolutionId}
                      value={data.attachments || []}
                      onChange={(val) => handleFieldChange("attachments", val)}
                      disabled={disabled}
                      className="rounded-xl border-none bg-zinc-50/60 shadow-none"
                      variant="embedded"
                    />
                  </EvolutionSectionCard>
                </aside>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-[92vw] overflow-y-auto p-4 sm:max-w-xl">
          <SheetHeader className="pr-8">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Histórico de sessões
            </SheetTitle>
            <SheetDescription>Últimas evoluções deste paciente</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <SessionTimelineStrip
              patientId={patientId}
              excludeId={evolutionId}
              onSeeAll={onNavigateToHistorico}
              onReplicate={handleReplicate}
              maxItems={8}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={procedureLibraryOpen} onOpenChange={setProcedureLibraryOpen}>
        <DialogContent className="w-[92vw] max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Biblioteca de procedimentos
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {COMMON_PROCEDURES.map((procedure) => (
              <button
                key={`${procedure.category}:${procedure.name}`}
                type="button"
                className="rounded-xl border border-border/60 bg-background p-3 text-left transition-colors hover:bg-emerald-500/10"
                onClick={() => {
                  appendUnifiedItem({
                    name: procedure.name,
                    type: "procedure",
                    category: procedure.category,
                  });
                }}
              >
                <span className="block text-sm font-semibold">{procedure.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {PROCEDURE_CATEGORY_LABELS[procedure.category]}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ExerciseLibraryModal
        open={exerciseLibraryOpen}
        onOpenChange={setExerciseLibraryOpen}
        addedExerciseIds={
          unifiedItems
            .filter((item) => item.type === "exercise")
            .map((item) => item.exerciseId)
            .filter(Boolean) as string[]
        }
        onSelectExercise={(exercise) => {
          appendUnifiedItem({
            name: exercise.name,
            type: "exercise",
            exerciseId: exercise.id,
            prescription: `${exercise.sets || 3}x${exercise.repetitions || 10}`,
          });
        }}
      />
    </>
  );
};
