import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { appointmentsApi } from "@/api/v2";
import { useAuth } from "@/hooks/useAuth";
import { useTherapists } from "@/hooks/useTherapists";
import { useEvolutionTemplates } from "@/hooks/useEvolutionTemplates";
import { useAppointmentData } from "@/hooks/useAppointmentData";
import {
  useEvolutionDataOptimized,
  type EvolutionTab,
} from "@/hooks/evolution/useEvolutionDataOptimized";
import { usePrefetchStrategy } from "@/hooks/evolution/usePrefetchStrategy";
import { useSessionExercises } from "@/hooks/useSessionExercises";
import { useDraftSoapRecordByAppointment } from "@/hooks/useSoapRecords";
import type { EvolutionVersion, EvolutionV2Data } from "@/components/evolution/v2/types";
import type { PainScaleData } from "@/pages/PatientEvolution";
import type {
  ProcedureItem,
  ExerciseItem,
  MeasurementItem,
  HomeExerciseItem,
} from "@/types/evolution";

/** Modelo canônico da evolução (texto livre + estruturados). */
export interface EvolutionData {
  observacao: string;
  painScale: number | null;
  procedures: ProcedureItem[];
  exercises: ExerciseItem[];
  measurements: MeasurementItem[];
  homeExercises: HomeExerciseItem[];
}

const emptyEvolutionData = (): EvolutionData => ({
  observacao: "",
  painScale: null,
  procedures: [],
  exercises: [],
  measurements: [],
  homeExercises: [],
});

export function usePatientEvolutionState() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const location = useLocation();
  const navigationState = location.state as {
    patientId?: string;
    patientName?: string;
  } | null;
  const { user } = useAuth();
  const { therapists } = useTherapists();
  const { data: evolutionTemplates = [] } = useEvolutionTemplates();

  // ========== UI STATE ==========
  const [activeTab, setActiveTab] = useState<EvolutionTab>("evolucao");
  const [evolutionVersion, setEvolutionVersionRaw] = useState<EvolutionVersion>("v2-texto");
  const setEvolutionVersion = (v: EvolutionVersion) => {
    setEvolutionVersionRaw(v);
  };
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAIScribe, setShowAIScribe] = useState(false);
  const [selectedTherapistId, setSelectedTherapistId] = useState("");

  // ========== DATA STATE ==========
  const [currentSoapRecordId, setCurrentSoapRecordId] = useState<string | undefined>();
  // Canonical state (modelo único do sistema)
  const [evolutionData, setEvolutionData] = useState<EvolutionData>(emptyEvolutionData);
  // Legacy mirrors — kept transitorily for components não refatorados (Fase 3 limpa).
  const [soapData, setSoapData] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [painScale, setPainScale] = useState<PainScaleData>({ level: 0 });
  const [sessionExercises, setSessionExercises] = useState<any[]>([]);
  // P2.3: evolutionV2Data agora é DERIVADO do canonical evolutionData via useMemo.
  // Eliminado useState dual para fonte única da verdade — antes mirror manual
  // causava bugs de drift (ver bug histórico em 785ad16e0).

  // ========== HOOKS ==========
  const {
    appointment,
    patient,
    patientId,
    isLoading: dataLoading,
    appointmentError,
    patientError,
  } = useAppointmentData(appointmentId, {
    initialPatientId: navigationState?.patientId,
    initialPatientData: navigationState?.patientName
      ? ({
          id: navigationState.patientId!,
          name: navigationState.patientName,
          full_name: navigationState.patientName,
        } as any)
      : undefined,
  });

  const {
    goals,
    pathologies,
    activePathologies,
    soapRecords: previousEvolutions,
    measurements,
    requiredMeasurements,
    surgeries,
    medicalReturns,
    invalidateData,
    isLoadingTabData,
    // Add appointments query
  } = useEvolutionDataOptimized({
    patientId: patientId || "",
    activeTab,
    loadStrategy: "tab-based",
    prefetchNextTab: false,
  });

  const { data: allAppointmentsResponse } = useQuery({
    queryKey: ["patient-appointments-all", patientId],
    queryFn: () => appointmentsApi.list({ patientId: patientId || "", limit: 1000 }),
    enabled: !!patientId,
  });

  const allAppointments = allAppointmentsResponse?.data || [];

  usePrefetchStrategy({
    patientId: patientId || "",
    activeTab,
    activePathologies,
    enabled: !!patientId && !dataLoading,
  });

  const { lastSession, isLoadingLastSession, suggestExerciseChanges } = useSessionExercises(
    patientId || "",
  );
  const { data: draftByAppointment, isLoading: isDraftLoading } = useDraftSoapRecordByAppointment(
    patientId || "",
    appointmentId,
  );

  // ========== SYNC DRAFTS ==========
  useEffect(() => {
    if (!draftByAppointment || currentSoapRecordId !== undefined) return;

    const observacao = draftByAppointment.observacao ?? "";
    const painScaleValue = draftByAppointment.pain_scale ?? draftByAppointment.pain_level ?? null;

    setEvolutionData({
      observacao,
      painScale: painScaleValue,
      procedures: Array.isArray(draftByAppointment.procedures)
        ? (draftByAppointment.procedures as ProcedureItem[])
        : [],
      exercises: Array.isArray(draftByAppointment.exercises)
        ? (draftByAppointment.exercises as ExerciseItem[])
        : [],
      measurements: Array.isArray(draftByAppointment.measurements)
        ? (draftByAppointment.measurements as MeasurementItem[])
        : [],
      homeExercises: Array.isArray(draftByAppointment.home_exercises)
        ? (draftByAppointment.home_exercises as HomeExerciseItem[])
        : [],
    });

    // P2.3: V2 mirror agora é derivado via useMemo — sync manual eliminado.
    setSoapData({ subjective: "", objective: "", assessment: "", plan: "" });

    if (painScaleValue != null) {
      setPainScale({ level: painScaleValue });
    }
    setCurrentSoapRecordId(draftByAppointment.id);

    const draftTherapistId =
      draftByAppointment.created_by ||
      (draftByAppointment as { therapist_id?: string }).therapist_id;
    if (draftTherapistId) {
      setSelectedTherapistId(draftTherapistId);
    }
  }, [draftByAppointment, currentSoapRecordId]);

  useEffect(() => {
    if (appointment && !selectedTherapistId && !draftByAppointment) {
      const normalizedAppointment = appointment as {
        therapist_id?: string | null;
        therapistId?: string | null;
      };
      const apptTherapistId =
        normalizedAppointment.therapist_id ?? normalizedAppointment.therapistId;
      if (apptTherapistId) {
        setSelectedTherapistId(String(apptTherapistId));
      }
    }
  }, [appointment, selectedTherapistId, draftByAppointment]);

  useEffect(() => {
    if (
      lastSession?.exercises_performed &&
      sessionExercises.length === 0 &&
      !isLoadingLastSession
    ) {
      setSessionExercises(lastSession.exercises_performed as any[]);
    }
  }, [lastSession, sessionExercises.length, isLoadingLastSession]);

  const isEdited =
    draftByAppointment?.updated_at &&
    draftByAppointment?.created_at &&
    new Date(draftByAppointment.updated_at).getTime() -
      new Date(draftByAppointment.created_at).getTime() >
      60000; // More than 1 minute difference

  // P2.3: evolutionV2Data DERIVADO do canonical (fonte única da verdade).
  // unifiedItems é computado a partir de procedures + exercises com discriminator `type`.
  // homeCareExercises (JSON string esperada pelo NotionPanel) serializado de homeExercises array.
  const evolutionV2Data = useMemo<EvolutionV2Data>(() => {
    const procs = (evolutionData.procedures ?? []) as any[];
    const exs = (evolutionData.exercises ?? []) as any[];
    const unifiedItems = [
      ...procs.map((p, i) => ({
        id: p.id,
        name: p.name,
        completed: !!p.completed,
        type: "procedure" as const,
        notes: p.notes,
        intensity: p.intensity,
        category: p.category,
        exerciseId: p.exerciseId,
        order: p.sequenceOrder ?? i,
      })),
      ...exs.map((e, i) => ({
        id: e.id,
        name: e.name,
        completed: !!e.completed,
        type: "exercise" as const,
        prescription: e.prescription,
        patientFeedback: e.patientFeedback,
        order: e.sequenceOrder ?? procs.length + i,
      })),
    ];
    const homeCareExercisesJson =
      (evolutionData.homeExercises?.length ?? 0) > 0
        ? JSON.stringify(
            (evolutionData.homeExercises as any[]).map((h, i) => ({
              id: h.id || `hc_${i}`,
              name: h.name || "",
              prescription: h.prescription || "3x10",
              instructions: h.instructions || h.notes || "",
            })),
          )
        : undefined;
    return {
      therapistName: "",
      therapistCrefito: "",
      sessionDate: appointment?.date
        ? new Date(appointment.date).toISOString()
        : new Date().toISOString(),
      patientReport: "",
      evolutionText: evolutionData.observacao ?? "",
      observations: evolutionData.observacao ?? "",
      painLevel: evolutionData.painScale ?? undefined,
      procedures: procs,
      exercises: exs,
      measurements: evolutionData.measurements ?? [],
      unifiedItems: unifiedItems.length > 0 ? unifiedItems : undefined,
      homeCareExercises: homeCareExercisesJson,
    } as EvolutionV2Data;
  }, [evolutionData, appointment?.date]);

  // P2.3: setter V2 traduz para canonical (fonte única). NotionEvolutionPanel
  // chama onChange com shape V2; aqui convertemos e setamos no canonical.
  const setEvolutionV2Data = useCallback(
    (updater: EvolutionV2Data | ((prev: EvolutionV2Data) => EvolutionV2Data)) => {
      setEvolutionData((current) => {
        const prevV2: EvolutionV2Data = {
          therapistName: "",
          therapistCrefito: "",
          sessionDate: new Date().toISOString(),
          patientReport: "",
          evolutionText: current.observacao ?? "",
          observations: current.observacao ?? "",
          painLevel: current.painScale ?? undefined,
          procedures: (current.procedures as any) ?? [],
          exercises: (current.exercises as any) ?? [],
          measurements: (current.measurements as any) ?? [],
        } as any;
        const next = typeof updater === "function" ? (updater as any)(prevV2) : updater;

        // Decompõe unifiedItems em procedures + exercises (se presente)
        const usesUnified = Array.isArray(next.unifiedItems);
        const orderedItems = usesUnified
          ? [...next.unifiedItems].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          : [];
        const procedures = usesUnified
          ? orderedItems
              .map((item: any, index: number) => ({ item, sequenceOrder: index + 1 }))
              .filter(({ item }: any) => item.type === "procedure")
              .map(({ item, sequenceOrder }: any) => ({
                id: item.id,
                exerciseId: item.exerciseId,
                name: item.name,
                completed: item.completed,
                sequenceOrder,
                notes: item.notes,
                category: item.category,
                intensity: item.intensity,
              }))
          : next.procedures ?? current.procedures;
        const exercises = usesUnified
          ? orderedItems
              .map((item: any, index: number) => ({ item, sequenceOrder: index + 1 }))
              .filter(({ item }: any) => item.type === "exercise")
              .map(({ item, sequenceOrder }: any) => ({
                id: item.id,
                name: item.name,
                completed: item.completed,
                sequenceOrder,
                prescription: item.prescription,
                patientFeedback: item.patientFeedback,
              }))
          : next.exercises ?? current.exercises;

        // homeCareExercises (JSON string) → homeExercises array canonical
        let homeExercises = current.homeExercises;
        if (next.homeCareExercises !== undefined) {
          if (typeof next.homeCareExercises === "string" && next.homeCareExercises.trim()) {
            try {
              const parsed = JSON.parse(next.homeCareExercises);
              if (Array.isArray(parsed)) {
                homeExercises = parsed.map((item: any) => ({
                  id: item.id || "",
                  name: item.name || "",
                  prescription: item.prescription || "",
                  notes: item.instructions || item.notes || "",
                }));
              }
            } catch {
              const lines = next.homeCareExercises.split("\n").filter((l: string) => l.trim());
              homeExercises = lines.map((line: string, i: number) => {
                const parts = line.split("-");
                return {
                  id: `hc_${i}`,
                  name: parts[0]?.replace(/^\d+[.)]\s*/, "").trim() || "",
                  prescription: parts[1]?.trim() || "",
                  notes: "",
                };
              });
            }
          } else if (
            Array.isArray(next.homeCareExercises) &&
            (next.homeCareExercises as any[]).length === 0
          ) {
            homeExercises = [];
          }
        }

        // Guarda anti-corrupção: se TODOS os campos do next estão vazios E
        // o current tem conteúdo, é uma montagem inicial do editor (TipTap
        // dispara onChange com "" antes do value prop sincronizar). NÃO
        // sobrescrever — preserva o canonical hidratado do servidor.
        const nextIsEmpty =
          (next.observations === "" || next.observations === undefined) &&
          (next.evolutionText === "" || next.evolutionText === undefined) &&
          (next.painLevel == null) &&
          !((next.unifiedItems?.length ?? 0) > 0) &&
          !((next.procedures?.length ?? 0) > 0) &&
          !((next.exercises?.length ?? 0) > 0) &&
          !((next.measurements?.length ?? 0) > 0);
        const currentHasContent =
          (current.observacao?.trim()?.length ?? 0) > 0 ||
          current.painScale != null ||
          (current.procedures?.length ?? 0) > 0 ||
          (current.exercises?.length ?? 0) > 0 ||
          (current.measurements?.length ?? 0) > 0;
        if (nextIsEmpty && currentHasContent) {
          return current;
        }

        // Guard mais cirúrgico: preserva observacao quando next tenta zerar
        // (TipTap dispara onChange com "" antes do value sincronizar) mas
        // current já tem texto. User pode esvaziar via undo/redo do editor.
        const nextObservacaoIncoming =
          (typeof next.observations === "string" && next.observations.trim().length > 0)
            ? next.observations
            : (typeof next.evolutionText === "string" && next.evolutionText.trim().length > 0)
              ? next.evolutionText
              : null;
        const preservedObs =
          nextObservacaoIncoming !== null
            ? nextObservacaoIncoming
            : (current.observacao ?? "");

        return {
          ...current,
          observacao: preservedObs,
          painScale: next.painLevel ?? current.painScale,
          procedures: procedures as any,
          exercises: exercises as any,
          measurements: (next.measurements as any) ?? current.measurements,
          homeExercises,
        };
      });
    },
    [],
  );

  return {
    appointmentId,
    appointment,
    patient,
    patientId,
    dataLoading,
    isDraftLoading,
    appointmentError,
    patientError,
    activeTab,
    setActiveTab,
    evolutionVersion,
    setEvolutionVersion,
    autoSaveEnabled,
    setAutoSaveEnabled,
    showApplyTemplate,
    setShowApplyTemplate,
    showInsights,
    setShowInsights,
    showComparison,
    setShowComparison,
    showKeyboardHelp,
    setShowKeyboardHelp,
    showAIScribe,
    setShowAIScribe,
    selectedTherapistId,
    setSelectedTherapistId,
    // Canonical evolution model
    evolutionData,
    setEvolutionData,
    // Legacy mirrors (Fase 3 elimina)
    soapData,
    setSoapData,
    painScale,
    setPainScale,
    sessionExercises,
    setSessionExercises,
    evolutionV2Data,
    setEvolutionV2Data,
    currentSoapRecordId,
    setCurrentSoapRecordId,
    // Data from optimized hook
    goals,
    pathologies,
    activePathologies,
    previousEvolutions,
    measurements,
    requiredMeasurements,
    surgeries,
    medicalReturns,
    invalidateData,
    isLoadingTabData,
    // Services/Helpers
    lastSession,
    suggestExerciseChanges,
    therapists,
    evolutionTemplates,
    user,
    isEdited,
    allAppointments,
  };
}
