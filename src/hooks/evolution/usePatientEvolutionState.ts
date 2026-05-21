import { useState, useEffect } from "react";
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
  const [evolutionV2Data, setEvolutionV2Data] = useState<EvolutionV2Data>({
    therapistName: "",
    therapistCrefito: "",
    sessionDate: new Date().toISOString(),
    patientReport: "",
    evolutionText: "",
    procedures: [],
    exercises: [],
    observations: "",
  });

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

    // Mirror V2: popular TODOS os campos a partir do servidor para que a UI
    // (NotionEvolutionPanel) reflita o estado salvo ao reabrir a evolução.
    setSoapData({ subjective: "", objective: "", assessment: "", plan: "" });
    const serverProcedures = Array.isArray(draftByAppointment.procedures)
      ? (draftByAppointment.procedures as any[])
      : [];
    const serverExercises = Array.isArray(draftByAppointment.exercises)
      ? (draftByAppointment.exercises as any[])
      : [];
    const serverMeasurements = Array.isArray(draftByAppointment.measurements)
      ? (draftByAppointment.measurements as any[])
      : [];
    const serverHomeExercises = Array.isArray(draftByAppointment.home_exercises)
      ? (draftByAppointment.home_exercises as any[])
      : [];
    const homeCareExercisesJson = serverHomeExercises.length > 0
      ? JSON.stringify(
          serverHomeExercises.map((h: any, i: number) => ({
            id: h.id || `hc_${i}`,
            name: h.name || "",
            prescription: h.prescription || "3x10",
            instructions: h.instructions || h.notes || "",
          })),
        )
      : undefined;
    const migratedUnifiedItems = [
      ...serverProcedures.map((p: any) => ({
        id: p.id,
        name: p.name,
        completed: !!p.completed,
        type: "procedure" as const,
        notes: p.notes,
        intensity: p.intensity,
        category: p.category,
        exerciseId: p.exerciseId,
        order: p.sequenceOrder,
      })),
      ...serverExercises.map((e: any) => ({
        id: e.id,
        name: e.name,
        completed: !!e.completed,
        type: "exercise" as const,
        prescription: e.prescription,
        patientFeedback: e.patientFeedback,
        order: e.sequenceOrder,
      })),
    ];
    setEvolutionV2Data((prev: any) => ({
      ...prev,
      patientReport: "",
      evolutionText: observacao,
      observations: observacao,
      painLevel: painScaleValue ?? prev.painLevel,
      procedures: serverProcedures,
      exercises: serverExercises,
      measurements: serverMeasurements,
      unifiedItems: migratedUnifiedItems.length > 0 ? migratedUnifiedItems : prev.unifiedItems,
      homeCareExercises: homeCareExercisesJson ?? prev.homeCareExercises,
    }));

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
