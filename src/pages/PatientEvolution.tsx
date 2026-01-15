import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Copy,
  Save,
  Calendar,
  Phone,
  Stethoscope,
  FileText,
  CheckCircle2,
  Activity,
  TrendingUp,
  Zap,
  Sparkles,
  BarChart3,
  Keyboard,
  Eye,
  EyeOff,
  Target,
  Cloud,
  RefreshCw,
  Minimize2,
  Maximize2,
  ImageIcon
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  usePatientSurgeries,
  usePatientGoals,
  usePatientPathologies,
  useRequiredMeasurements,
  useEvolutionMeasurements
} from '@/hooks/usePatientEvolution';
import { useAppointmentData } from '@/hooks/useAppointmentData';
import { useCreateSoapRecord, useSoapRecords, useAutoSaveSoapRecord } from '@/hooks/useSoapRecords';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MeasurementForm } from '@/components/evolution/MeasurementForm';
import { SurgeryTimeline } from '@/components/evolution/SurgeryTimeline';
import { GoalsTracker } from '@/components/evolution/GoalsTracker';
import { PathologyStatus } from '@/components/evolution/PathologyStatus';
import { MeasurementCharts } from '@/components/evolution/MeasurementCharts';
import { PainMapManager } from '@/components/evolution/PainMapManager';
import { TreatmentAssistant } from '@/components/ai/TreatmentAssistant';
import { MandatoryTestAlert } from '@/components/session/MandatoryTestAlert';
import { MedicalReportSuggestions } from '@/components/evolution/MedicalReportSuggestions';
import { SessionExercisesPanel, type SessionExercise } from '@/components/evolution/SessionExercisesPanel';
import { PatientGamification } from '@/components/gamification/PatientGamification';
import { useGamification } from '@/hooks/useGamification';
import { WhatsAppIntegration } from '@/components/whatsapp/WhatsAppIntegration';
import { useSessionExercises } from '@/hooks/useSessionExercises';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionTimer } from '@/components/evolution/SessionTimer';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { ApplyTemplateModal } from '@/components/exercises/ApplyTemplateModal';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PatientHelpers } from '@/types';
// Novos componentes
import { SessionImageUpload } from '@/components/evolution/SessionImageUpload';
import { EvolutionTimeline } from '@/components/evolution/EvolutionTimeline';
import { FloatingActionBar } from '@/components/evolution/FloatingActionBar';
import { SOAPAccordion } from '@/components/evolution/SOAPAccordion';
import { PainScaleWidget } from '@/components/evolution/PainScaleWidget';
import { EvolutionHeader } from '@/components/evolution/EvolutionHeader';
import { EvolutionStats } from '@/components/evolution/EvolutionStats';
import { EvolutionHistoryTab } from '@/components/evolution/EvolutionHistoryTab';

import { EvolutionDraggableGrid } from '@/components/evolution/EvolutionDraggableGrid';
import {
  EvolutionKeyboardShortcuts,
  useEvolutionShortcuts
} from '@/components/evolution/EvolutionKeyboardShortcuts';
import { useCommandPalette } from '@/components/ui/CommandPalette';
// Tipo para escala de dor
export interface PainScaleData {
  level: number;
  location?: string;
  character?: string;
}
import { PatientEvolutionErrorBoundary } from '@/components/patients/PatientEvolutionErrorBoundary';

// Lazy loading para componentes pesados
const LazyMeasurementCharts = lazy(() =>
  Promise.resolve({ default: MeasurementCharts })
);
const LazyTreatmentAssistant = lazy(() =>
  Promise.resolve({ default: TreatmentAssistant })
);
const LazyPatientGamification = lazy(() =>
  Promise.resolve({ default: PatientGamification })
);
const LazyWhatsAppIntegration = lazy(() =>
  Promise.resolve({ default: WhatsAppIntegration })
);

const PatientEvolution = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Command Palette hook - handles Ctrl+K globally
  const { CommandPaletteComponent } = useCommandPalette();



  const [currentSoapRecordId, setCurrentSoapRecordId] = useState<string | undefined>();
  const [sessionStartTime] = useState(new Date());
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Estados do formulário SOAP
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  const setSoapDataStable = React.useCallback((data: { subjective: string; objective: string; assessment: string; plan: string }) => {
    setSubjective(data.subjective);
    setObjective(data.objective);
    setAssessment(data.assessment);
    setPlan(data.plan);
  }, []);

  // Estado para escala de dor (EVA)
  const [painScale, setPainScale] = useState<PainScaleData>({ level: 0 });

  // Estado para controle da aba ativa (para navegação por teclado)
  // Novas abas consolidadas: evolucao, avaliacao, tratamento, historico, assistente
  const [activeTab, setActiveTab] = useState('evolucao');

  // Exercises state
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

  const { lastSession, isLoadingLastSession, suggestExerciseChanges } = useSessionExercises(patientId || '');

  // Load exercises from previous session if current session is empty
  useEffect(() => {
    if (lastSession?.exercises_performed && sessionExercises.length === 0 && !isLoadingLastSession) {
      setSessionExercises(lastSession.exercises_performed as SessionExercise[]);
    }
  }, [lastSession, sessionExercises.length, isLoadingLastSession]);

  const { completeAppointment, isCompleting } = useAppointmentActions();

  // Use custom hook for data fetching
  const {
    appointment,
    patient,
    patientId,
    isLoading: dataLoading,
    appointmentError,
    patientError
  } = useAppointmentData(appointmentId);

  const { awardXp } = useGamification(patientId || '');

  // Hooks de dados de evolução
  const { data: surgeries = [] } = usePatientSurgeries(patientId || '');
  const { data: goals = [] } = usePatientGoals(patientId || '');
  const { data: pathologies = [] } = usePatientPathologies(patientId || '');
  const { data: measurements = [] } = useEvolutionMeasurements(patientId || '');

  // Buscar medições obrigatórias baseadas nas patologias ativas
  const activePathologies = pathologies.filter(p => p.status === 'em_tratamento');
  const { data: requiredMeasurements = [] } = useRequiredMeasurements(
    activePathologies.map(p => p.pathology_name)
  );

  // Buscar evoluções anteriores (SOAP records)
  const { data: previousEvolutions = [] } = useSoapRecords(patientId || '', 10);

  // Calcular tempo de tratamento
  const treatmentDuration = patient?.created_at
    ? formatDistanceToNow(new Date(patient.created_at), { locale: ptBR, addSuffix: true })
    : 'N/A';

  // Calcular estatísticas de evolução
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

  // Atualizar contagem de palavras - memoizado para performance
  const currentWordCount = useMemo(() => {
    return {
      subjective: subjective.split(/\s+/).filter(w => w.length > 0).length,
      objective: objective.split(/\s+/).filter(w => w.length > 0).length,
      assessment: assessment.split(/\s+/).filter(w => w.length > 0).length,
      plan: plan.split(/\s+/).filter(w => w.length > 0).length
    };
  }, [subjective, objective, assessment, plan]);

  // Mutation para salvar evolução
  const createSoapRecord = useCreateSoapRecord();
  // Upsert hook that handles finding existing drafts
  const autoSaveMutation = useAutoSaveSoapRecord();



  // Auto-save SOAP data
  const { lastSavedAt } = useAutoSave({
    data: { subjective, objective, assessment, plan },
    onSave: async (data) => {
      if (!patientId || !appointmentId) return;
      if (!data.subjective && !data.objective && !data.assessment && !data.plan) return;

      // Use autoSaveMutation which handles upsert logic (find existing draft or create new)
      const record = await autoSaveMutation.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        recordId: currentSoapRecordId, // Pass current ID if we have it
        ...data
      });

      // Update local state if we got a record ID (new or existing)
      if (record?.id && record.id !== currentSoapRecordId) {
        setCurrentSoapRecordId(record.id);
      }
    },
    delay: 5000,
    enabled: autoSaveEnabled && !autoSaveMutation.isPending
  });

  // Agrupar medições por tipo para gráficos
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

  // Verificar medições realizadas na sessão atual (hoje)
  const todayMeasurements = useMemo(() => {
    const today = startOfDay(new Date());
    return measurements.filter(m => {
      const measurementDate = startOfDay(new Date(m.measured_at));
      return measurementDate.getTime() === today.getTime();
    });
  }, [measurements]);

  const handleCopyPreviousEvolution = (evolution: {
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
    // Também copiar escala de dor se existir
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
  };

  const handleSave = async () => {
    // Check for mandatory tests - FIXED: now checks if measurement was done TODAY
    const pendingCriticalTests = requiredMeasurements.filter(req => {
      // Check if this measurement exists in today's measurements
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
      // Use useAutoSaveSoapRecord (upsert logic) instead of createSoapRecord
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

      // Save to treatment_sessions (Exercises Performed) with improved error handling
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check for existing session linked to this appointment to upsert
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

        let sessionError;
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

  // Hook de atalhos de teclado - movido para depois das definições das funções
  // para evitar referências a funções ainda não definidas
  useEvolutionShortcuts(
    handleSave,
    handleCompleteSession,
    (section) => {
      // Navegação entre seções
      if (section === 'subjective' || section === 'objective' || section === 'assessment' || section === 'plan') {
        setActiveTab('soap');
        // Scroll para a seção
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
    // Save + Analyze with AI
    async () => {
      await handleSave();
      setActiveTab('assistente');
    }
  );

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

  if (dataLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Carregando dados do paciente...</p>
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

            {/* Debug info for developers - apenas em desenvolvimento */}
            {import.meta.env.DEV && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                <p className="text-xs font-semibold text-amber-800 mb-2">INFO DEV (Debug):</p>
                <div className="text-[10px] font-mono text-amber-900 space-y-1">
                  <div className="flex gap-2">
                    <span className="text-amber-600">appointmentId:</span>
                    <span className="font-mono">{appointmentId || 'undefined'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-amber-600">appointment:</span>
                    <span>{appointment ? 'found' : 'NOT found'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-amber-600">patient:</span>
                    <span>{patient ? 'found' : 'NOT found'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-amber-600">patientId:</span>
                    <span className="font-mono">{patientId || 'undefined'}</span>
                  </div>
                  {appointmentError && (
                    <div className="mt-2 pt-2 border-t border-amber-300">
                      <span className="text-amber-600">appointmentError:</span>
                      <p className="text-red-700 truncate">{appointmentError.message}</p>
                    </div>
                  )}
                  {patientError && (
                    <div className="mt-2 pt-2 border-t border-amber-300">
                      <span className="text-amber-600">patientError:</span>
                      <p className="text-red-700 truncate">{patientError.message}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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

  return (
    <PatientEvolutionErrorBoundary appointmentId={appointmentId} patientId={patientId || undefined}>
      <MainLayout maxWidth="7xl">
        <div className="space-y-4 animate-fade-in pb-8">
          {/* Compact Modern Header - Otimizado para mobile/tablet */}
          <EvolutionHeader
            patient={patient}
            appointment={appointment}
            treatmentDuration={treatmentDuration}
            evolutionStats={evolutionStats}
            sessionStartTime={sessionStartTime}
            onSave={handleSave}
            onComplete={handleCompleteSession}
            isSaving={createSoapRecord.isPending}
            isCompleting={isCompleting}
            autoSaveEnabled={autoSaveEnabled}
            toggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)}
            lastSavedAt={lastSavedAt}
            showInsights={showInsights}
            toggleInsights={() => setShowInsights(!showInsights)}
            onShowTemplateModal={() => setShowApplyTemplate(true)}
            onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
          />

          {/* Quick Stats Row - Glassmorphism Style - Responsive grid */}
          {showInsights && (
            <EvolutionStats stats={evolutionStats} />
          )}

          {/* Mandatory Tests Alert - FIXED: now shows only pending tests for today */}
          {requiredMeasurements.length > 0 && (
            <MandatoryTestAlert
              tests={requiredMeasurements.map(req => {
                // Check if measurement was done today
                const completedToday = todayMeasurements.some(m => m.measurement_name === req.measurement_name);
                return {
                  id: req.id || req.measurement_name,
                  name: req.measurement_name,
                  critical: req.alert_level === 'high',
                  completed: completedToday
                };
              })}
              onResolve={() => {
                // navigate to measurement tab (now part of avaliacao)
                setActiveTab('avaliacao');
              }}
            />
          )}

          {/* Modern Tab Navigation - Consolidated 5 Tabs */}
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

            {/* ========== TAB 1: EVOLUÇÃO (SOAP + Pain Scale + Photos) ========== */}
            <TabsContent value="evolucao" className="mt-4 space-y-4">
              <EvolutionDraggableGrid
                soapData={{ subjective, objective, assessment, plan }}
                onSoapChange={setSoapDataStable}
                painScaleData={painScale}
                onPainScaleChange={setPainScale}
                painHistory={previousEvolutions
                  .filter(e => e.pain_level !== null && e.pain_level !== undefined)
                  .map(e => ({ date: e.created_at, level: e.pain_level || 0 }))}
                showPainTrend={true}
                onAISuggest={(section) => {
                  setActiveTab('assistente');
                }}
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
              />

            </TabsContent>

            {/* ========== TAB 2: AVALIAÇÃO (Measurements + Pain Map + Charts) ========== */}
            <TabsContent value="avaliacao" className="mt-4 space-y-4">
              {/* Pain Map */}
              <PainMapManager
                patientId={patientId || ''}
                appointmentId={appointmentId}
                sessionId={currentSoapRecordId}
              />

              {/* Mandatory Tests Alert */}
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

              {/* Measurement Form */}
              {patientId && (
                <MeasurementForm
                  patientId={patientId}
                  soapRecordId={currentSoapRecordId}
                  requiredMeasurements={requiredMeasurements}
                />
              )}

              {/* Measurement Charts */}
              {Object.keys(measurementsByType).length > 0 && (
                <Suspense fallback={<LoadingSkeleton type="card" />}>
                  <LazyMeasurementCharts measurementsByType={measurementsByType} />
                </Suspense>
              )}
            </TabsContent>

            {/* ========== TAB 3: TRATAMENTO (Exercises + Goals) ========== */}
            <TabsContent value="tratamento" className="mt-4 space-y-4">
              {/* Exercises Panel */}
              <SessionExercisesPanel
                exercises={sessionExercises}
                onChange={setSessionExercises}
              />

              {/* Goals Tracker */}
              <GoalsTracker goals={goals} />

              {/* Pathologies Status */}
              <PathologyStatus pathologies={pathologies} />
            </TabsContent>

            {/* ========== TAB 4: HISTÓRICO (Timeline + Previous Sessions + Surgeries) ========== */}
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

            {/* ========== TAB 5: ASSISTENTE (AI + WhatsApp + Gamification) ========== */}
            <TabsContent value="assistente" className="mt-4 space-y-4">
              {/* AI Treatment Assistant */}
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

              {/* WhatsApp Integration */}
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyWhatsAppIntegration patientId={patientId!} patientPhone={patient.phone} />
              </Suspense>

              {/* Gamification */}
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyPatientGamification patientId={patientId!} />
              </Suspense>
            </TabsContent>
          </Tabs >
        </div >

        {/* Floating Action Bar */}
        <FloatingActionBar
          onSave={handleSave}
          onComplete={handleCompleteSession}
          onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
          isSaving={createSoapRecord.isPending}
          isCompleting={isCompleting}
          autoSaveEnabled={autoSaveEnabled}
          lastSavedAt={lastSavedAt}
          sessionStartTime={sessionStartTime}
        />

        {/* Modal para aplicar template */}



        {/* Modal para aplicar template */}
        {
          patientId && (
            <ApplyTemplateModal
              open={showApplyTemplate}
              onOpenChange={setShowApplyTemplate}
              patientId={patientId}
              patientName={PatientHelpers.getName(patient)}
            />
          )
        }

        {/* Modal de atalhos de teclado */}
        <EvolutionKeyboardShortcuts
          open={showKeyboardHelp}
          onOpenChange={setShowKeyboardHelp}
        />

        {/* Command Palette - Busca Rápida Ctrl+K */}
        <CommandPaletteComponent />
      </MainLayout >
    </PatientEvolutionErrorBoundary >
  );
};

export default PatientEvolution;
