import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Copy,
  Save,
  User,
  Calendar,
  Phone,
  Stethoscope,
  FileText,
  CheckCircle2,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Sparkles,
  BarChart3,
  Lightbulb,
  Keyboard,
  Download,
  Share2,
  Eye,
  EyeOff,
  Target
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  usePatientSurgeries,
  usePatientGoals,
  usePatientPathologies,
  useRequiredMeasurements,
  useEvolutionMeasurements
} from '@/hooks/usePatientEvolution';
import { useCreateSoapRecord, useSoapRecords } from '@/hooks/useSoapRecords';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';
import { MeasurementForm } from '@/components/evolution/MeasurementForm';
import { SurgeryTimeline } from '@/components/evolution/SurgeryTimeline';
import { GoalsTracker } from '@/components/evolution/GoalsTracker';
import { PathologyStatus } from '@/components/evolution/PathologyStatus';
import { MeasurementCharts } from '@/components/evolution/MeasurementCharts';
import { PainMapManager } from '@/components/evolution/PainMapManager';
import { ReportGeneratorDialog } from '@/components/reports/ReportGeneratorDialog';
import { TreatmentAssistant } from '@/components/ai/TreatmentAssistant';
import { SessionExercisesPanel, type SessionExercise } from '@/components/evolution/SessionExercisesPanel';
import { PatientGamification } from '@/components/gamification/PatientGamification';
import { WhatsAppIntegration } from '@/components/whatsapp/WhatsAppIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionWizard, WizardStep } from '@/components/evolution/SessionWizard';
import { SessionTimer } from '@/components/evolution/SessionTimer';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { ApplyTemplateModal } from '@/components/exercises/ApplyTemplateModal';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

// Lazy loading para componentes pesados
const LazyMeasurementCharts = lazy(() =>
  Promise.resolve({ default: MeasurementCharts })
);
const LazyPainMapManager = lazy(() =>
  Promise.resolve({ default: PainMapManager })
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
  const [currentSoapRecordId, setCurrentSoapRecordId] = useState<string | undefined>();
  const [sessionStartTime] = useState(new Date());
  const [currentWizardStep, setCurrentWizardStep] = useState('subjective');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [wordCount, setWordCount] = useState({ subjective: 0, objective: 0, assessment: 0, plan: 0 });

  // Estados do formulário SOAP
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Exercises state
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

  const { completeAppointment, isCompleting } = useAppointmentActions();

  // Função auxiliar para timeout
  const withTimeout = useCallback(<T,>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }, []);

  // Função auxiliar para retry
  const retryWithBackoff = useCallback(async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }, []);

  // Buscar dados do agendamento do Supabase com retry e timeout
  const { data: appointment, isLoading: appointmentLoading, error: appointmentError } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) throw new Error('ID do agendamento não fornecido');

      const result = await retryWithBackoff(() =>
        withTimeout(
          supabase
            .from('appointments')
            .select(`
              *,
              patients!inner(
                id,
                name,
                phone,
                email,
                birth_date,
                status,
                created_at
              )
            `)
            .eq('id', appointmentId)
            .maybeSingle(),
          8000
        )
      );
      return result.data;
    },
    enabled: !!appointmentId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  const patientId = appointment?.patient_id;

  // Buscar informações do paciente do Supabase com retry e timeout
  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) throw new Error('ID do paciente não fornecido');

      const result = await retryWithBackoff(() =>
        withTimeout(
          supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .maybeSingle(),
          8000
        )
      );
      return result.data;
    },
    enabled: !!patientId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

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

  // Atualizar contagem de palavras
  useEffect(() => {
    setWordCount({
      subjective: subjective.split(/\s+/).filter(w => w.length > 0).length,
      objective: objective.split(/\s+/).filter(w => w.length > 0).length,
      assessment: assessment.split(/\s+/).filter(w => w.length > 0).length,
      plan: plan.split(/\s+/).filter(w => w.length > 0).length
    });
  }, [subjective, objective, assessment, plan]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S para salvar
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + Enter para concluir
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompleteSession();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [subjective, objective, assessment, plan]);

  // Mutation para salvar evolução
  const createSoapRecord = useCreateSoapRecord();

  // Wizard steps
  const wizardSteps: WizardStep[] = useMemo(() => [
    {
      id: 'subjective',
      label: 'Subjetivo',
      completed: subjective.length > 10
    },
    {
      id: 'objective',
      label: 'Objetivo',
      completed: objective.length > 10
    },
    {
      id: 'assessment',
      label: 'Avaliação',
      completed: assessment.length > 10
    },
    {
      id: 'plan',
      label: 'Plano',
      completed: plan.length > 10
    },
    {
      id: 'measurements',
      label: 'Medições',
      completed: measurements.length > 0,
      optional: true
    }
  ], [subjective, objective, assessment, plan, measurements]);

  // Auto-save SOAP data
  useAutoSave({
    data: { subjective, objective, assessment, plan },
    onSave: async (data) => {
      if (!patientId || !appointmentId) return;
      if (!data.subjective && !data.objective && !data.assessment && !data.plan) return;

      await createSoapRecord.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        ...data
      });
    },
    delay: 5000,
    enabled: autoSaveEnabled && !createSoapRecord.isPending
  });

  // Agrupar medições por tipo para gráficos
  const measurementsByType = useMemo(() => {
    const grouped: Record<string, any[]> = {};
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

  const handleCopyPreviousEvolution = (evolution: any) => {
    setSubjective(evolution.subjective || '');
    setObjective(evolution.objective || '');
    setAssessment(evolution.assessment || '');
    setPlan(evolution.plan || '');
    toast({
      title: 'Evolução copiada',
      description: 'Os dados da evolução anterior foram copiados.'
    });
  };

  const handleSave = async () => {
    if (!subjective && !objective && !assessment && !plan) {
      toast({
        title: 'Campos vazios',
        description: 'Preencha pelo menos um campo antes de salvar.',
        variant: 'destructive'
      });
      return;
    }

    if (!patientId) return;

    const record = await createSoapRecord.mutateAsync({
      patient_id: patientId,
      appointment_id: appointmentId,
      subjective,
      objective,
      assessment,
      plan
    });

    setCurrentSoapRecordId(record.id);

    // Save to treatment_sessions (Exercises Performed)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check for existing session linked to this appointment to upsert
      let existingSessionId = null;
      if (appointmentId) {
        const { data: existingSession } = await supabase
          .from('treatment_sessions')
          .select('id')
          .eq('appointment_id', appointmentId)
          .maybeSingle(); // Use maybeSingle to avoid errors if not found
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
        console.warn('Error saving treatment_sessions:', sessionError);
      }
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
        onSuccess: () => {
          toast({
            title: 'Atendimento concluído',
            description: 'O atendimento foi marcado como concluído com sucesso.'
          });
          setTimeout(() => navigate('/schedule'), 1500);
        }
      });
    }
  };

  if (appointmentLoading || patientLoading) {
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

  if (!appointment || !patient) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold">Agendamento não encontrado</p>
            <p className="text-muted-foreground">Não foi possível carregar os dados do agendamento.</p>
            <Button onClick={() => navigate('/schedule')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Agenda
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in pb-8">
        {/* Modern Header with Enhanced Gradient and Stats */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-background p-6 shadow-xl border border-primary/20">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* Info Section */}
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('/schedule')}
                  className="mt-1 hover:scale-105 transition-transform flex-shrink-0 shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-primary/20 rounded-xl flex-shrink-0 shadow-sm">
                      <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        Evolução do Paciente
                      </h1>
                      <p className="text-muted-foreground flex items-center gap-2 mt-0.5 sm:mt-1 text-sm sm:text-base truncate">
                        <User className="h-4 w-4 flex-shrink-0" />
                        {patient.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <Badge variant="outline" className="gap-1 text-xs shadow-sm">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(appointment.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Badge>
                    {patient.phone && (
                      <Badge variant="outline" className="gap-1 text-xs shadow-sm">
                        <Phone className="h-3 w-3" />
                        {patient.phone}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs shadow-sm">
                      {treatmentDuration}
                    </Badge>
                    {evolutionStats.totalEvolutions > 0 && (
                      <Badge variant="outline" className="text-xs shadow-sm">
                        <FileText className="h-3 w-3 mr-1" />
                        {evolutionStats.totalEvolutions} evoluções
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/30">
                <SessionTimer startTime={sessionStartTime} />
                <Button
                  onClick={() => setShowApplyTemplate(true)}
                  size="sm"
                  variant="secondary"
                  className="shadow hover:shadow-lg transition-all text-xs sm:text-sm lg:size-default hover:scale-105"
                >
                  <Zap className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Template</span>
                </Button>
                <Button
                  onClick={() => setShowInsights(!showInsights)}
                  size="sm"
                  variant="outline"
                  className="shadow hover:shadow-lg transition-all text-xs sm:text-sm lg:size-default hover:scale-105"
                >
                  {showInsights ? <EyeOff className="h-4 w-4 sm:mr-2" /> : <Eye className="h-4 w-4 sm:mr-2" />}
                  <span className="hidden sm:inline">Insights</span>
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  variant="outline"
                  disabled={createSoapRecord.isPending}
                  className="shadow hover:shadow-lg transition-all text-xs sm:text-sm lg:size-default hover:scale-105"
                >
                  <Save className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{createSoapRecord.isPending ? 'Salvando...' : 'Salvar'}</span>
                  <span className="hidden lg:inline text-xs ml-1 text-muted-foreground">(Ctrl+S)</span>
                </Button>
                <Button
                  onClick={handleCompleteSession}
                  size="sm"
                  disabled={createSoapRecord.isPending || isCompleting}
                  className="shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-xs sm:text-sm lg:size-default"
                >
                  <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{isCompleting ? 'Finalizando...' : 'Concluir'}</span>
                  <span className="hidden lg:inline text-xs ml-1 opacity-80">(Ctrl+Enter)</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -z-0 animate-pulse delay-1000" />
        </div>

        {/* Quick Stats Cards */}
        {showInsights && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Evoluções</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{evolutionStats.totalEvolutions}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Metas</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {evolutionStats.completedGoals}/{evolutionStats.totalGoals}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-green-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{evolutionStats.avgGoalProgress}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Patologias</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{evolutionStats.activePathologiesCount}</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-cyan-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Medições</p>
                    <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{evolutionStats.totalMeasurements}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-cyan-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-pink-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{evolutionStats.completionRate}%</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-pink-500/30" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Wizard Progress - Melhorado */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-primary">
          <CardHeader className="pb-4 bg-gradient-to-r from-background to-muted/20">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Progresso do Atendimento</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Complete todas as etapas para finalizar
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className="text-xs"
                >
                  <Save className={`h-3 w-3 mr-1 ${autoSaveEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                  Auto-save: {autoSaveEnabled ? 'Ativo' : 'Inativo'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: 'Atalhos de Teclado',
                      description: 'Ctrl+S: Salvar | Ctrl+Enter: Concluir',
                    });
                  }}
                  className="text-xs"
                >
                  <Keyboard className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SessionWizard
              steps={wizardSteps}
              currentStep={currentWizardStep}
              onStepClick={setCurrentWizardStep}
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Etapas completadas</span>
                <span className="font-semibold">
                  {wizardSteps.filter(s => s.completed).length} / {wizardSteps.filter(s => !s.optional).length}
                </span>
              </div>
              <Progress
                value={(wizardSteps.filter(s => s.completed).length / wizardSteps.filter(s => !s.optional).length) * 100}
                className="h-2 mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs Navigation - Melhorado */}
        <Tabs defaultValue="soap" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid h-auto p-1 bg-muted/50">
            <TabsTrigger value="soap" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">SOAP</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">IA</span>
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Gamificação</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="measurements" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Medições</span>
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Exercícios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="mt-6">
            <SessionExercisesPanel
              exercises={sessionExercises}
              onChange={setSessionExercises}
            />
          </TabsContent>

          <TabsContent value="soap" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna Principal - Evolução SOAP */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-background">
                    <CardTitle>Registro SOAP</CardTitle>
                    <CardDescription>
                      Preencha os campos abaixo para registrar a evolução do paciente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="subjective" className="text-base font-semibold flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">S</span>
                          Subjetivo
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {wordCount.subjective} palavras
                        </Badge>
                      </div>
                      <Textarea
                        id="subjective"
                        value={subjective}
                        onChange={(e) => setSubjective(e.target.value)}
                        placeholder="Queixa principal do paciente, relato de dor, desconforto..."
                        rows={4}
                        className="resize-none transition-all focus:ring-2 focus:ring-primary/20"
                      />
                      {wordCount.subjective < 10 && subjective.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Considere adicionar mais detalhes (mínimo recomendado: 10 palavras)
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="objective" className="text-base font-semibold flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-bold">O</span>
                          Objetivo
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {wordCount.objective} palavras
                        </Badge>
                      </div>
                      <Textarea
                        id="objective"
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder="Observações clínicas, testes realizados, medições..."
                        rows={4}
                        className="resize-none transition-all focus:ring-2 focus:ring-primary/20"
                      />
                      {wordCount.objective < 10 && objective.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Considere adicionar mais detalhes (mínimo recomendado: 10 palavras)
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="assessment" className="text-base font-semibold flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">A</span>
                          Avaliação
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {wordCount.assessment} palavras
                        </Badge>
                      </div>
                      <Textarea
                        id="assessment"
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        placeholder="Diagnóstico fisioterapêutico, análise da evolução..."
                        rows={4}
                        className="resize-none transition-all focus:ring-2 focus:ring-primary/20"
                      />
                      {wordCount.assessment < 10 && assessment.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Considere adicionar mais detalhes (mínimo recomendado: 10 palavras)
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="plan" className="text-base font-semibold flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-bold">P</span>
                          Plano
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {wordCount.plan} palavras
                        </Badge>
                      </div>
                      <Textarea
                        id="plan"
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        placeholder="Conduta, exercícios prescritos, orientações..."
                        rows={4}
                        className="resize-none transition-all focus:ring-2 focus:ring-primary/20"
                      />
                      {wordCount.plan < 10 && plan.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Considere adicionar mais detalhes (mínimo recomendado: 10 palavras)
                        </p>
                      )}
                    </div>

                    {/* Progress Indicator */}
                    <div className="pt-4 border-t">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresso do preenchimento</span>
                          <span className="font-semibold">
                            {Math.round(
                              ((wordCount.subjective >= 10 ? 1 : 0) +
                                (wordCount.objective >= 10 ? 1 : 0) +
                                (wordCount.assessment >= 10 ? 1 : 0) +
                                (wordCount.plan >= 10 ? 1 : 0)) / 4 * 100
                            )}%
                          </span>
                        </div>
                        <Progress
                          value={
                            ((wordCount.subjective >= 10 ? 1 : 0) +
                              (wordCount.objective >= 10 ? 1 : 0) +
                              (wordCount.assessment >= 10 ? 1 : 0) +
                              (wordCount.plan >= 10 ? 1 : 0)) / 4 * 100
                          }
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Alertas de Medições Obrigatórias */}
                {requiredMeasurements.length > 0 && (
                  <Card className="border-destructive/30 shadow-lg">
                    <CardHeader className="bg-destructive/5">
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Medições Obrigatórias
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                      {requiredMeasurements.map((req) => (
                        <Alert
                          key={req.id}
                          variant={req.alert_level === 'high' ? 'destructive' : 'default'}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>{req.measurement_name}</AlertTitle>
                          <AlertDescription>
                            {req.instructions}
                            {req.measurement_unit && ` (${req.measurement_unit})`}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Formulário de Medições */}
                {patientId && (
                  <MeasurementForm
                    patientId={patientId}
                    soapRecordId={currentSoapRecordId}
                    requiredMeasurements={requiredMeasurements}
                  />
                )}

                {/* Gráficos de Medições - Lazy Loaded */}
                {Object.keys(measurementsByType).length > 0 && (
                  <Suspense fallback={<LoadingSkeleton type="card" />}>
                    <LazyMeasurementCharts measurementsByType={measurementsByType} />
                  </Suspense>
                )}

                {/* Mapa de Dor - Lazy Loaded */}
                {patientId && (
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-red-50/50 to-orange-100/50 dark:from-red-950/20 dark:to-orange-900/20">
                      <CardTitle className="text-lg">Mapa de Dor</CardTitle>
                      <CardDescription>Registre e acompanhe a evolução da dor do paciente</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Suspense fallback={<LoadingSkeleton type="card" />}>
                        <LazyPainMapManager
                          patientId={patientId}
                          sessionId={currentSoapRecordId}
                          appointmentId={appointmentId}
                        />
                      </Suspense>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Coluna Lateral - Informações Complementares */}
              <div className="space-y-6">
                {/* Cirurgias */}
                <SurgeryTimeline surgeries={surgeries} />

                {/* Objetivos */}
                <GoalsTracker goals={goals} />

                {/* Patologias */}
                <PathologyStatus pathologies={pathologies} />

                {/* Evoluções Anteriores - Melhorado */}
                {previousEvolutions.length > 0 && (
                  <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-indigo-50/50 via-indigo-100/50 to-indigo-50/50 dark:from-indigo-950/20 dark:via-indigo-900/20 dark:to-indigo-950/20">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          Evoluções Anteriores
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {previousEvolutions.length} registros
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ScrollArea className="h-[320px] pr-4">
                        <div className="space-y-3">
                          {previousEvolutions.map((evolution, index) => (
                            <div
                              key={evolution.id}
                              className="group border rounded-xl p-4 space-y-3 hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer bg-card"
                              onClick={() => setShowComparison(!showComparison)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                                    {previousEvolutions.length - index}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {format(new Date(evolution.record_date), 'dd/MM/yyyy', { locale: ptBR })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(evolution.record_date), { locale: ptBR, addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyPreviousEvolution(evolution);
                                  }}
                                  className="hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {evolution.subjective && (
                                  <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">S:</p>
                                    <p className="text-muted-foreground line-clamp-2">{evolution.subjective}</p>
                                  </div>
                                )}
                                {evolution.objective && (
                                  <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                                    <p className="font-semibold text-green-600 dark:text-green-400 mb-1">O:</p>
                                    <p className="text-muted-foreground line-clamp-2">{evolution.objective}</p>
                                  </div>
                                )}
                                {evolution.assessment && (
                                  <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                    <p className="font-semibold text-purple-600 dark:text-purple-400 mb-1">A:</p>
                                    <p className="text-muted-foreground line-clamp-2">{evolution.assessment}</p>
                                  </div>
                                )}
                                {evolution.plan && (
                                  <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                    <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1">P:</p>
                                    <p className="text-muted-foreground line-clamp-2">{evolution.plan}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <Suspense fallback={<LoadingSkeleton type="card" />}>
              <LazyTreatmentAssistant patientId={patientId!} patientName={patient.name} />
            </Suspense>
          </TabsContent>

          <TabsContent value="gamification" className="mt-6">
            <Suspense fallback={<LoadingSkeleton type="card" />}>
              <LazyPatientGamification patientId={patientId!} />
            </Suspense>
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6">
            <Suspense fallback={<LoadingSkeleton type="card" />}>
              <LazyWhatsAppIntegration patientId={patientId!} patientPhone={patient.phone} />
            </Suspense>
          </TabsContent>

          <TabsContent value="measurements" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MeasurementForm patientId={patientId!} soapRecordId={currentSoapRecordId} />
              {Object.keys(measurementsByType).length > 0 && (
                <MeasurementCharts measurementsByType={measurementsByType} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal para aplicar template */}
      {patientId && (
        <ApplyTemplateModal
          open={showApplyTemplate}
          onOpenChange={setShowApplyTemplate}
          patientId={patientId}
          patientName={patient.name}
        />
      )}
    </MainLayout>
  );
};

export default PatientEvolution;
