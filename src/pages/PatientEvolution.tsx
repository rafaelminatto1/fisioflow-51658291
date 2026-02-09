/**
 * Patient Evolution Page - Migrated to Firebase
 */

import { lazy, Suspense, useEffect, useMemo, useState, useCallback, startTransition } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit } from '@/integrations/firebase/app';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardGrid } from '@/components/layout/ResponsiveGridLayout';
import { EvolutionResponsiveLayout, EvolutionGridContainer } from '@/components/evolution/EvolutionResponsiveLayout';
import { useToast } from '@/hooks/use-toast';
import { useCommandPalette } from '@/hooks/ui/useCommandPalette';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useMediaQuery } from '@/hooks/use-media-query';

// Hooks
import {
  usePatientSurgeries,
  usePatientGoals,
  usePatientPathologies,
  useRequiredMeasurements,
  useEvolutionMeasurements,
} from '@/hooks/usePatientEvolution';
import { useAppointmentData } from '@/hooks/useAppointmentData';
import { useAutoSaveSoapRecord, useSoapRecords, useDraftSoapRecordByAppointment, type SoapRecord } from '@/hooks/useSoapRecords';
import { useGamification } from '@/hooks/useGamification';
import { useSessionExercises } from '@/hooks/useSessionExercises';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { useTherapists } from '@/hooks/useTherapists';
import { useQueryClient } from '@tanstack/react-query';
import { db, getFirebaseAuth } from '@/integrations/firebase/app';

// Componentes de Evolução
import { GoalsTracker } from '@/components/evolution/GoalsTracker';
import { PathologyStatus } from '@/components/evolution/PathologyStatus';
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

// Lazy loading para componentes pesados
const LazyTreatmentAssistant = lazy(() => import('@/components/ai/TreatmentAssistant').then(m => ({ default: m.TreatmentAssistant })));
const LazyWhatsAppIntegration = lazy(() => import('@/components/whatsapp/WhatsAppIntegration').then(m => ({ default: m.WhatsAppIntegration })));
const LazyPatientGamification = lazy(() => import('@/components/gamification/PatientGamification').then(m => ({ default: m.PatientGamification })));
const LazyMeasurementCharts = lazy(() => import('@/components/evolution/MeasurementCharts').then(m => ({ default: m.MeasurementCharts })));
const LazyEvolutionDraggableGrid = lazy(() => import('@/components/evolution/EvolutionDraggableGrid').then(m => ({ default: m.EvolutionDraggableGrid })));
const LazyEvolutionHistoryTab = lazy(() => import('@/components/evolution/EvolutionHistoryTab').then(m => ({ default: m.EvolutionHistoryTab })));
const LazySessionExercisesPanel = lazy(() => import('@/components/evolution/SessionExercisesPanel').then(m => ({ default: m.SessionExercisesPanel })));
const LazyMeasurementForm = lazy(() => import('@/components/evolution/MeasurementForm').then(m => ({ default: m.MeasurementForm })));
const LazyPainMapManager = lazy(() => import('@/components/evolution/PainMapManager').then(m => ({ default: m.PainMapManager })));

// Tipo para escala de dor
export interface PainScaleData {
  level: number;
  location?: string;
  character?: string;
}

const PatientEvolution = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

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
  const [activeTab, setActiveTab] = useState('evolucao'); // evolucao, avaliacao, tratamento, historico, assistente
  const [sessionLongAlertShown, setSessionLongAlertShown] = useState(false);

  // Escala de dor
  const [painScale, setPainScale] = useState<PainScaleData>({ level: 0 });

  // Exercícios da sessão
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

  // Fisioterapeuta responsável pela sessão (dropdown + CREFITO no header)
  const [selectedTherapistId, setSelectedTherapistId] = useState('');

  // ========== HOOKS ==========
  const queryClient = useQueryClient();
  const { therapists } = useTherapists();
  // Ações de agendamento (completar atendimento)
  const { completeAppointment, isCompleting } = useAppointmentActions();

  // Dados do agendamento e paciente - PRECISA ser chamado primeiro para obter patientId
  const {
    appointment,
    patient,
    patientId,
    isLoading: dataLoading,
    appointmentError,
    patientError
  } = useAppointmentData(appointmentId);

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
  // OTIMIZAÇÃO: Hooks secundários são carregados apenas quando necessário (enabled: !!patientId)
  // e com staleTime maior para reduzir requisições
  const { lastSession, isLoadingLastSession, suggestExerciseChanges } = useSessionExercises(patientId || '');
  const { awardXp } = useGamification(patientId || '');
  const { data: surgeries = [] } = usePatientSurgeries(patientId || '');
  const { data: goals = [] } = usePatientGoals(patientId || '');
  const { data: pathologies = [] } = usePatientPathologies(patientId || '');
  // OTIMIZAÇÃO: Reduzido limite de medições na carga inicial de 120 para 50
  const { data: measurements = [] } = useEvolutionMeasurements(patientId || '', { limit: 50 });
  const { data: previousEvolutions = [] } = useSoapRecords(patientId || '', 10);
  const { data: draftByAppointment } = useDraftSoapRecordByAppointment(patientId || '', appointmentId);

  // Hook de auto-save
  const autoSaveMutation = useAutoSaveSoapRecord();

  // OTIMIZAÇÃO: Prefetch de dados em background quando patientId está disponível
  useEffect(() => {
    if (patientId) {
      // Prefetch em background usando startTransition para não bloquear a UI
      startTransition(() => {
        // Dados para outras abas são carregados de forma lazy
        queryClient.prefetchQuery({
          queryKey: ['patient-surgeries', patientId],
          staleTime: 1000 * 60 * 15,
        });
        queryClient.prefetchQuery({
          queryKey: ['patient-goals', patientId],
          staleTime: 1000 * 60 * 15,
        });
      });
    }
  }, [patientId, queryClient]);

  // ========== CALLBACKS ==========
  const setSoapDataStable = useCallback((data: { subjective: string; objective: string; assessment: string; plan: string }) => {
    setSoapData(data);
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
  // Patologias ativas para medições obrigatórias
  const activePathologies = useMemo(() =>
    pathologies.filter(p => p.status === 'em_tratamento'),
    [pathologies]
  );

  // OTIMIZAÇÃO: Medições obrigatórias só carregam quando aba de avaliação está ativa
  // ou quando há patologias ativas e ainda não foram carregadas
  const shouldLoadRequiredMeasurements = activeTab === 'avaliacao' || activeTab === 'evolucao';
  const { data: requiredMeasurements = [] } = useRequiredMeasurements(
    shouldLoadRequiredMeasurements ? activePathologies.map(p => p.pathology_name) : []
  );

  // Tempo de tratamento do paciente
  const treatmentDuration = useMemo(() =>
    patient?.created_at
      ? formatDetailedDuration(patient.created_at)
      : 'N/A',
    [patient?.created_at]
  );

  // Estatísticas de evolução
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

  // Medições realizadas hoje
  const todayMeasurements = useMemo(() => {
    const today = startOfDay(new Date());
    return measurements.filter(m => {
      const measurementDate = startOfDay(new Date(m.measured_at));
      return measurementDate.getTime() === today.getTime();
    });
  }, [measurements]);

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

  // Duração da sessão em minutos
  const sessionDurationMinutes = useMemo(() =>
    diffInMinutes(new Date(), sessionStartTime),
    [sessionStartTime]
  );

  // Memoize painHistory array to prevent recreation on every render
  const painHistory = useMemo(() =>
    previousEvolutions
      .filter(e => e.pain_level !== null && e.pain_level !== undefined)
      .map(e => ({ date: e.created_at, level: e.pain_level || 0 })),
    [previousEvolutions]
  );

  // Memoize tab configuration to prevent recreation on every render
  const tabsConfig = useMemo(() => [
    { value: 'evolucao', label: 'Evolução', shortLabel: 'Evol', icon: FileText, description: 'SOAP + Dor' },
    { value: 'avaliacao', label: 'Avaliação', shortLabel: 'Aval', icon: BarChart3, description: 'Medições + Testes' },
    { value: 'tratamento', label: 'Tratamento', shortLabel: 'Trat', icon: Activity, description: 'Exercícios + Metas' },
    { value: 'historico', label: 'Histórico', shortLabel: 'Hist', icon: Clock, description: 'Timeline + Relatórios' },
    { value: 'assistente', label: 'Assistente', shortLabel: 'IA', icon: Sparkles, description: 'IA + WhatsApp' },
  ], []);

  // Memoize required measurements for alerts to prevent recreation
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
  const { lastSavedAt } = useAutoSave({
    data: soapData,
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

    if (!soapData.subjective && !soapData.objective && !soapData.assessment && !soapData.plan) {
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

    try {
      // Salvar registro SOAP
      const record = await autoSaveMutation.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        recordId: currentSoapRecordId,
        ...soapData,
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
          exercises_performed: sessionExercises,
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
    if (!soapData.subjective && !soapData.objective && !soapData.assessment && !soapData.plan) {
      toast({
        title: 'Complete a evolução',
        description: 'Preencha os campos SOAP antes de concluir o atendimento.',
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
      <MainLayout maxWidth="7xl" customBreadcrumbLabels={customBreadcrumbLabels}>
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
            tabsConfig={tabsConfig}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingRequiredMeasurements={pendingRequiredMeasurements.length}
            upcomingGoalsCount={upcomingGoals.length}
          />

          {/* Abas de Navegação */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pb-20" aria-label="Abas de evolução e acompanhamento">
            {/* ABA 1: EVOLUÇÃO (SOAP + Dor + Fotos) */}
            <TabsContent value="evolucao" className="mt-4">
              <EvolutionResponsiveLayout
                alertsSection={
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
                      onTabChange={setActiveTab}
                    />
                  </>
                }
                topSection={
                  /* Cards superiores - grid responsivo */
                  <CardGrid>
                    {/* Retorno Médico */}
                    <MedicalReturnCard
                      patient={patient}
                      patientId={patientId || undefined}
                      onPatientUpdated={() => queryClient?.invalidateQueries({ queryKey: ['patient', patientId] })}
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
                }
                mainGrid={
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
                }
              />
            </TabsContent>

            {/* ABA 2: AVALIAÇÃO (Medições + Mapa de Dor + Gráficos) */}
            <TabsContent value="avaliacao" className="mt-4 space-y-4">
              {/* Mapa de Dor */}
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyPainMapManager
                  patientId={patientId || ''}
                  appointmentId={appointmentId}
                  sessionId={currentSoapRecordId}
                />
              </Suspense>

              {/* Alerta de Medições Pendentes */}
              {pendingRequiredMeasurements.length > 0 && (
                <Card className="border-destructive/30 shadow-sm">
                  <CardHeader className="bg-destructive/5 py-2 px-3">
                    <CardTitle className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Medições Obrigatórias Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-3 px-3 pb-3">
                    {requiredMeasurements
                      .filter(req => {
                        const completedToday = todayMeasurements.some(m => m.measurement_name === req.measurement_name);
                        return !completedToday;
                      })
                      .map((req) => (
                        <Alert
                          key={req.id}
                          variant={req.alert_level === 'high' ? 'destructive' : 'default'}
                          className="py-2"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <AlertTitle className="text-xs font-semibold">{req.measurement_name}</AlertTitle>
                          <AlertDescription className="text-[10px]">
                            {req.instructions}
                            {req.measurement_unit && ` (${req.measurement_unit})`}
                          </AlertDescription>
                        </Alert>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Formulário de Medição */}
              {patientId && (
                <Suspense fallback={<LoadingSkeleton type="card" />}>
                  <LazyMeasurementForm
                    patientId={patientId}
                    soapRecordId={currentSoapRecordId}
                    requiredMeasurements={requiredMeasurements}
                  />
                </Suspense>
              )}

              {/* Gráficos de Evolução */}
              {Object.keys(measurementsByType).length > 0 && (
                <Suspense fallback={<LoadingSkeleton type="card" />}>
                  <LazyMeasurementCharts measurementsByType={measurementsByType} />
                </Suspense>
              )}
            </TabsContent>

            {/* ABA 3: TRATAMENTO (Exercícios + Metas) */}
            <TabsContent value="tratamento" className="mt-4 space-y-4">
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazySessionExercisesPanel
                  exercises={sessionExercises}
                  onChange={setSessionExercises}
                />
              </Suspense>
              <GoalsTracker goals={goals} />
              <PathologyStatus pathologies={pathologies} />
            </TabsContent>

            {/* ABA 4: HISTÓRICO (Timeline + Evoluções Anteriores) */}
            <TabsContent value="historico">
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyEvolutionHistoryTab
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
            <TabsContent value="assistente" className="mt-4 space-y-4">
              {/* Assistente de IA */}
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyTreatmentAssistant
                  patientId={patientId!}
                  patientName={PatientHelpers.getName(patient)}
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

              {/* Integração WhatsApp */}
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyWhatsAppIntegration patientId={patientId!} patientPhone={patient.phone} />
              </Suspense>

              {/* Gamificação */}
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyPatientGamification patientId={patientId!} />
              </Suspense>
            </TabsContent>
          </Tabs>

          {/* Floating Action Bar */}
          <FloatingActionBar
            onSave={handleSave}
            onComplete={handleCompleteSession}
            onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
            isSaving={autoSaveMutation.isPending}
            isCompleting={isCompleting}
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
