import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useCreateSoapRecord, useSoapRecords } from '@/hooks/useSoapRecords';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionTimer } from '@/components/evolution/SessionTimer';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { ApplyTemplateModal } from '@/components/exercises/ApplyTemplateModal';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { PatientHelpers } from '@/types';
// Novos componentes
import PainScaleInput from '@/components/evolution/PainScaleInput';
import { SessionImageUpload } from '@/components/evolution/SessionImageUpload';
import { EvolutionTimeline } from '@/components/evolution/EvolutionTimeline';

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
  const [wordCount, setWordCount] = useState({ subjective: 0, objective: 0, assessment: 0, plan: 0 });

  // Estados do formulário SOAP
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Estado para escala de dor (EVA)
  const [painScale, setPainScale] = useState<PainScaleData>({ level: 0 });

  // Estado para controle da aba ativa (para navegação por teclado)
  const [activeTab, setActiveTab] = useState('soap');

  // Exercises state
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

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
  useEffect(() => {
    setWordCount({
      subjective: subjective.split(/\s+/).filter(w => w.length > 0).length,
      objective: objective.split(/\s+/).filter(w => w.length > 0).length,
      assessment: assessment.split(/\s+/).filter(w => w.length > 0).length,
      plan: plan.split(/\s+/).filter(w => w.length > 0).length
    });
  }, [subjective, objective, assessment, plan]);

  // Mutation para salvar evolução
  const createSoapRecord = useCreateSoapRecord();



  // Auto-save SOAP data
  const { lastSavedAt } = useAutoSave({
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
      const record = await createSoapRecord.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        subjective,
        objective,
        assessment,
        plan,
        pain_level: painScale.level,
        pain_location: painScale.location,
        pain_character: painScale.character
      });

      setCurrentSoapRecordId(record.id);

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
        setActiveTab('measurements');
      } else if (section === 'history') {
        setActiveTab('history');
      } else if (section === 'ai') {
        setActiveTab('ai');
      }
    },
    () => setShowKeyboardHelp(true),
    () => setShowApplyTemplate(true),
    // Save + Analyze with AI
    async () => {
      await handleSave();
      setActiveTab('ai');
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
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border/50 backdrop-blur-sm">
            <div className="relative z-10 p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col gap-4">
                {/* Patient Info Section - Top row on mobile */}
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/schedule')}
                    className="hover:bg-primary/10 transition-colors flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 touch-target"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm flex-shrink-0">
                      <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-base sm:text-lg font-semibold truncate">{PatientHelpers.getName(patient)}</h1>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shadow-sm">
                          {treatmentDuration}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(appointment.appointment_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span className="hidden xs:inline">{patient.phone}</span>
                            <span className="xs:hidden">Tel</span>
                          </span>
                        )}
                        {evolutionStats.totalEvolutions > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {evolutionStats.totalEvolutions} evol.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Section - Bottom row with better mobile layout */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                  <SessionTimer startTime={sessionStartTime} />
                  <div className="h-6 w-px bg-border hidden sm:block" />
                  <Button
                    onClick={() => setShowApplyTemplate(true)}
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 sm:px-3 hover:bg-primary/10 touch-target flex-shrink-0"
                  >
                    <Zap className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1 text-[10px] xs:text-xs">Template</span>
                  </Button>
                  <Button
                    onClick={() => setShowInsights(!showInsights)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 px-2 hover:bg-primary/10 touch-target flex-shrink-0"
                  >
                    {showInsights ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 hover:bg-primary/10 touch-target flex-shrink-0 relative"
                    title={autoSaveEnabled ? 'Auto Salvar Ativado' : 'Auto Salvar Desativado'}
                  >
                    <Save className={`h-4 w-4 ${autoSaveEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                    {lastSavedAt && autoSaveEnabled && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </Button>
                  {lastSavedAt && autoSaveEnabled && (
                    <span className="hidden sm:flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Cloud className="h-2.5 w-2.5" />
                      {format(lastSavedAt, 'HH:mm')}
                    </span>
                  )}
                  <Button
                    onClick={() => setShowKeyboardHelp(true)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 px-2 hover:bg-primary/10 touch-target flex-shrink-0"
                    title="Atalhos de teclado (?)"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    variant="outline"
                    disabled={createSoapRecord.isPending}
                    className="h-8 px-3 sm:px-3 shadow-sm hover:shadow touch-target flex-shrink-0 min-w-[70px]"
                  >
                    <Save className="h-4 w-4" />
                    <span className="hidden xs:inline ml-1 text-xs">{createSoapRecord.isPending ? '...' : 'Salvar'}</span>
                  </Button>
                  <Button
                    onClick={handleCompleteSession}
                    size="sm"
                    disabled={createSoapRecord.isPending || isCompleting}
                    className="h-8 px-3 sm:px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all touch-target flex-shrink-0 min-w-[90px]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden xs:inline ml-1.5 text-xs font-medium">{isCompleting ? '...' : 'Concluir'}</span>
                  </Button>
                </div>
              </div>
            </div>
            {/* Subtle decorative elements */}
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-2xl -z-0" />
          </div>

          {/* Quick Stats Row - Glassmorphism Style - Responsive grid */}
          {showInsights && (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
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
                  className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-2 sm:p-3 hover:bg-card/80 hover:shadow-md transition-all cursor-default"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{stat.label}</p>
                      <p className={`text-sm sm:text-lg font-bold text-${stat.color}-600 dark:text-${stat.color}-400 mt-0.5 truncate`}>{stat.value}</p>
                    </div>
                    <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${stat.color}-500/40 group-hover:text-${stat.color}-500/60 transition-colors flex-shrink-0`} />
                  </div>
                </div>
              ))}
            </div>
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
                // navigate to measurement tab
                setActiveTab('measurements');
              }}
            />
          )}

          {/* Modern Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="inline-flex h-9 sm:h-10 items-center justify-start rounded-lg bg-muted/40 p-1 text-muted-foreground w-full lg:w-auto overflow-x-auto scrollbar-hide">
              {[
                { value: 'soap', label: 'SOAP', shortLabel: 'S', icon: FileText },
                { value: 'pain-map', label: 'Mapa de Dor', shortLabel: 'Dor', icon: Activity },
                { value: 'exercises', label: 'Exercícios', shortLabel: 'Exer', icon: Activity },
                { value: 'history', label: 'Histórico', shortLabel: 'Hist', icon: Clock },
                { value: 'measurements', label: 'Medições', shortLabel: 'Med', icon: BarChart3 },
                { value: 'ai', label: 'IA', shortLabel: 'IA', icon: Sparkles },
                { value: 'gamification', label: 'Gamificação', shortLabel: 'Game', icon: Target },
                { value: 'whatsapp', label: 'WhatsApp', shortLabel: 'Zap', icon: Phone },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 sm:px-3 xs:px-4 py-1.5 text-[10px] sm:text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1 sm:gap-2 min-w-fit touch-target"
                >
                  <tab.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="hidden xs:inline sm:hidden">{tab.shortLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>




            <TabsContent value="exercises" className="mt-6">
              <SessionExercisesPanel
                exercises={sessionExercises}
                onChange={setSessionExercises}
              />
            </TabsContent>

            <TabsContent value="pain-map" className="mt-4">
              <PainMapManager
                patientId={patientId || ''}
                appointmentId={appointmentId}
                sessionId={currentSoapRecordId}
              />
            </TabsContent>

            <TabsContent value="soap" className="mt-4">
              {/* Layout com painéis redimensionáveis */}
              <div className="h-full overflow-auto">
                <div className="p-4 space-y-4">
                  {/* Header do painel SOAP */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Evolução SOAP
                    </h3>
                    {/* Botão para expandir/colapsar medições */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInsights(!showInsights)}
                      className="h-8 w-8 p-0"
                      title={showInsights ? 'Ocultar Medições' : 'Mostrar Medições'}
                    >
                      {showInsights ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* SOAP Card com grid 2x2 */}
                  <Card className="border-border/50 shadow-sm overflow-visible bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-0">
                      {/* SOAP Form em grid 2x2 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
                        {/* Subjective Section */}
                        <div className="p-3 sm:p-4 hover:bg-muted/10 transition-colors group">
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="subjective" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-primary">
                              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-sm">S</span>
                              <span className="hidden xs:inline">Subjetivo</span>
                              <span className="xs:hidden">Subj</span>
                            </Label>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                              {wordCount.subjective} palavras
                            </span>
                          </div>
                          <SmartTextarea
                            id="subjective"
                            value={subjective}
                            onChange={(e) => setSubjective(e.target.value)}
                            placeholder="Queixa principal do paciente, relato de dor, desconforto, nível de estresse, sono..."
                            className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                          />

                          {/* Escala EVA de Dor - integrada no Subjetivo */}
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <PainScaleInput
                              value={painScale}
                              onChange={setPainScale}
                              history={previousEvolutions
                                .filter(e => e.pain_level !== null && e.pain_level !== undefined)
                                .map(e => ({ date: e.created_at, level: e.pain_level || 0 }))
                              }
                            />
                          </div>
                        </div>

                        {/* Objective Section */}
                        <div className="p-3 sm:p-4 hover:bg-muted/10 transition-colors group">
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="objective" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-primary">
                              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-green-500/15 text-green-600 dark:text-green-400 flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-sm">O</span>
                              Objetivo
                            </Label>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                              {wordCount.objective} palavras
                            </span>
                          </div>
                          <SmartTextarea
                            id="objective"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            placeholder="Achados do exame físico, amplitude de movimento, força, testes especiais..."
                            className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                          />
                        </div>

                        {/* Assessment Section */}
                        <div className="p-3 sm:p-4 hover:bg-muted/10 transition-colors group">
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="assessment" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-primary">
                              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-sm">A</span>
                              Avaliação
                            </Label>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                              {wordCount.assessment} palavras
                            </span>
                          </div>
                          <SmartTextarea
                            id="assessment"
                            value={assessment}
                            onChange={(e) => setAssessment(e.target.value)}
                            placeholder="Análise do progresso, resposta ao tratamento, correlações clínicas..."
                            className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                          />
                        </div>

                        {/* Plan Section */}
                        <div className="p-3 sm:p-4 hover:bg-muted/10 transition-colors group">
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="plan" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-primary">
                              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-sm">P</span>
                              Plano
                            </Label>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                              {wordCount.plan} palavras
                            </span>
                          </div>
                          <SmartTextarea
                            id="plan"
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            placeholder="Conduta realizada hoje, exercícios prescritos, orientações para casa, plano para próxima visita..."
                            className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      {/* Progress Footer */}
                      <div className="px-3 sm:px-4 py-2 sm:py-3 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-2">
                        <span className="text-[10px] sm:text-xs text-muted-foreground"><span className="hidden xs:inline">Preenchimento da Evolução</span><span className="xs:hidden">Progresso</span></span>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={
                              ((wordCount.subjective >= 10 ? 1 : 0) +
                                (wordCount.objective >= 10 ? 1 : 0) +
                                (wordCount.assessment >= 10 ? 1 : 0) +
                                (wordCount.plan >= 10 ? 1 : 0)) / 4 * 100
                            }
                            className="h-1.5 w-16 sm:w-24"
                          />
                          <span className="text-[10px] sm:text-xs font-medium">
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

                  {/* Sessão de Imagens Integrada na aba SOAP - Estilizada */}
                  {patientId && (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                          Fotos e Anexos da Sessão
                        </h4>
                      </div>
                      <div className="bg-muted/10 rounded-xl p-1 border border-dashed border-border/60">
                        <SessionImageUpload
                          patientId={patientId}
                          soapRecordId={currentSoapRecordId}
                          maxFiles={5}
                        />
                      </div>
                    </div>
                  )}

                  {/* Formulário de Medições Integrado */}
                  {showInsights && patientId && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Medições e Testes
                      </h3>

                      {/* Alertas de Medições Obrigatórias */}
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

                      <MeasurementForm
                        patientId={patientId}
                        soapRecordId={currentSoapRecordId}
                        requiredMeasurements={requiredMeasurements}
                      />

                      {/* Gráficos de Medições - Lazy Loaded */}
                      {Object.keys(measurementsByType).length > 0 && (
                        <div className="mt-4">
                          <Suspense fallback={<LoadingSkeleton type="card" />}>
                            <LazyMeasurementCharts measurementsByType={measurementsByType} />
                          </Suspense>
                        </div>
                      )}
                    </div>
                  )}


                  {/* Resumo rápido das metas */}
                  {
                    goals.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Metas ({goals.filter(g => g.status === 'concluido').length}/{goals.length})
                        </h4>
                        <div className="space-y-1">
                          {goals.slice(0, 3).map(goal => (
                            <div
                              key={goal.id}
                              className={`p-2 rounded-lg border text-[10px] ${goal.status === 'concluido'
                                ? 'bg-green-500/5 border-green-500/20'
                                : goal.status === 'em_andamento'
                                  ? 'bg-blue-500/5 border-blue-500/20'
                                  : 'bg-muted/30 border-border/50'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate flex-1">{goal.goal_title}</span>
                                <Badge
                                  variant={goal.status === 'concluido' ? 'default' : 'outline'}
                                  className="ml-1 text-[8px] px-1 py-0 h-4 scale-75 origin-right"
                                >
                                  {goal.status === 'concluido' ? 'OK' : goal.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                </div >
              </div>
            </TabsContent >

            <TabsContent value="history" className="mt-6">
              {/* Nova linha do tempo de evolução */}
              {patientId && (
                <div className="mb-6">
                  <EvolutionTimeline patientId={patientId} showFilters />
                </div>
              )}

              {/* Upload de imagens da sessão */}
              {patientId && (
                <div className="mb-6">
                  <SessionImageUpload
                    patientId={patientId}
                    soapRecordId={currentSoapRecordId}
                    maxFiles={5}
                  />
                </div>
              )}

              {/* Coluna Lateral antiga, agora em aba separada ou abaixo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Sugestões de Relatório */}
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 space-y-6">
                  <MedicalReportSuggestions patientId={patientId || ''} />
                </div>
                {/* Cirurgias */}
                <SurgeryTimeline surgeries={surgeries} />

                {/* Objetivos */}
                <GoalsTracker goals={goals} />

                {/* Patologias */}
                <PathologyStatus pathologies={pathologies} />

                {/* Evoluções Anteriores - Melhorado */}
                {previousEvolutions.length > 0 && (
                  <Card className="md:col-span-2 lg:col-span-2 xl:col-span-3 shadow-sm hover:shadow-md transition-shadow">
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

            <TabsContent value="measurements" className="mt-6">
              <MeasurementCharts measurementsByType={measurementsByType} />
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <Suspense fallback={<LoadingSkeleton type="card" />}>
                <LazyTreatmentAssistant
                  patientId={patientId!}
                  patientName={PatientHelpers.getName(patient)}
                  onApplyToSoap={(field, content) => {
                    // Apply the AI suggestion to the specified SOAP field
                    if (field === 'subjective') setSubjective(prev => prev + content);
                    if (field === 'objective') setObjective(prev => prev + content);
                    if (field === 'assessment') setAssessment(prev => prev + content);
                    if (field === 'plan') setPlan(prev => prev + content);
                  }}
                />
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
          </Tabs >
        </div >

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
