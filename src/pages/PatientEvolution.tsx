/**
 * Patient Evolution Page - Migrated to Firebase
 * Optimized with useEvolutionDataOptimized for better performance
 */

import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit } from '@/integrations/firebase/app';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  format,
  differenceInDays,
  differenceInMinutes as diffInMinutes,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDetailedDuration } from '@/utils/dateUtils';
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  BarChart3,
  Activity,
  Clock,
  Sparkles,
  RefreshCw,
  Edit,
} from 'lucide-react';

import { EvolutionDebugInfo } from '@/components/evolution/EvolutionDebugInfo';
import { MedicalReturnCard } from '@/components/evolution/MedicalReturnCard';
import { SurgeriesCard } from '@/components/evolution/SurgeriesCard';
import { MetasCard } from '@/components/evolution/MetasCard';
import { EvolutionSummaryCard } from '@/components/evolution/EvolutionSummaryCard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { CardGrid } from '@/components/layout/ResponsiveGridLayout';
import { EvolutionGridContainer } from '@/components/evolution/EvolutionResponsiveLayout';
import { useToast } from '@/hooks/use-toast';
import { useCommandPalette } from '@/hooks/ui/useCommandPalette';
import { fisioLogger as logger } from '@/lib/errors/logger';

// Hooks
import { useEvolutionDataOptimized, type EvolutionTab } from '@/hooks/evolution/useEvolutionDataOptimized';
import { usePrefetchStrategy } from '@/hooks/evolution/usePrefetchStrategy';
import { useAppointmentData } from '@/hooks/useAppointmentData';
import { useAutoSaveSoapRecord, useDraftSoapRecordByAppointment, type SoapRecord } from '@/hooks/useSoapRecords';
import { useGamification } from '@/hooks/useGamification';
import { useSessionExercises } from '@/hooks/useSessionExercises';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { useTherapists } from '@/hooks/useTherapists';
import { useQueryClient } from '@tanstack/react-query';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';
import { useAuth } from '@/hooks/useAuth';
import { db, getFirebaseAuth } from '@/integrations/firebase/app';
import { useEvolutionTemplates, type EvolutionTemplate } from '@/hooks/useEvolutionTemplates';

// Componentes de Evolução
import { MandatoryTestAlert } from '@/components/session/MandatoryTestAlert';
import { EvolutionHeader } from '@/components/evolution/EvolutionHeader';
import { FloatingActionBar } from '@/components/evolution/FloatingActionBar';
import { SessionExercise } from '@/components/evolution/SessionExercisesPanel';
import { EvolutionKeyboardShortcuts } from '@/components/evolution/EvolutionKeyboardShortcuts';
import { useEvolutionShortcuts } from '@/hooks/evolution/useEvolutionShortcuts';
import { EvolutionAlerts } from '@/components/evolution/EvolutionAlerts';
import { PatientEvolutionErrorBoundary } from '@/components/patients/PatientEvolutionErrorBoundary';
import { ApplyTemplateModal } from '@/components/exercises/ApplyTemplateModal';
import { PatientHelpers } from '@/types';

// V2 Evolution (Notion-style)
import type { EvolutionVersion, EvolutionV2Data } from '@/components/evolution/v2/types';
import { getTherapistById } from '@/hooks/useTherapists';

// Lazy loading para componentes pesados
const LazyNotionEvolutionPanel = lazy(() => import('@/components/evolution/v2/NotionEvolutionPanel').then(m => ({ default: m.NotionEvolutionPanel })));
const LazyNotionEvolutionPanelV3 = lazy(() => import('@/components/evolution/v3-notion/NotionEvolutionPanel').then(m => ({ default: m.NotionEvolutionPanel })));
const LazyEvolutionDraggableGrid = lazy(() => import('@/components/evolution/EvolutionDraggableGrid').then(m => ({ default: m.EvolutionDraggableGrid })));

// OTIMIZAÇÃO: Lazy loading de abas completas para melhor code splitting
// Requirements: 4.1, 4.4 - Component-level code splitting
const LazyEvolucaoTab = lazy(() => import('@/components/evolution/tabs/EvolucaoTab').then(m => ({ default: m.EvolucaoTab })));
const LazyAvaliacaoTab = lazy(() => import('@/components/evolution/tabs/AvaliacaoTab').then(m => ({ default: m.AvaliacaoTab })));
const LazyTratamentoTab = lazy(() => import('@/components/evolution/tabs/TratamentoTab').then(m => ({ default: m.TratamentoTab })));
const LazyHistoricoTab = lazy(() => import('@/components/evolution/tabs/HistoricoTab').then(m => ({ default: m.HistoricoTab })));
const LazyAssistenteTab = lazy(() => import('@/components/evolution/tabs/AssistenteTab').then(m => ({ default: m.AssistenteTab })));

// Tipo para escala de dor
export interface PainScaleData {
  level: number;
  location?: string;
  character?: string;
}

// OTIMIZAÇÃO: Configuração de abas movida para escopo do módulo (constante)
// Requirement 8.1, 8.4 - Remove unnecessary memoization
const TABS_CONFIG = [
  { value: 'evolucao', label: 'Evolução', shortLabel: 'Evol', icon: FileText, description: 'SOAP + Dor' },
  { value: 'avaliacao', label: 'Avaliação', shortLabel: 'Aval', icon: BarChart3, description: 'Medições + Testes' },
  { value: 'tratamento', label: 'Tratamento', shortLabel: 'Trat', icon: Activity, description: 'Exercícios + Metas' },
  { value: 'historico', label: 'Histórico', shortLabel: 'Hist', icon: Clock, description: 'Timeline + Relatórios' },
  { value: 'assistente', label: 'Assistente', shortLabel: 'IA', icon: Sparkles, description: 'IA + WhatsApp' },
] as const;

type ParsedSoapSections = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

const parseSoapTemplateContent = (content: string): ParsedSoapSections | null => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let current: keyof ParsedSoapSections | null = null;
  const sections: ParsedSoapSections = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  };

  const mapLabelToKey = (label: string): keyof ParsedSoapSections | null => {
    const normalized = label.trim().toLowerCase();
    if (normalized === 's' || normalized.startsWith('subjetiv')) return 'subjective';
    if (normalized === 'o' || normalized.startsWith('objetiv')) return 'objective';
    if (normalized === 'a' || normalized.startsWith('avali')) return 'assessment';
    if (normalized === 'p' || normalized.startsWith('plano')) return 'plan';
    return null;
  };

  for (const line of lines) {
    const match = line.match(/^\s*(subjetivo|subjetiva|s|objetivo|o|avaliação|avaliacao|a|plano|p)\s*[:\-]\s*(.*)$/i);
    if (match) {
      const key = mapLabelToKey(match[1]);
      if (key) {
        current = key;
        const remainder = match[2]?.trim();
        if (remainder) {
          sections[key] += (sections[key] ? '\n' : '') + remainder;
        }
        continue;
      }
    }

    if (current) {
      sections[current] += (sections[current] ? '\n' : '') + line.trim();
    }
  }

  const hasAny = Object.values(sections).some((value) => value.trim().length > 0);
  return hasAny ? sections : null;
};

const mapEvolutionTemplateToSoapTemplate = (template: EvolutionTemplate) => {
  const parsed = parseSoapTemplateContent(template.conteudo || '');
  const objectiveFallback = template.conteudo || '';
  return {
    id: template.id,
    name: template.nome,
    category: 'custom' as const,
    subjective: parsed?.subjective || '',
    objective: parsed?.objective || objectiveFallback,
    assessment: parsed?.assessment || '',
    plan: parsed?.plan || '',
    usageCount: 0,
  };
};

const PatientEvolution = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isGenerating, generateEvolucao, downloadPDF } = usePDFGenerator();

  // Command Palette hook - handles Ctrl+K globally
  const { CommandPaletteComponent } = useCommandPalette();

  // ========== ESTADOS ==========
  // Estados SOAP
  const [currentSoapRecordId, setCurrentSoapRecordId] = useState<string | undefined>();
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  // Estados de UI
  const [sessionStartTime] = useState(new Date());
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<EvolutionTab>('evolucao'); // evolucao, avaliacao, tratamento, historico, assistente
  const [sessionLongAlertShown, setSessionLongAlertShown] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Escala de dor
  const [painScale, setPainScale] = useState<PainScaleData>({ level: 0 });

  // Exercícios da sessão
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

  // Fisioterapeuta responsável pela sessão (dropdown + CREFITO no header)
  const [selectedTherapistId, setSelectedTherapistId] = useState('');

  // ========== EVOLUÇÃO V2 (Texto Livre / Notion-style) ==========
  const [evolutionVersion, setEvolutionVersion] = useState<EvolutionVersion>(() => {
    try {
      return (localStorage.getItem('fisioflow-evolution-version') as EvolutionVersion) || 'v1-soap';
    } catch { return 'v1-soap'; }
  });
  const [evolutionV2Data, setEvolutionV2Data] = useState<EvolutionV2Data>({
    therapistName: '',
    therapistCrefito: '',
    sessionDate: new Date().toISOString(),
    patientReport: '',
    evolutionText: '',
    procedures: [],
    exercises: [],
    observations: '',
  });

  // ========== HOOKS ==========
  const queryClient = useQueryClient();
  const { therapists } = useTherapists();
  const { data: evolutionTemplates = [] } = useEvolutionTemplates();
  // Ações de agendamento (completar atendimento)
  const { completeAppointment, isCompleting } = useAppointmentActions();

  // Retrieve state from navigation if available (optimization)
  const location = useLocation();
  const navigationState = location.state as { patientId?: string; patientName?: string } | null;

  // Dados do agendamento e paciente - PRECISA ser chamado primeiro para obter patientId
  const {
    appointment,
    patient,
    patientId,
    isLoading: dataLoading,
    appointmentError,
    patientError
  } = useAppointmentData(appointmentId, {
    initialPatientId: navigationState?.patientId,
    initialPatientData: navigationState?.patientName ? {
      id: navigationState.patientId!,
      name: navigationState.patientName,
      full_name: navigationState.patientName
    } as any : undefined
  });

  // OTIMIZAÇÃO: Hook centralizado para carregar dados de evolução com cache otimizado
  // Requirement 3.1, 3.2: Tab-based data loading
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
    isLoadingCritical,
    isLoadingTabData,
  } = useEvolutionDataOptimized({
    patientId: patientId || '',
    activeTab,
    loadStrategy: 'tab-based', // Use tab-based loading for optimal performance
    prefetchNextTab: false // Disable built-in prefetch, using dedicated hook instead
  });

  // OTIMIZAÇÃO: Prefetch inteligente da próxima aba
  // Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
  usePrefetchStrategy({
    patientId: patientId || '',
    activeTab,
    activePathologies,
    enabled: !!patientId && !dataLoading,
  });

  const customSoapTemplates = useMemo(
    () => evolutionTemplates.map(mapEvolutionTemplateToSoapTemplate),
    [evolutionTemplates]
  );

  // Timeout warning state
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (dataLoading) {
      timeout = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, 10000); // 10 seconds
    } else {
      setShowTimeoutWarning(false);
    }
    return () => clearTimeout(timeout);
  }, [dataLoading]);

  // Hooks que dependem de patientId - chamados APÓS useAppointmentData
  const { lastSession, isLoadingLastSession, suggestExerciseChanges } = useSessionExercises(patientId || '');
  const { awardXp } = useGamification(patientId || '');
  const { data: draftByAppointment } = useDraftSoapRecordByAppointment(patientId || '', appointmentId);

  // Hook de auto-save
  const autoSaveMutation = useAutoSaveSoapRecord();

  // ========== CALLBACKS ==========
  const setSoapDataStable = useCallback((data: { subjective: string; objective: string; assessment: string; plan: string }) => {
    setSoapData(data);
  }, []);

  // V2: Handle version change & persist preference
  const handleVersionChange = useCallback((version: EvolutionVersion) => {
    setEvolutionVersion(version);
    try { localStorage.setItem('fisioflow-evolution-version', version); } catch { /* ignore */ }
  }, []);

  // V2: Stable setter for NotionEvolutionPanel
  const setEvolutionV2DataStable = useCallback((data: EvolutionV2Data) => {
    setEvolutionV2Data(data);
  }, []);

  // ========== EFFECTS ==========
  // Carregar draft existente ao abrir a página (evolução em progresso para este agendamento)
  useEffect(() => {
    if (!draftByAppointment || currentSoapRecordId !== undefined) return;
    setSoapData({
      subjective: draftByAppointment.subjective ?? '',
      objective: draftByAppointment.objective ?? '',
      assessment: draftByAppointment.assessment ?? '',
      plan: draftByAppointment.plan ?? ''
    });
    if (draftByAppointment.pain_level !== undefined) {
      setPainScale({
        level: draftByAppointment.pain_level,
        location: draftByAppointment.pain_location,
        character: draftByAppointment.pain_character
      });
    }
    setCurrentSoapRecordId(draftByAppointment.id);
  }, [draftByAppointment, currentSoapRecordId]);

  // Carregar exercícios da sessão anterior se a sessão atual estiver vazia
  useEffect(() => {
    if (lastSession?.exercises_performed && sessionExercises.length === 0 && !isLoadingLastSession) {
      setSessionExercises(lastSession.exercises_performed as SessionExercise[]);
    }
  }, [lastSession, sessionExercises.length, isLoadingLastSession]);

  // ========== MEMOIZED VALUES ==========
  // Tempo de tratamento do paciente - REMOVIDO useMemo (computação simples)
  const treatmentDuration = patient?.created_at
    ? formatDetailedDuration(patient.created_at)
    : 'N/A';

  // Estatísticas de evolução - MANTIDO (agregação complexa)
  const evolutionStats = useMemo(() => {
    const totalEvolutions = previousEvolutions.length;
    const completedGoals = goals.filter(g => g.status === 'concluido').length;
    const totalGoals = goals.length;
    const activePathologiesCount = pathologies.filter(p => p.status === 'em_tratamento').length;
    const totalMeasurements = measurements.length;

    // Calcular progresso médio das metas
    const avgGoalProgress = goals.length > 0
      ? goals
        .filter(g => g.status === 'em_andamento')
        .reduce((sum, g) => {
          const progress = g.target_date
            ? Math.max(0, Math.min(100, 100 - (differenceInDays(new Date(g.target_date), new Date()) / 30) * 100))
            : 50;
          return sum + progress;
        }, 0) / Math.max(1, goals.filter(g => g.status === 'em_andamento').length)
      : 0;

    return {
      totalEvolutions,
      completedGoals,
      totalGoals,
      activePathologiesCount,
      totalMeasurements,
      avgGoalProgress: Math.round(avgGoalProgress),
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  }, [previousEvolutions, goals, pathologies, measurements]);

  // Medições realizadas hoje
  const todayMeasurements = useMemo(() => {
    const today = startOfDay(new Date());
    return measurements.filter(m => {
      const measurementDate = startOfDay(new Date(m.measured_at));
      return measurementDate.getTime() === today.getTime();
    });
  }, [measurements]);

  // Medições agrupadas por tipo para gráficos
  const measurementsByType = useMemo(() => {
    const grouped: Record<string, Array<{ date: string; value: number; fullDate: string }>> = {};
    measurements.forEach(m => {
      if (!grouped[m.measurement_name]) {
        grouped[m.measurement_name] = [];
      }
      grouped[m.measurement_name].push({
        date: format(new Date(m.measured_at), 'dd/MM', { locale: ptBR }),
        value: m.value,
        fullDate: m.measured_at
      });
    });
    return grouped;
  }, [measurements]);

  // V2: Keep therapist info in sync with header block
  useEffect(() => {
    if (!therapists.length) return;
    const selected = selectedTherapistId ? getTherapistById(therapists, selectedTherapistId) : null;
    setEvolutionV2Data(prev => ({
      ...prev,
      therapistName: selected?.name || '',
      therapistCrefito: selected?.crefito || '',
      sessionDate: appointment?.appointment_date || new Date().toISOString(),
      sessionNumber: evolutionStats.totalEvolutions + 1,
    }));
  }, [selectedTherapistId, therapists, appointment?.appointment_date, evolutionStats.totalEvolutions]);

  // ========== ALERTAS INTELIGENTES (Memoizados) ==========
  // Metas próximas do vencimento
  const upcomingGoals = useMemo(() =>
    goals.filter(g => {
      if (g.status === 'concluido') return false;
      if (!g.target_date) return false;
      const daysUntilDue = differenceInDays(new Date(g.target_date), new Date());
      return daysUntilDue <= 3 && daysUntilDue >= 0;
    }),
    [goals]
  );

  // Metas vencidas
  const overdueGoals = useMemo(() =>
    goals.filter(g => {
      if (g.status === 'concluido') return false;
      if (!g.target_date) return false;
      return differenceInDays(new Date(g.target_date), new Date()) < 0;
    }),
    [goals]
  );

  // Dias desde a última evolução
  const daysSinceLastEvolution = useMemo(() => {
    if (previousEvolutions.length === 0) return null;
    const lastEvolution = previousEvolutions[0];
    return differenceInDays(new Date(), new Date(lastEvolution.created_at));
  }, [previousEvolutions]);

  // Tendência da dor baseada nas últimas evoluções
  const painTrend = useMemo(() => {
    const recentPainLevels = previousEvolutions
      .slice(0, 5)
      .filter((e: SoapRecord) => e.pain_level !== null && e.pain_level !== undefined)
      .map((e: SoapRecord) => e.pain_level || 0);

    if (recentPainLevels.length < 2) return null;

    const avg = recentPainLevels.reduce((a: number, b: number) => a + b, 0) / recentPainLevels.length;
    const latest = recentPainLevels[0];

    if (latest > avg + 2) return 'worsening'; // Piora
    if (latest < avg - 2) return 'improving'; // Melhora
    return 'stable'; // Estável
  }, [previousEvolutions]);

  // Duração da sessão em minutos - REMOVIDO useMemo (computação simples)
  const sessionDurationMinutes = diffInMinutes(new Date(), sessionStartTime);

  // Memoize painHistory array to prevent recreation on every render - MANTIDO (transformação de array)
  const painHistory = useMemo(() =>
    previousEvolutions
      .filter(e => e.pain_level !== null && e.pain_level !== undefined)
      .map(e => ({ date: e.created_at, level: e.pain_level || 0 })),
    [previousEvolutions]
  );

  // REMOVIDO: tabsConfig agora é constante do módulo (TABS_CONFIG)

  // Memoize required measurements for alerts to prevent recreation - MANTIDO (filtragem + transformação)
  const pendingRequiredMeasurements = useMemo(() =>
    requiredMeasurements.filter(req => {
      const completedToday = todayMeasurements.some(m => m.measurement_name === req.measurement_name);
      return !completedToday;
    }).map(req => ({
      id: req.id || req.measurement_name,
      name: req.measurement_name,
      critical: req.alert_level === 'high',
      completed: false
    })),
    [requiredMeasurements, todayMeasurements]
  );

  // Memoize mandatory test alerts data
  const mandatoryTestAlertsData = useMemo(() =>
    requiredMeasurements.map(req => {
      const completedToday = todayMeasurements.some(m => m.measurement_name === req.measurement_name);
      return {
        id: req.id || req.measurement_name,
        name: req.measurement_name,
        critical: req.alert_level === 'high',
        completed: completedToday
      };
    }),
    [requiredMeasurements, todayMeasurements]
  );

  // ========== AUTO-SAVE ==========
  // Auto-save data source depends on active version
  const autoSaveData = useMemo(() => {
    if (evolutionVersion === 'v2-texto') {
      return {
        subjective: evolutionV2Data.patientReport || '',
        objective: evolutionV2Data.evolutionText || '',
        assessment: evolutionV2Data.procedures.map(p => `${p.completed ? '[x]' : '[ ]'} ${p.name}${p.notes ? ` - ${p.notes}` : ''}`).join('\n'),
        plan: evolutionV2Data.observations || '',
      };
    }
    return soapData;
  }, [evolutionVersion, evolutionV2Data, soapData]);

  const { lastSavedAt } = useAutoSave({
    data: autoSaveData,
    onSave: async (data) => {
      if (!patientId || !appointmentId) return;
      if (!data.subjective && !data.objective && !data.assessment && !data.plan) return;

      const record = await autoSaveMutation.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        recordId: currentSoapRecordId,
        ...data
      });

      if (record?.id && record.id !== currentSoapRecordId) {
        setCurrentSoapRecordId(record.id);
      }
    },
    delay: 5000,
    enabled: autoSaveEnabled && !autoSaveMutation.isPending
  });

  // Effect para mostrar alerta de sessão prolongada
  useEffect(() => {
    if (sessionDurationMinutes > 90 && !sessionLongAlertShown) {
      setSessionLongAlertShown(true);
    }
  }, [sessionDurationMinutes, sessionLongAlertShown]);

  // ========== HANDLERS ==========
  const handleCopyPreviousEvolution = useCallback((evolution: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    pain_level?: number;
    pain_location?: string;
    pain_character?: string;
  }) => {
    setSoapData({
      subjective: evolution.subjective || '',
      objective: evolution.objective || '',
      assessment: evolution.assessment || '',
      plan: evolution.plan || ''
    });

    if (evolution.pain_level !== undefined) {
      setPainScale({
        level: evolution.pain_level,
        location: evolution.pain_location,
        character: evolution.pain_character
      });
    }

    toast({
      title: 'Evolução copiada',
      description: 'Os dados da evolução anterior foram copiados.'
    });
  }, [toast]);

  const handleSave = async () => {
    // Verificar testes obrigatórios pendentes (hoje)
    const pendingCriticalTests = requiredMeasurements.filter(req => {
      const hasMeasurementToday = todayMeasurements.some(m => m.measurement_name === req.measurement_name);
      return req.alert_level === 'high' && !hasMeasurementToday;
    });

    if (pendingCriticalTests.length > 0) {
      toast({
        title: 'Testes Obrigatórios Pendentes',
        description: `É necessário realizar: ${pendingCriticalTests.map(t => t.measurement_name).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    // V2/V3: Map V2 data to SOAP fields for saving (backwards compatible)
    const isV2orV3 = evolutionVersion === 'v2-texto' || evolutionVersion === 'v3-notion';
    const saveData = isV2orV3
      ? {
        subjective: evolutionV2Data.patientReport || '',
        objective: evolutionV2Data.evolutionText || '',
        assessment: evolutionV2Data.procedures.map(p => `${p.completed ? '[x]' : '[ ]'} ${p.name}${p.notes ? ` - ${p.notes}` : ''}`).join('\n'),
        plan: evolutionV2Data.observations || '',
      }
      : soapData;

    if (!saveData.subjective && !saveData.objective && !saveData.assessment && !saveData.plan) {
      toast({
        title: 'Campos vazios',
        description: 'Preencha pelo menos um campo antes de salvar.',
        variant: 'destructive'
      });
      return;
    }

    if (!patientId) {
      return;
    }

    // V2/V3: Use exercises from V2 data if in V2 or V3 mode
    const exercisesToSave = (evolutionVersion === 'v2-texto' || evolutionVersion === 'v3-notion')
      ? evolutionV2Data.exercises.map(ex => ({
        id: ex.id,
        exerciseId: ex.exerciseId || ex.id,
        name: ex.name,
        sets: parseInt(ex.prescription.split('x')[0]) || 3,
        repetitions: parseInt(ex.prescription.split('x')[1]) || 10,
        completed: ex.completed,
        observations: [
          ex.observations,
          ex.patientFeedback?.pain ? 'DOR' : '',
          ex.patientFeedback?.fatigue ? 'FADIGA' : '',
          ex.patientFeedback?.difficultyPerforming ? 'DIFICULDADE' : '',
          ex.patientFeedback?.notes,
        ].filter(Boolean).join(' | ') || '',
        weight: '',
        image_url: ex.image_url,
      }))
      : sessionExercises;

    try {
      // Salvar registro SOAP
      const record = await autoSaveMutation.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        recordId: currentSoapRecordId,
        ...saveData,
        pain_level: painScale.level,
        pain_location: painScale.location,
        pain_character: painScale.character
      });

      if (record?.id) {
        setCurrentSoapRecordId(record.id);
      }

      // Salvar sessão de tratamento (exercícios realizados) - Migrado para Firebase
      if (!patientId) return; // evita gravar sessão sem paciente
      const user = getFirebaseAuth().currentUser;
      if (user) {
        // Verificar se já existe sessão para este agendamento
        let existingSessionId: string | null = null;
        if (appointmentId) {
          const q = query(
            collection(db, 'treatment_sessions'),
            where('appointment_id', '==', appointmentId),
            limit(1)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            existingSessionId = snapshot.docs[0].id;
          }
        }

        const therapistId = selectedTherapistId || user?.uid;
        if (!therapistId) return;
        const sessionData = {
          patient_id: patientId,
          therapist_id: therapistId,
          appointment_id: appointmentId || null,
          session_date: new Date().toISOString(),
          session_type: 'treatment',
          exercises_performed: exercisesToSave,
          pain_level_before: painScale.level,
          updated_at: new Date().toISOString(),
        };

        if (existingSessionId) {
          await updateDoc(doc(db, 'treatment_sessions', existingSessionId), sessionData);
        } else {
          await addDoc(collection(db, 'treatment_sessions'), {
            ...sessionData,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao salvar a evolução.',
        variant: 'destructive'
      });
    }
  };

  const handleCompleteSession = async () => {
    const hasV1Content = soapData.subjective || soapData.objective || soapData.assessment || soapData.plan;
    const hasV2Content = evolutionV2Data.patientReport || evolutionV2Data.evolutionText || evolutionV2Data.procedures.length > 0;
    const isV2orV3 = evolutionVersion === 'v2-texto' || evolutionVersion === 'v3-notion';
    const hasContent = isV2orV3 ? hasV2Content : hasV1Content;

    if (!hasContent) {
      toast({
        title: 'Complete a evolução',
        description: (evolutionVersion === 'v2-texto' || evolutionVersion === 'v3-notion')
          ? 'Preencha o texto de evolução antes de concluir o atendimento.'
          : 'Preencha os campos SOAP antes de concluir o atendimento.',
        variant: 'destructive'
      });
      return;
    }

    // Salvar evolução primeiro
    await handleSave();

    // Marcar appointment como concluído
    if (appointmentId) {
      completeAppointment(appointmentId, {
        onSuccess: async () => {
          // Award XP for session completion
          try {
            if (patientId) {
              await awardXp.mutateAsync({
                amount: 100,
                reason: 'session_completed',
                description: 'Sessão de fisioterapia concluída'
              });
            }
          } catch (e) {
            logger.error("Failed to award XP", e, 'PatientEvolution');
          }

          toast({
            title: 'Atendimento concluído',
            description: 'O atendimento foi marcado como concluído com sucesso.'
          });
          setTimeout(() => navigate('/schedule'), 1500);
        }
      });
    }
  };

  const handleExportPDF = async () => {
    if (!patient || !user?.professional || !user?.clinic) {
      toast({
        title: 'Dados incompletos',
        description: 'Não foi possível obter os dados do paciente, profissional ou clínica.',
        variant: 'destructive'
      });
      return;
    }

    setIsExportingPDF(true);
    try {
      // Preparar avaliações (SOAP records) para o PDF
      const evaluations = [
        {
          date: new Date(),
          subjective: soapData.subjective || 'Não preenchido',
          objective: soapData.objective || 'Não preenchido',
          assessment: soapData.assessment || 'Não preenchido',
          plan: soapData.plan || 'Não preenchido',
        },
        ...(previousEvolutions.slice(0, 5).map(ev => ({
          date: new Date(ev.created_at),
          subjective: ev.subjective || '',
          objective: ev.objective || '',
          assessment: ev.assessment || '',
          plan: ev.plan || '',
        })))
      ];

      // Resumo clínico baseado nos dados
      const summary = `Paciente em tratamento fisioterapêutico desde ${patient.created_at ? format(new Date(patient.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'data não informada'}. ` +
        `Foram realizadas ${previousEvolutions.length + 1} sessões de evolução. ` +
        `Metas atuais: ${goals.filter(g => g.status === 'em_andamento').map(g => g.title).join(', ') || 'Nenhuma'}.`;

      const blob = await generateEvolucao(
        {
          name: PatientHelpers.getName(patient),
          cpf: patient.cpf,
          birthDate: patient.birth_date,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
        },
        {
          name: user.professional.name,
          crf: user.professional.crf || 'CREFITO',
          uf: user.professional.uf || 'SP',
        },
        {
          name: user.clinic.name,
          phone: user.clinic.phone || '',
          email: user.clinic.email || '',
          address: user.clinic.address || {
            street: '',
            number: '',
            district: '',
            city: user.clinic.city || 'São Paulo',
            state: user.clinic.state || 'SP',
            zipCode: '',
          },
        },
        evaluations,
        summary,
        user.clinic.city || 'São Paulo'
      );

      if (blob) {
        downloadPDF(blob, `evolucao-${PatientHelpers.getName(patient).replace(/\s+/g, '-')}-${Date.now()}.pdf`);
        toast({
          title: 'PDF gerado com sucesso!',
          description: 'O relatório de evolução foi baixado.',
        });
      }
    } catch (error) {
      logger.error('Failed to generate PDF', error, 'PatientEvolution');
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o relatório de evolução.',
        variant: 'destructive'
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Hook de atalhos de teclado
  useEvolutionShortcuts(
    handleSave,
    handleCompleteSession,
    (section) => {
      // Navegação entre seções
      if (section === 'subjective' || section === 'objective' || section === 'assessment' || section === 'plan') {
        setActiveTab('evolucao');
        setTimeout(() => {
          const element = document.getElementById(section);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element?.focus();
        }, 100);
      } else if (section === 'measurements') {
        setActiveTab('avaliacao');
      } else if (section === 'history') {
        setActiveTab('historico');
      } else if (section === 'ai') {
        setActiveTab('assistente');
      }
    },
    () => setShowKeyboardHelp(true),
    () => setShowApplyTemplate(true),
    async () => {
      await handleSave();
      setActiveTab('assistente');
    }
  );

  // ========== SEÇÕES MEMOIZADAS (Prevenção de Re-renders) ==========

  // 1. Alerts Section - Depende principalmente de metas e medições, não do texto SOAP
  const alertsSectionContent = useMemo(() => (
    <>
      {/* Alerta de Testes Obrigatórios */}
      {requiredMeasurements.length > 0 && (
        <MandatoryTestAlert
          tests={mandatoryTestAlertsData}
          onResolve={() => setActiveTab('avaliacao')}
        />
      )}

      {/* Alertas Inteligentes */}
      <EvolutionAlerts
        overdueGoals={overdueGoals}
        painScale={painScale}
        painTrend={painTrend}
        upcomingGoals={upcomingGoals}
        daysSinceLastEvolution={daysSinceLastEvolution}
        sessionDurationMinutes={sessionDurationMinutes}
        sessionLongAlertShown={sessionLongAlertShown}
        activePathologies={activePathologies}
        previousEvolutionsCount={previousEvolutions.length}
        onTabChange={(v) => setActiveTab(v as EvolutionTab)}
      />
    </>
  ), [
    requiredMeasurements.length,
    mandatoryTestAlertsData,
    overdueGoals,
    painScale,
    painTrend,
    upcomingGoals,
    daysSinceLastEvolution,
    sessionDurationMinutes,
    sessionLongAlertShown,
    activePathologies,
    previousEvolutions.length
  ]);

  // 2. Top Section (Cards) - Depende apenas do paciente/stats, MUITO estável
  const topSectionContent = useMemo(() => (
    <CardGrid>
      {/* Retorno Médico */}
      <MedicalReturnCard
        patient={patient}
        patientId={patientId || undefined}
        onPatientUpdated={() => invalidateData('all')}
      />

      {/* Cirurgias */}
      <SurgeriesCard patientId={patientId || undefined} />

      {/* Resumo da Evolução - ocupa 2 linhas em telas grandes */}
      <div className="lg:row-span-2">
        <EvolutionSummaryCard stats={evolutionStats} />
      </div>

      {/* Metas - ocupa largura restante */}
      <div className="sm:col-span-2 lg:col-span-2">
        <MetasCard patientId={patientId || undefined} />
      </div>
    </CardGrid>
  ), [
    patient,
    patientId,
    invalidateData,
    evolutionStats
  ]);

  // 3. Main Grid (Editor) - Onde o usuário digita. Re-renderiza muito, mas isolado das outras seções.
  const mainGridContent = useMemo(() => {
    if (evolutionVersion === 'v3-notion') {
      return (
        /* ===== V3: Notion-style ===== */
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyNotionEvolutionPanelV3
            data={evolutionV2Data}
            onChange={setEvolutionV2DataStable}
            isSaving={autoSaveMutation.isPending}
            disabled={false}
            autoSaveEnabled={autoSaveEnabled}
            lastSaved={lastSavedAt}
            customTemplates={customSoapTemplates}
            onTemplateCreate={() => navigate('/cadastros/templates-evolucao')}
            onTemplateManage={() => navigate('/cadastros/templates-evolucao')}
          />
        </Suspense>
      );
    }

    if (evolutionVersion === 'v2-texto') {
      return (
        /* ===== V2: Texto Livre (Notion-style) ===== */
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyNotionEvolutionPanel
            data={evolutionV2Data}
            onChange={setEvolutionV2DataStable}
            isSaving={autoSaveMutation.isPending}
            disabled={false}
            autoSaveEnabled={autoSaveEnabled}
            lastSaved={lastSavedAt}
          />
        </Suspense>
      );
    }

    return (
      /* ===== V1: SOAP (original) ===== */
      <EvolutionGridContainer>
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyEvolutionDraggableGrid
            soapData={soapData}
            onSoapChange={setSoapDataStable}
            painScaleData={painScale}
            onPainScaleChange={setPainScale}
            painHistory={painHistory}
            showPainTrend={true}
            onAISuggest={() => setActiveTab('assistente')}
            onCopyLast={(section) => {
              if (previousEvolutions.length > 0) {
                const last = previousEvolutions[0];
                setSoapData(prev => ({ ...prev, [section]: last[section] || '' }));
                toast({
                  title: 'Copiado',
                  description: `Texto de ${section} copiado da última sessão.`
                });
              }
            }}
            patientId={patientId}
            patientPhone={patient?.phone}
            soapRecordId={currentSoapRecordId}
            requiredMeasurements={requiredMeasurements}
            exercises={sessionExercises}
            onExercisesChange={setSessionExercises}
            onSuggestExercises={() => {
              const suggestions = suggestExerciseChanges(sessionExercises, painScale.level, soapData.assessment || '');
              setSessionExercises(suggestions);
              toast({
                title: 'Sugestões Aplicadas',
                description: 'Os exercícios foram evoluídos com base no progresso do paciente.'
              });
            }}
            onRepeatLastSession={() => {
              if (lastSession?.exercises_performed) {
                setSessionExercises(lastSession.exercises_performed as SessionExercise[]);
                toast({
                  title: 'Exercícios Repetidos',
                  description: 'Os exercícios da sessão anterior foram carregados.'
                });
              }
            }}
            lastSessionExercises={lastSession?.exercises_performed as SessionExercise[] || []}
            previousEvolutions={previousEvolutions}
            onCopyLastEvolution={(evolution) => {
              handleCopyPreviousEvolution(evolution);
            }}
          />
        </Suspense>
      </EvolutionGridContainer>
    );
  }, [
    evolutionVersion,
    evolutionV2Data,
    setEvolutionV2DataStable,
    autoSaveMutation.isPending,
    autoSaveEnabled,
    lastSavedAt,
    soapData,
    setSoapDataStable,
    painScale,
    painHistory,
    previousEvolutions,
    patientId,
    patient?.phone,
    currentSoapRecordId,
    requiredMeasurements,
    sessionExercises,
    lastSession,
    handleCopyPreviousEvolution,
    toast,
    // Add missing deps
    suggestExerciseChanges
  ]);

  // ========== RENDERIZAÇÃO ==========

  // Main content - custom breadcrumb: último segmento (UUID) mostra nome do paciente
  const customBreadcrumbLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    if (appointmentId && patient) {
      labels[`/patient-evolution/${appointmentId}`] = PatientHelpers.getName(patient);
    }
    return labels;
  }, [appointmentId, patient]);

  // Validação inicial do appointmentId
  if (!appointmentId) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold">ID do agendamento não fornecido</p>
            <p className="text-muted-foreground">Não foi possível identificar qual atendimento deve ser iniciado.</p>
            <Button onClick={() => navigate('/schedule')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Agenda
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Loading state
  if (dataLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Carregando dados do paciente...</p>

            {showTimeoutWarning && (
              <div className="mt-4 animate-fade-in">
                <p className="text-sm text-amber-600 mb-4">O carregamento está demorando mais que o esperado.</p>
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar Página
                </Button>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Verificar se é um problema de permissão ou dados inconsistentes
  // Caso específico: appointment existe mas patient não - geralmente patient_id null ou patient não existe no BD
  const isMissingPatientError = appointment && !patient && !patientError && !dataLoading;
  const isPermissionError = appointmentError?.message?.includes('permission') ||
    appointmentError?.message?.includes('RLS') ||
    appointmentError?.message?.includes('row-level security') ||
    patientError?.message?.includes('permission') ||
    patientError?.message?.includes('RLS') ||
    patientError?.message?.includes('row-level security') ||
    (!appointment && !appointmentError && !dataLoading);

  // Error state
  if (!appointment || !patient) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />

            {isMissingPatientError ? (
              <>
                <p className="text-lg font-semibold">Paciente não encontrado</p>
                <p className="text-muted-foreground">
                  O agendamento existe, mas o paciente associado (ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">{patientId}</code>) não foi encontrado no banco de dados.
                </p>
                <Alert className="mt-4 text-left">
                  <AlertDescription>
                    <strong>O que fazer:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Edite o agendamento e selecione um paciente válido</li>
                      <li>Verifique se o paciente foi excluído acidentalmente</li>
                      <li>Entre em contato com o suporte se o problema persistir</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </>
            ) : isPermissionError ? (
              <>
                <p className="text-lg font-semibold">Acesso não autorizado</p>
                <p className="text-muted-foreground">
                  Você não tem permissão para acessar este agendamento.
                  Entre em contato com o administrador do sistema para solicitar acesso.
                </p>
                <Alert className="mt-4 text-left">
                  <AlertDescription>
                    <strong>O que fazer:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Verifique se você está logado com a conta correta</li>
                      <li>Entre em contato com o administrador para verificar suas permissões</li>
                      <li>Certifique-se de que você pertence à organização correta</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">Agendamento não encontrado</p>
                <p className="text-muted-foreground">
                  Não foi possível carregar os dados do agendamento.
                  O agendamento pode ter sido removido ou não existe mais.
                </p>
              </>
            )}

            {/* Debug info para desenvolvimento */}
            <EvolutionDebugInfo
              patientId={patientId || undefined}
              patient={patient}
              appointmentId={appointmentId}
              appointment={appointment}
              appointmentError={appointmentError as Error}
              patientError={patientError as Error}
            />

            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={() => navigate('/schedule')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Agenda
              </Button>
              {isMissingPatientError && appointment && (
                <Button onClick={() => navigate(`/schedule?edit=${appointmentId}`)} variant="default">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Agendamento
                </Button>
              )}
              {isPermissionError && (
                <Button onClick={() => window.location.reload()} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <PatientEvolutionErrorBoundary appointmentId={appointmentId} patientId={patientId || undefined}>
      <MainLayout maxWidth="full" compactPadding customBreadcrumbLabels={customBreadcrumbLabels}>
        <div className="space-y-5 animate-fade-in pb-8">
          {/* Cabeçalho: paciente + sessão + ações */}
          <EvolutionHeader
            patient={patient}
            appointment={appointment}
            treatmentDuration={treatmentDuration}
            evolutionStats={evolutionStats}
            onSave={handleSave}
            onComplete={handleCompleteSession}
            isSaving={autoSaveMutation.isPending}
            isCompleting={isCompleting}
            autoSaveEnabled={autoSaveEnabled}
            toggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)}
            lastSavedAt={lastSavedAt}
            showInsights={showInsights}
            toggleInsights={() => setShowInsights(!showInsights)}
            onShowTemplateModal={() => setShowApplyTemplate(true)}
            onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
            therapists={therapists}
            selectedTherapistId={selectedTherapistId}
            onTherapistChange={setSelectedTherapistId}
            previousEvolutionsCount={previousEvolutions.length}
            tabsConfig={TABS_CONFIG}
            activeTab={activeTab}
            onTabChange={(v) => setActiveTab(v as EvolutionTab)}
            pendingRequiredMeasurements={pendingRequiredMeasurements.length}
            upcomingGoalsCount={upcomingGoals.length}
            evolutionVersion={evolutionVersion}
            onVersionChange={handleVersionChange}
          />

          {/* Abas de Navegação - OTIMIZADO com lazy loading por aba */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EvolutionTab)} className="w-full pb-20" aria-label="Abas de evolução e acompanhamento">
            {/* ABA 1: EVOLUÇÃO (SOAP V1 ou Texto Livre V2) */}
            <TabsContent value="evolucao" className="mt-0 h-full overflow-hidden flex flex-col data-[state=inactive]:hidden">
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyEvolucaoTab
                  alertsSection={alertsSectionContent}
                  topSection={topSectionContent}
                  mainGrid={mainGridContent}
                />
              </Suspense>
            </TabsContent>

            {/* ABA 2: AVALIAÇÃO (Medições + Mapa de Dor + Gráficos) */}
            <TabsContent value="avaliacao">
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyAvaliacaoTab
                  patientId={patientId || ''}
                  appointmentId={appointmentId}
                  currentSoapRecordId={currentSoapRecordId}
                  requiredMeasurements={requiredMeasurements}
                  pendingRequiredMeasurements={pendingRequiredMeasurements}
                  todayMeasurements={todayMeasurements}
                  measurementsByType={measurementsByType}
                />
              </Suspense>
            </TabsContent>

            {/* ABA 3: TRATAMENTO (Exercícios + Metas) */}
            <TabsContent value="tratamento">
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyTratamentoTab
                  sessionExercises={sessionExercises}
                  onExercisesChange={setSessionExercises}
                  goals={goals}
                  pathologies={pathologies}
                />
              </Suspense>
            </TabsContent>

            {/* ABA 4: HISTÓRICO (Timeline + Evoluções Anteriores) */}
            <TabsContent value="historico">
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyHistoricoTab
                  patientId={patientId || ''}
                  surgeries={surgeries}
                  previousEvolutions={previousEvolutions}
                  onCopyEvolution={handleCopyPreviousEvolution}
                  showComparison={showComparison}
                  onToggleComparison={() => setShowComparison(!showComparison)}
                />
              </Suspense>
            </TabsContent>

            {/* ABA 5: ASSISTENTE (IA + WhatsApp + Gamificação) */}
            <TabsContent value="assistente">
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyAssistenteTab
                  patientId={patientId!}
                  patientName={PatientHelpers.getName(patient)}
                  patientPhone={patient.phone}
                  onApplyToSoap={(field, content) => {
                    setSoapData(prev => ({ ...prev, [field]: prev[field] + content }));
                    setActiveTab('evolucao');
                    toast({
                      title: 'Sugestão aplicada',
                      description: 'O texto foi adicionado ao campo SOAP.'
                    });
                  }}
                />
              </Suspense>
            </TabsContent>
          </Tabs>

          {/* Floating Action Bar */}
          <FloatingActionBar
            onSave={handleSave}
            onComplete={handleCompleteSession}
            onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
            onExportPDF={handleExportPDF}
            isSaving={autoSaveMutation.isPending}
            isCompleting={isCompleting}
            isExporting={isExportingPDF}
            autoSaveEnabled={autoSaveEnabled}
            lastSavedAt={lastSavedAt}
          />

          {/* Modal para aplicar template */}
          {patientId && (
            <ApplyTemplateModal
              open={showApplyTemplate}
              onOpenChange={setShowApplyTemplate}
              patientId={patientId}
              patientName={PatientHelpers.getName(patient)}
            />
          )}

          {/* Modal de atalhos de teclado */}
          <EvolutionKeyboardShortcuts
            open={showKeyboardHelp}
            onOpenChange={setShowKeyboardHelp}
          />

          {/* Command Palette - Busca Rápida Ctrl+K */}
          <CommandPaletteComponent />
        </div>
      </MainLayout>
    </PatientEvolutionErrorBoundary>
  );
};

export default PatientEvolution;
