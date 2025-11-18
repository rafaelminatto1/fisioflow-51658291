import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Activity
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
import { PatientGamification } from '@/components/gamification/PatientGamification';
import { WhatsAppIntegration } from '@/components/whatsapp/WhatsAppIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionWizard, WizardStep } from '@/components/evolution/SessionWizard';
import { SessionTimer } from '@/components/evolution/SessionTimer';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { ApplyTemplateModal } from '@/components/exercises/ApplyTemplateModal';

const PatientEvolution = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentSoapRecordId, setCurrentSoapRecordId] = useState<string | undefined>();
  const [sessionStartTime] = useState(new Date());
  const [currentWizardStep, setCurrentWizardStep] = useState('subjective');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  
  // Estados do formulário SOAP
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  const { completeAppointment, isCompleting } = useAppointmentActions();

  // Buscar dados do agendamento do Supabase
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) throw new Error('ID do agendamento não fornecido');
      
      const { data, error } = await supabase
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
        .maybeSingle();
      
      if (error) {
        logger.error('Erro ao buscar agendamento', error, 'PatientEvolution');
        throw error;
      }
      
      if (!data) {
        throw new Error('Agendamento não encontrado');
      }
      
      return data;
    },
    enabled: !!appointmentId,
    retry: 1
  });

  const patientId = appointment?.patient_id;

  // Buscar informações do paciente do Supabase
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) throw new Error('ID do paciente não fornecido');
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();
      
      if (error) {
        logger.error('Erro ao buscar paciente', error, 'PatientEvolution');
        throw error;
      }
      
      if (!data) {
        throw new Error('Paciente não encontrado');
      }
      
      return data;
    },
    enabled: !!patientId,
    retry: 1
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
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-lg border">
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('/schedule')}
                  className="mt-1 hover:scale-105 transition-transform flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-3xl font-bold tracking-tight truncate">Evolução do Paciente</h1>
                      <p className="text-muted-foreground flex items-center gap-2 mt-1 truncate">
                        <User className="h-4 w-4 flex-shrink-0" />
                        {patient.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(appointment.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Badge>
                    {patient.phone && (
                      <Badge variant="outline" className="gap-1">
                        <Phone className="h-3 w-3" />
                        {patient.phone}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      Tratamento iniciado {treatmentDuration}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Button
                  onClick={() => setShowApplyTemplate(true)}
                  size="lg"
                  variant="secondary"
                  className="shadow hover:shadow-lg transition-all"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Aplicar Template
                </Button>
                <SessionTimer startTime={sessionStartTime} />
                <Button
                  onClick={handleSave}
                  size="lg"
                  variant="outline"
                  disabled={createSoapRecord.isPending}
                  className="shadow hover:shadow-lg transition-all"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createSoapRecord.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  onClick={handleCompleteSession}
                  size="lg"
                  disabled={createSoapRecord.isPending || isCompleting}
                  className="shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-primary to-primary/80"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {isCompleting ? 'Finalizando...' : 'Concluir Atendimento'}
                </Button>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-0" />
        </div>

        {/* Wizard Progress */}
        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Progresso do Atendimento</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                className="text-xs"
              >
                Auto-save: {autoSaveEnabled ? 'Ativo' : 'Inativo'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <SessionWizard
              steps={wizardSteps}
              currentStep={currentWizardStep}
              onStepClick={setCurrentWizardStep}
            />
          </CardContent>
        </Card>

        {/* Tabs Navigation */}
        <Tabs defaultValue="soap" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="soap">SOAP</TabsTrigger>
            <TabsTrigger value="ai">🤖 IA</TabsTrigger>
            <TabsTrigger value="gamification">🎮 Gamificação</TabsTrigger>
            <TabsTrigger value="whatsapp">💬 WhatsApp</TabsTrigger>
            <TabsTrigger value="measurements">📊 Medições</TabsTrigger>
          </TabsList>

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
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="subjective" className="text-base font-semibold">Subjetivo (S)</Label>
                  <Textarea
                    id="subjective"
                    value={subjective}
                    onChange={(e) => setSubjective(e.target.value)}
                    placeholder="Queixa principal do paciente, relato de dor, desconforto..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objective" className="text-base font-semibold">Objetivo (O)</Label>
                  <Textarea
                    id="objective"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Observações clínicas, testes realizados, medições..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment" className="text-base font-semibold">Avaliação (A)</Label>
                  <Textarea
                    id="assessment"
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="Diagnóstico fisioterapêutico, análise da evolução..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan" className="text-base font-semibold">Plano (P)</Label>
                  <Textarea
                    id="plan"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Conduta, exercícios prescritos, orientações..."
                    rows={4}
                    className="resize-none"
                  />
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

            {/* Gráficos de Medições */}
            <MeasurementCharts measurementsByType={measurementsByType} />

            {/* Mapa de Dor */}
            {patientId && (
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-red-50/50 to-orange-100/50 dark:from-red-950/20 dark:to-orange-900/20">
                  <CardTitle className="text-lg">Mapa de Dor</CardTitle>
                  <CardDescription>Registre e acompanhe a evolução da dor do paciente</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <PainMapManager 
                    patientId={patientId}
                    sessionId={currentSoapRecordId}
                    appointmentId={appointmentId}
                  />
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

            {/* Evoluções Anteriores */}
            {previousEvolutions.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/20">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Evoluções Anteriores
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-3">
                      {previousEvolutions.map((evolution) => (
                        <div key={evolution.id} className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              📅 {format(new Date(evolution.record_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPreviousEvolution(evolution)}
                              className="hover:bg-primary/10"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          {evolution.subjective && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              <strong>S:</strong> {evolution.subjective}
                            </p>
                          )}
                          {evolution.plan && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              <strong>P:</strong> {evolution.plan}
                            </p>
                          )}
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
            <TreatmentAssistant patientId={patientId!} patientName={patient.name} />
          </TabsContent>

          <TabsContent value="gamification" className="mt-6">
            <PatientGamification patientId={patientId!} />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6">
            <WhatsAppIntegration patientId={patientId!} patientPhone={patient.phone} />
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
