import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  format,
  formatDistanceToNow,
  differenceInDays,
  differenceInMinutes as diffInMinutes,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  BarChart3,
  Activity,
  Clock,
  Sparkles,
  RefreshCw,
  Timer,
  TrendingUp,
  HeartPulse,
  CalendarX,
  Brain,
} from 'lucide-react';

import { EvolutionDebugInfo } from '@/components/evolution/EvolutionDebugInfo';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCommandPalette } from '@/components/ui/CommandPalette';

// Hooks
import {
  usePatientSurgeries,
  usePatientGoals,
  usePatientPathologies,
  useRequiredMeasurements,
  useEvolutionMeasurements,
} from '@/hooks/usePatientEvolution';
import { useAppointmentData } from '@/hooks/useAppointmentData';
import { useAutoSaveSoapRecord, useSoapRecords } from '@/hooks/useSoapRecords';
import { useGamification } from '@/hooks/useGamification';
import { useSessionExercises } from '@/hooks/useSessionExercises';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';

// Componentes de Evolução
import { MeasurementForm } from '@/components/evolution/MeasurementForm';
import { GoalsTracker } from '@/components/evolution/GoalsTracker';
import { PathologyStatus } from '@/components/evolution/PathologyStatus';
import { PainMapManager } from '@/components/evolution/PainMapManager';
import { MandatoryTestAlert } from '@/components/session/MandatoryTestAlert';
import { SessionExercisesPanel, type SessionExercise } from '@/components/evolution/SessionExercisesPanel';
import { EvolutionHeader } from '@/components/evolution/EvolutionHeader';
import { EvolutionStats } from '@/components/evolution/EvolutionStats';
import { EvolutionHistoryTab } from '@/components/evolution/EvolutionHistoryTab';
import { EvolutionDraggableGrid } from '@/components/evolution/EvolutionDraggableGrid';
import { FloatingActionBar } from '@/components/evolution/FloatingActionBar';
import {
  EvolutionKeyboardShortcuts,
  useEvolutionShortcuts,
} from '@/components/evolution/EvolutionKeyboardShortcuts';
import { PatientEvolutionErrorBoundary } from '@/components/patients/PatientEvolutionErrorBoundary';
import { ApplyTemplateModal } from '@/components/exercises/ApplyTemplateModal';
import { PatientHelpers } from '@/types';

// Lazy loading para componentes pesados
const LazyTreatmentAssistant = lazy(() => import('@/components/ai/TreatmentAssistant').then(m => ({ default: m.TreatmentAssistant })));
const LazyWhatsAppIntegration = lazy(() => import('@/components/whatsapp/WhatsAppIntegration').then(m => ({ default: m.WhatsAppIntegration })));
const LazyPatientGamification = lazy(() => import('@/components/gamification/PatientGamification').then(m => ({ default: m.PatientGamification })));
const LazyMeasurementCharts = lazy(() => import('@/components/evolution/MeasurementCharts').then(m => ({ default: m.MeasurementCharts })));

// Tipo para escala de dor
export interface PainScaleData {
  level: number;
  location?: string;
  character?: string;
}

/**
 * Página de Evolução do Paciente
 *
 * Funcionalidades principais:
 * - Registro SOAP (Subjetivo, Objetivo, Avaliação, Plano)
 * - Escala de dor (EVA)
 * - Medições e testes obrigatórios
 * - Exercícios da sessão
 * - Metas e patologias
 * - Histórico de evoluções
 * - Assistente de IA
 * - Integração WhatsApp
 * - Gamificação
 */
const PatientEvolution = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Command Palette hook - handles Ctrl+K globally
  const { CommandPaletteComponent } = useCommandPalette();

  // ========== ESTADOS ==========
  // Estados SOAP
  const [currentSoapRecordId, setCurrentSoapRecordId] = useState<string | undefined>();
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

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

  // ========== HOOKS ==========
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
  const { lastSession, isLoadingLastSession, suggestExerciseChanges } = useSessionExercises(patientId || '');
  const { awardXp } = useGamification(patientId || '');
  const { data: surgeries = [] } = usePatientSurgeries(patientId || '');
  const { data: goals = [] } = usePatientGoals(patientId || '');
  const { data: pathologies = [] } = usePatientPathologies(patientId || '');
  const { data: measurements = [] } = useEvolutionMeasurements(patientId || '');
  const { data: previousEvolutions = [] } = useSoapRecords(patientId || '', 10);

  // Hook de auto-save
  const autoSaveMutation = useAutoSaveSoapRecord();

  // ========== CALLBACKS ==========
  const setSoapDataStable = useCallback((data: { subjective: string; objective: string; assessment: string; plan: string }) => {
    setSubjective(data.subjective);
    setObjective(data.objective);
    setAssessment(data.assessment);
    setPlan(data.plan);
  }, []);

  // ========== EFFECTS ==========
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

  // Medições obrigatórias baseadas nas patologias ativas
  const { data: requiredMeasurements = [] } = useRequiredMeasurements(
    activePathologies.map(p => p.pathology_name)
  );

  // Tempo de tratamento do paciente
  const treatmentDuration = useMemo(() =>
    patient?.created_at
      ? formatDistanceToNow(new Date(patient.created_at), { locale: ptBR, addSuffix: true })
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
      .filter((e: any) => e.pain_level !== null && e.pain_level !== undefined)
      .map((e: any) => e.pain_level || 0);

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

  // ========== MEMOIZED SOAP DATA (Performance Optimization) ==========
  // Memoize soapData object to prevent unnecessary re-renders of EvolutionDraggableGrid
  const soapData = useMemo(() => ({
    subjective,
    objective,
    assessment,
    plan
  }), [subjective, objective, assessment, plan]);

  // Memoize painHistory array to prevent recreation on every render
  const painHistory = useMemo(() =>
    previousEvolutions
      .filter(e => e.pain_level !== null && e.pain_level !== undefined)
      .map(e => ({ date: e.created_at, level: e.pain_level || 0 })),
    [previousEvolutions]
  );

  // ========== AUTO-SAVE ==========
  const { lastSavedAt } = useAutoSave({
    data: { subjective, objective, assessment, plan },
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
    setSubjective(evolution.subjective || '');
    setObjective(evolution.objective || '');
    setAssessment(evolution.assessment || '');
    setPlan(evolution.plan || '');

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

    if (!subjective && !objective && !assessment && !plan) {
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
        subjective,
        objective,
        assessment,
        plan,
        pain_level: painScale.level,
        pain_location: painScale.location,
        pain_character: painScale.character
      });

      if (record?.id) {
        setCurrentSoapRecordId(record.id);
      }

      // Salvar sessão de tratamento (exercícios realizados)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Verificar se já existe sessão para este agendamento
        let existingSessionId = null;
        if (appointmentId) {
          const { data: existingSession } = await supabase
            .from('treatment_sessions')
            .select('id')
            .eq('appointment_id', appointmentId)
            .maybeSingle();
          if (existingSession) existingSessionId = existingSession.id;
        }

        const sessionData = {
          patient_id: patientId,
          therapist_id: user.id,
          appointment_id: appointmentId || null,
          session_date: new Date().toISOString(),
          session_type: 'treatment',
          pain_level_before: 0,
          pain_level_after: 0,
          functional_score_before: 0,
          functional_score_after: 0,
          exercises_performed: sessionExercises,
          observations: assessment,
          status: 'completed',
          created_by: user.id
        };

        let sessionError: { message: string } | null = null;
        if (existingSessionId) {
          const { error } = await supabase
            .from('treatment_sessions')
            .update(sessionData)
            .eq('id', existingSessionId);
          sessionError = error;
        } else {
          const { error } = await supabase
            .from('treatment_sessions')
            .insert(sessionData);
          sessionError = error;
        }

        if (sessionError) {
          toast({
            title: 'Aviso',
            description: 'Evolução salva, mas houve um erro ao salvar a sessão de exercícios.',
            variant: 'default'
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
    if (!subjective && !objective && !assessment && !plan) {
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
            console.error("Failed to award XP", e);
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

  // Verificar se é um problema de permissão
  const isPermissionError = appointmentError?.message?.includes('permission') ||
    appointmentError?.message?.includes('RLS') ||
    appointmentError?.message?.includes('row-level security') ||
    patientError?.message?.includes('permission') ||
    patientError?.message?.includes('RLS') ||
    patientError?.message?.includes('row-level security') ||
    (!appointment && !appointmentError && !dataLoading) ||
    (!patient && !patientError && !dataLoading && appointment);

  // Error state
  if (!appointment || !patient) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />

            {isPermissionError ? (
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

  // Main content
  return (
    <PatientEvolutionErrorBoundary appointmentId={appointmentId} patientId={patientId || undefined}>
      <MainLayout maxWidth="7xl">
        <div className="space-y-4 animate-fade-in pb-8">
          {/* Header Compacto Moderno */}
          <EvolutionHeader
            patient={patient}
            appointment={appointment}
            treatmentDuration={treatmentDuration}
            evolutionStats={evolutionStats}
            sessionStartTime={sessionStartTime}
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
          />

          {/* Quick Stats Row */}
          {showInsights && <EvolutionStats stats={evolutionStats} />}

          {/* Alerta de Testes Obrigatórios */}
          {requiredMeasurements.length > 0 && (
            <MandatoryTestAlert
              tests={requiredMeasurements.map(req => {
                const completedToday = todayMeasurements.some(m => m.measurement_name === req.measurement_name);
                return {
                  id: req.id || req.measurement_name,
                  name: req.measurement_name,
                  critical: req.alert_level === 'high',
                  completed: completedToday
                };
              })}
              onResolve={() => setActiveTab('avaliacao')}
            />
          )}

          {/* ========== ALERTAS INTELIGENTES ========== */}

          {/* Alerta CRÍTICO: Metas Vencidas */}
          {overdueGoals.length > 0 && (
            <Alert variant="destructive" className="animate-pulse border-red-600">
              <CalendarX className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Metas Vencidas</AlertTitle>
              <AlertDescription className="text-xs">
                {overdueGoals.length} meta(s) vencida(s). Reavalie o plano de tratamento e ajuste as datas na aba Tratamento.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Nível de Dor Alto */}
          {painScale.level >= 7 && (
            <Alert variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Nível de Dor Elevado</AlertTitle>
              <AlertDescription className="text-xs">
                Paciente reportando dor {painScale.level}/10.
                {painTrend === 'worsening' && ' ⚠️ Tendência de PIORA nas últimas sessões.'}
                {painTrend === 'improving' && ' ✓ Tendência de MELHORA nas últimas sessões.'}
                Considere revisar o plano de tratamento.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Nível de Dor Moderado com Tendência de Piora */}
          {painScale.level >= 4 && painScale.level < 7 && painTrend === 'worsening' && (
            <Alert className="border-rose-500/50 bg-rose-50 dark:bg-rose-950/20">
              <HeartPulse className="h-4 w-4 text-rose-600" />
              <AlertTitle className="text-sm font-semibold text-rose-800 dark:text-rose-200">Tendência de Aumento da Dor</AlertTitle>
              <AlertDescription className="text-xs text-rose-700 dark:text-rose-300">
                Dor atual: {painScale.level}/10. A tendência nas últimas sessões é de PIORA. Avalie a necessidade de ajustar o tratamento.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Metas Próximas do Vencimento */}
          {upcomingGoals.length > 0 && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-200">Metas Próximas do Vencimento</AlertTitle>
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                {upcomingGoals.length} meta(s) venc(em) em até 3 dias.{' '}
                <button
                  onClick={() => setActiveTab('tratamento')}
                  className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100"
                >
                  Acompanhe o progresso →
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Muito Tempo Desde Última Evolução */}
          {daysSinceLastEvolution !== null && daysSinceLastEvolution > 21 && (
            <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
              <FileText className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-sm font-semibold text-red-800 dark:text-red-200">Longo Período Sem Evolução</AlertTitle>
              <AlertDescription className="text-xs text-red-700 dark:text-red-300">
                A última evolução foi registrada há {daysSinceLastEvolution} dias.{' '}
                <button
                  onClick={() => setActiveTab('historico')}
                  className="underline font-medium hover:text-red-900 dark:hover:text-red-100"
                >
                  Revise o histórico completo →
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Sessão Prolongada */}
          {sessionDurationMinutes > 60 && sessionDurationMinutes <= 90 && !sessionLongAlertShown && (
            <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
              <Timer className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-sm font-semibold text-blue-800 dark:text-blue-200">Sessão em Andamento</AlertTitle>
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                Tempo de sessão: {Math.floor(sessionDurationMinutes / 60)}h {sessionDurationMinutes % 60}min.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Sessão Muito Prolongada */}
          {sessionDurationMinutes > 90 && !sessionLongAlertShown && (
            <Alert className="border-purple-500/50 bg-purple-50 dark:bg-purple-950/20 animate-pulse">
              <Timer className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-sm font-semibold text-purple-800 dark:text-purple-200">Sessão Prolongada</AlertTitle>
              <AlertDescription className="text-xs text-purple-700 dark:text-purple-300">
                Esta sessão já dura {Math.floor(sessionDurationMinutes / 60)}h {sessionDurationMinutes % 60}min. Considere fazer uma pausa ou concluir o atendimento.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Complexidade Clínica Elevada */}
          {activePathologies.length >= 3 && (
            <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-sm font-semibold text-orange-800 dark:text-orange-200">Complexidade Clínica Elevada</AlertTitle>
              <AlertDescription className="text-xs text-orange-700 dark:text-orange-300">
                Paciente com {activePathologies.length} patologia(s) ativa(s). Requer atenção especial e planejamento cuidadoso do tratamento.
                <button
                  onClick={() => setActiveTab('tratamento')}
                  className="underline font-medium hover:text-orange-900 dark:hover:text-orange-100 ml-1"
                >
                  Ver detalhes →
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Boa Notícia - Tendência de Melhora */}
          {painTrend === 'improving' && painScale.level < 4 && previousEvolutions.length >= 2 && (
            <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20">
              <HeartPulse className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Progresso Positivo!</AlertTitle>
              <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-300">
                Excelente! O paciente mostra tendência de melhora na última sessão. Continue com o tratamento atual.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta: Primeira Evolução do Paciente */}
          {previousEvolutions.length === 0 && (
            <Alert className="border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/20">
              <Brain className="h-4 w-4 text-indigo-600" />
              <AlertTitle className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Primeira Evolução</AlertTitle>
              <AlertDescription className="text-xs text-indigo-700 dark:text-indigo-300">
                Esta é a primeira evolução do paciente. Registre um SOAP completo para estabelecer uma linha de base sólida.
              </AlertDescription>
            </Alert>
          )}

          {/* Abas de Navegação */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pb-20">
            <TabsList className="inline-flex h-10 sm:h-11 items-center justify-start rounded-xl bg-muted/40 p-1 text-muted-foreground w-full lg:w-auto overflow-x-auto scrollbar-hide sticky top-0 z-40 backdrop-blur-sm">
              {[
                { value: 'evolucao', label: 'Evolução', shortLabel: 'Evol', icon: FileText, description: 'SOAP + Dor' },
                { value: 'avaliacao', label: 'Avaliação', shortLabel: 'Aval', icon: BarChart3, description: 'Medições + Testes' },
                { value: 'tratamento', label: 'Tratamento', shortLabel: 'Trat', icon: Activity, description: 'Exercícios + Metas' },
                { value: 'historico', label: 'Histórico', shortLabel: 'Hist', icon: Clock, description: 'Timeline + Relatórios' },
                { value: 'assistente', label: 'Assistente', shortLabel: 'IA', icon: Sparkles, description: 'IA + WhatsApp' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md gap-1.5 sm:gap-2 min-w-fit touch-target"
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ABA 1: EVOLUÇÃO (SOAP + Dor + Fotos) */}
            <TabsContent value="evolucao" className="mt-4 space-y-4">
              <EvolutionDraggableGrid
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
                    if (section === 'subjective') setSubjective(last.subjective || '');
                    if (section === 'objective') setObjective(last.objective || '');
                    if (section === 'assessment') setAssessment(last.assessment || '');
                    if (section === 'plan') setPlan(last.plan || '');
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
                  const suggestions = suggestExerciseChanges(sessionExercises, painScale.level, assessment || '');
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
            </TabsContent>

            {/* ABA 2: AVALIAÇÃO (Medições + Mapa de Dor + Gráficos) */}
            <TabsContent value="avaliacao" className="mt-4 space-y-4">
              {/* Mapa de Dor */}
              <PainMapManager
                patientId={patientId || ''}
                appointmentId={appointmentId}
                sessionId={currentSoapRecordId}
              />

              {/* Alerta de Medições Pendentes */}
              {requiredMeasurements.filter(req => {
                const completedToday = todayMeasurements.some(m => m.measurement_name === req.measurement_name);
                return !completedToday;
              }).length > 0 && (
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
                <MeasurementForm
                  patientId={patientId}
                  soapRecordId={currentSoapRecordId}
                  requiredMeasurements={requiredMeasurements}
                />
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
              <SessionExercisesPanel
                exercises={sessionExercises}
                onChange={setSessionExercises}
              />
              <GoalsTracker goals={goals} />
              <PathologyStatus pathologies={pathologies} />
            </TabsContent>

            {/* ABA 4: HISTÓRICO (Timeline + Evoluções Anteriores) */}
            <TabsContent value="historico">
              <EvolutionHistoryTab
                patientId={patientId || ''}
                surgeries={surgeries}
                previousEvolutions={previousEvolutions}
                onCopyEvolution={handleCopyPreviousEvolution}
                showComparison={showComparison}
                onToggleComparison={() => setShowComparison(!showComparison)}
              />
            </TabsContent>

            {/* ABA 5: ASSISTENTE (IA + WhatsApp + Gamificação) */}
            <TabsContent value="assistente" className="mt-4 space-y-4">
              {/* Assistente de IA */}
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyTreatmentAssistant
                  patientId={patientId!}
                  patientName={PatientHelpers.getName(patient)}
                  onApplyToSoap={(field, content) => {
                    if (field === 'subjective') setSubjective(prev => prev + content);
                    if (field === 'objective') setObjective(prev => prev + content);
                    if (field === 'assessment') setAssessment(prev => prev + content);
                    if (field === 'plan') setPlan(prev => prev + content);
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
            sessionStartTime={sessionStartTime}
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
