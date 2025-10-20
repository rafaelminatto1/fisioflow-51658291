import React, { useState, useMemo } from 'react';
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
  Stethoscope
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
import { MeasurementForm } from '@/components/evolution/MeasurementForm';
import { SurgeryTimeline } from '@/components/evolution/SurgeryTimeline';
import { GoalsTracker } from '@/components/evolution/GoalsTracker';
import { PathologyStatus } from '@/components/evolution/PathologyStatus';
import { MeasurementCharts } from '@/components/evolution/MeasurementCharts';

const PatientEvolution = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentSoapRecordId, setCurrentSoapRecordId] = useState<string | undefined>();
  
  // Estados do formulário SOAP
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Buscar dados do agendamento
  const { data: appointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(*)')
        .eq('id', appointmentId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!appointmentId
  });

  const patientId = appointment?.patient_id;

  // Buscar informações do paciente
  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*, profiles(*)')
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!patientId
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

  if (!appointment || !patient) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando dados do paciente...</p>
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
              <Button
                onClick={handleSave}
                size="lg"
                disabled={createSoapRecord.isPending}
                className="shadow-lg hover:shadow-xl transition-all hover:scale-105 flex-shrink-0"
              >
                <Save className="h-5 w-5 mr-2" />
                {createSoapRecord.isPending ? 'Salvando...' : 'Salvar Evolução'}
              </Button>
            </div>
          </div>
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Tempo de Tratamento</p>
                  <p className="text-xl font-bold truncate">{treatmentDuration.split(' ')[1] || treatmentDuration}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                  <Stethoscope className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Sessões Anteriores</p>
                  <p className="text-xl font-bold">{previousEvolutions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                  <User className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Idade</p>
                  <p className="text-xl font-bold">
                    {patient.birth_date
                      ? `${Math.floor((new Date().getTime() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} anos`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Medições Obrigatórias</p>
                  <p className="text-xl font-bold">{requiredMeasurements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
      </div>
    </MainLayout>
  );
};

export default PatientEvolution;
