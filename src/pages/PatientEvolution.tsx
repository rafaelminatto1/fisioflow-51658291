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
import { SmartTextarea } from '@/components/ui/SmartTextarea';

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
                full_name,
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
      <div className="space-y-4 animate-fade-in pb-8">
        {/* Compact Modern Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border/50 backdrop-blur-sm">
          <div className="relative z-10 p-4 lg:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Patient Info Section */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/schedule')}
                  className="hover:bg-primary/10 transition-colors flex-shrink-0 h-9 w-9"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-semibold truncate">{patient.name}</h1>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shadow-sm hidden sm:inline-flex">
                        {treatmentDuration}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(appointment.appointment_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {patient.phone && (
                        <span className="flex items-center gap-1 hidden md:flex">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                        </span>
                      )}
                      {evolutionStats.totalEvolutions > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {evolutionStats.totalEvolutions} evoluções
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="flex items-center gap-2 pl-12 lg:pl-0">
                <SessionTimer startTime={sessionStartTime} />
                <div className="h-6 w-px bg-border hidden lg:block" />
                <Button
                  onClick={() => setShowApplyTemplate(true)}
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 lg:px-3 hover:bg-primary/10"
                >
                  <Zap className="h-4 w-4" />
                  <span className="hidden lg:inline ml-1.5 text-xs">Template</span>
                </Button>
                <Button
                  onClick={() => setShowInsights(!showInsights)}
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 lg:px-3 hover:bg-primary/10"
                >
                  {showInsights ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs gap-1 hidden sm:flex"
                >
                  <Save className={`h-4 w-4 ${autoSaveEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className="hidden lg:inline">{autoSaveEnabled ? 'Auto Salvar' : 'Salvar Manual'}</span>
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  variant="outline"
                  disabled={createSoapRecord.isPending}
                  className="h-8 px-2 lg:px-3 shadow-sm hover:shadow"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden lg:inline ml-1.5 text-xs">{createSoapRecord.isPending ? 'Salvando...' : 'Salvar'}</span>
                </Button>
                <Button
                  onClick={handleCompleteSession}
                  size="sm"
                  disabled={createSoapRecord.isPending || isCompleting}
                  className="h-8 px-3 lg:px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1.5 text-xs font-medium">{isCompleting ? 'Finalizando...' : 'Concluir'}</span>
                </Button>
              </div>
            </div>
          </div>
          {/* Subtle decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-2xl -z-0" />
        </div>

        {/* Quick Stats Row - Glassmorphism Style */}
        {showInsights && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: 'Evoluções', value: evolutionStats.totalEvolutions, icon: FileText, color: 'blue' },
              { label: 'Metas', value: `${evolutionStats.completedGoals}/${evolutionStats.totalGoals}`, icon: Target, color: 'green' },
              { label: 'Progresso', value: `${evolutionStats.avgGoalProgress}%`, icon: TrendingUp, color: 'purple' },
              { label: 'Patologias', value: evolutionStats.activePathologiesCount, icon: Activity, color: 'orange' },
              { label: 'Medições', value: evolutionStats.totalMeasurements, icon: BarChart3, color: 'cyan' },
              { label: 'Sucesso', value: `${evolutionStats.completionRate}%`, icon: CheckCircle2, color: 'emerald' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-3 hover:bg-card/80 hover:shadow-md transition-all cursor-default"
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</p>
                    <p className={`text-lg font-bold text-${stat.color}-600 dark:text-${stat.color}-400 mt-0.5`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-500/40 group-hover:text-${stat.color}-500/60 transition-colors`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modern Tab Navigation */}
        <Tabs defaultValue="soap" className="w-full">
          <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-muted/40 p-1 text-muted-foreground w-full lg:w-auto overflow-x-auto">
            {[
              { value: 'soap', label: 'SOAP', icon: FileText },
              { value: 'exercises', label: 'Exercícios', icon: Activity },
              { value: 'history', label: 'Histórico', icon: Clock },
              { value: 'ai', label: 'IA', icon: Sparkles },
              { value: 'gamification', label: 'Gamificação', icon: Target },
              { value: 'whatsapp', label: 'WhatsApp', icon: Phone },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1.5"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="exercises" className="mt-6">
            <SessionExercisesPanel
              exercises={sessionExercises}
              onChange={setSessionExercises}
            />
          </TabsContent>

          <TabsContent value="soap" className="mt-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Main Column - SOAP Form */}
              <div className="space-y-4">
                <Card className="border-border/50 shadow-sm overflow-visible bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-0">
                    {/* SOAP Form with compact sections */}
                    <div className="divide-y divide-border/50">
                      {/* Subjective Section */}
                      <div className="p-4 hover:bg-muted/10 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="subjective" className="text-sm font-medium flex items-center gap-2 text-primary">
                            <span className="w-6 h-6 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shadow-sm">S</span>
                            Subjetivo
                          </Label>
                          <span className="text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                            {wordCount.subjective} palavras
                          </span>
                        </div>
                        <SmartTextarea
                          id="subjective"
                          value={subjective}
                          onChange={(e) => setSubjective(e.target.value)}
                          placeholder="Queixa principal do paciente, relato de dor, desconforto, nível de estresse, sono..."
                          className="min-h-[120px] text-base"
                        />
                      </div>

                      {/* Objective Section */}
                      <div className="p-4 hover:bg-muted/10 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="objective" className="text-sm font-medium flex items-center gap-2 text-primary">
                            <span className="w-6 h-6 rounded-md bg-green-500/15 text-green-600 dark:text-green-400 flex items-center justify-center text-xs font-bold shadow-sm">O</span>
                            Objetivo
                          </Label>
                          <span className="text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                            {wordCount.objective} palavras
                          </span>
                        </div>
                        <SmartTextarea
                          id="objective"
                          value={objective}
                          onChange={(e) => setObjective(e.target.value)}
                          placeholder="Achados do exame físico, amplitude de movimento, força, testes especiais..."
                          className="min-h-[120px] text-base"
                        />
                      </div>

                      {/* Assessment Section */}
                      <div className="p-4 hover:bg-muted/10 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="assessment" className="text-sm font-medium flex items-center gap-2 text-primary">
                            <span className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold shadow-sm">A</span>
                            Avaliação
                          </Label>
                          <span className="text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                            {wordCount.assessment} palavras
                          </span>
                        </div>
                        <SmartTextarea
                          id="assessment"
                          value={assessment}
                          onChange={(e) => setAssessment(e.target.value)}
                          placeholder="Análise do progresso, resposta ao tratamento, correlações clínicas..."
                          className="min-h-[120px] text-base"
                        />
                      </div>

                      {/* Plan Section */}
                      <div className="p-4 hover:bg-muted/10 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="plan" className="text-sm font-medium flex items-center gap-2 text-primary">
                            <span className="w-6 h-6 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold shadow-sm">P</span>
                            Plano
                          </Label>
                          <span className="text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                            {wordCount.plan} palavras
                          </span>
                        </div>
                        <SmartTextarea
                          id="plan"
                          value={plan}
                          onChange={(e) => setPlan(e.target.value)}
                          placeholder="Conduta realizada hoje, exercícios prescritos, orientações para casa, plano para próxima visita..."
                          className="min-h-[120px] text-base"
                        />
                      </div>
                    </div>

                    {/* Progress Footer */}
                    <div className="px-4 py-3 bg-muted/30 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Preenchimento da Evolução</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={
                            ((wordCount.subjective >= 10 ? 1 : 0) +
                              (wordCount.objective >= 10 ? 1 : 0) +
                              (wordCount.assessment >= 10 ? 1 : 0) +
                              (wordCount.plan >= 10 ? 1 : 0)) / 4 * 100
                          }
                          className="h-1.5 w-24"
                        />
                        <span className="text-xs font-medium">
                          {Math.round(
                            ((wordCount.subjective >= 10 ? 1 : 0) +
                              (wordCount.objective >= 10 ? 1 : 0) +
                              (wordCount.assessment >= 10 ? 1 : 0) +
                              (wordCount.plan >= 10 ? 1 : 0)) / 4 * 100
                          )}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Formulário de Medições Integrado */}
                {patientId && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mt-8 mb-4">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Medições e Testes
                    </h2>

                    {/* Alertas de Medições Obrigatórias */}
                    {requiredMeasurements.length > 0 && (
                      <Card className="border-destructive/30 shadow-sm mb-4">
                        <CardHeader className="bg-destructive/5 py-3">
                          <CardTitle className="flex items-center gap-2 text-destructive text-base">
                            <AlertTriangle className="h-4 w-4" />
                            Medições Obrigatórias Pendentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-4">
                          {requiredMeasurements.map((req) => (
                            <Alert
                              key={req.id}
                              variant={req.alert_level === 'high' ? 'destructive' : 'default'}
                              className="py-2"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle className="text-sm font-semibold">{req.measurement_name}</AlertTitle>
                              <AlertDescription className="text-xs">
                                {req.instructions}
                                {req.measurement_unit && ` (${req.measurement_unit})`}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    <MeasurementForm
                      patientId={patientId}
                      soapRecordId={currentSoapRecordId}
                      requiredMeasurements={requiredMeasurements}
                    />

                    {/* Gráficos de Medições - Lazy Loaded */}
                    {Object.keys(measurementsByType).length > 0 && (
                      <div className="mt-6">
                        <Suspense fallback={<LoadingSkeleton type="card" />}>
                          <LazyMeasurementCharts measurementsByType={measurementsByType} />
                        </Suspense>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {/* Coluna Lateral antiga, agora em aba separada ou abaixo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cirurgias */}
              <SurgeryTimeline surgeries={surgeries} />

              {/* Objetivos */}
              <GoalsTracker goals={goals} />

              {/* Patologias */}
              <PathologyStatus pathologies={pathologies} />

              {/* Evoluções Anteriores - Melhorado */}
              {previousEvolutions.length > 0 && (
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-muted/20">
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
