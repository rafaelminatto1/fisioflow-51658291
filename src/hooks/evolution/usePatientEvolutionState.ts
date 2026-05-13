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
import { formatClinicalText } from "@/lib/evolution/formatters";

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
  const { data: draftByAppointment } = useDraftSoapRecordByAppointment(
    patientId || "",
    appointmentId,
  );

  // ========== SYNC DRAFTS ==========
  useEffect(() => {
    if (!draftByAppointment || currentSoapRecordId !== undefined) return;
    
    // Sync SOAP fields
    const subjective = formatClinicalText(draftByAppointment.subjective ?? "");
    const objective = formatClinicalText(draftByAppointment.objective ?? "");
    const assessment = formatClinicalText(draftByAppointment.assessment ?? "");
    const plan = formatClinicalText(draftByAppointment.plan ?? "");

    setSoapData({
      subjective,
      objective,
      assessment,
      plan,
    });

    // Sync V2-V5 data (mapping standard fields back)
    setEvolutionV2Data((prev: any) => ({
      ...prev,
      patientReport: subjective,
      evolutionText: objective,
      observations: plan,
      // Note: procedures are stored as a string in assessment in v2-texto,
      // we don't parse them back to an array yet to avoid complexity,
      // but at least the other main fields are restored.
    }));

    if (draftByAppointment.pain_level !== undefined && draftByAppointment.pain_level !== null) {
      setPainScale({
        level: draftByAppointment.pain_level,
        location: draftByAppointment.pain_location,
        character: draftByAppointment.pain_character,
      });
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
    isEdited,
    allAppointments,
  };
}
