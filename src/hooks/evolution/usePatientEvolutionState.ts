import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
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
  const [evolutionVersion, setEvolutionVersionRaw] = useState<EvolutionVersion>(() => {
    try {
      return (localStorage.getItem("fisioflow-evolution-version") as EvolutionVersion) || "v1-soap";
    } catch {
      return "v1-soap";
    }
  });
  const setEvolutionVersion = (v: EvolutionVersion) => {
    try {
      localStorage.setItem("fisioflow-evolution-version", v);
    } catch {
      /* ignore */
    }
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
  } = useEvolutionDataOptimized({
    patientId: patientId || "",
    activeTab,
    loadStrategy: "tab-based",
    prefetchNextTab: false,
  });

  usePrefetchStrategy({
    patientId: patientId || "",
    activeTab,
    activePathologies,
    enabled: !!patientId && !dataLoading,
  });

  const { lastSession, isLoadingLastSession, suggestExerciseChanges } = useSessionExercises(
    patientId || "",
  );
  const { data: draftByAppointment } = useDraftSoapRecordByAppointment(
    patientId || "",
    appointmentId,
  );

  // ========== SYNC DRAFTS ==========
  useEffect(() => {
    if (!draftByAppointment || currentSoapRecordId !== undefined) return;
    setSoapData({
      subjective: draftByAppointment.subjective ?? "",
      objective: draftByAppointment.objective ?? "",
      assessment: draftByAppointment.assessment ?? "",
      plan: draftByAppointment.plan ?? "",
    });
    if (draftByAppointment.pain_level !== undefined) {
      setPainScale({
        level: draftByAppointment.pain_level,
        location: draftByAppointment.pain_location,
        character: draftByAppointment.pain_character,
      });
    }
    setCurrentSoapRecordId(draftByAppointment.id);
  }, [draftByAppointment, currentSoapRecordId]);

  useEffect(() => {
    if (
      lastSession?.exercises_performed &&
      sessionExercises.length === 0 &&
      !isLoadingLastSession
    ) {
      setSessionExercises(lastSession.exercises_performed as any[]);
    }
  }, [lastSession, sessionExercises.length, isLoadingLastSession]);

  return {
    appointmentId,
    appointment,
    patient,
    patientId,
    dataLoading,
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
  };
}
