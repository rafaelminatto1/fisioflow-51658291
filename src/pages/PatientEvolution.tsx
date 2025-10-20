import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Target,
  Activity,
  TrendingUp,
  FileText,
  Copy,
  Save,
  User
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
import { MeasurementForm } from '@/components/evolution/MeasurementForm';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const PatientEvolution = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('evolucao');
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
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/schedule')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Evolução do Paciente</h1>
              <p className="text-muted-foreground">
                {patient.name} • {format(new Date(appointment.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} size="lg" disabled={createSoapRecord.isPending}>
            <Save className="h-5 w-5 mr-2" />
            {createSoapRecord.isPending ? 'Salvando...' : 'Salvar Evolução'}
          </Button>
        </div>

        {/* Informações do Paciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tempo de Tratamento</p>
                <p className="text-lg font-semibold">{treatmentDuration}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                <p className="text-lg font-semibold">
                  {patient.birth_date ? format(new Date(patient.birth_date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="text-lg font-semibold">{patient.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="default">{patient.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal - Evolução SOAP */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro SOAP</CardTitle>
                <CardDescription>
                  Preencha os campos abaixo para registrar a evolução do paciente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subjective">Subjetivo (S)</Label>
                  <Textarea
                    id="subjective"
                    value={subjective}
                    onChange={(e) => setSubjective(e.target.value)}
                    placeholder="Queixa principal do paciente, relato de dor, desconforto..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objective">Objetivo (O)</Label>
                  <Textarea
                    id="objective"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Observações clínicas, testes realizados, medições..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment">Avaliação (A)</Label>
                  <Textarea
                    id="assessment"
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="Diagnóstico fisioterapêutico, análise da evolução..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Plano (P)</Label>
                  <Textarea
                    id="plan"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Conduta, exercícios prescritos, orientações..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Alertas de Medições Obrigatórias */}
            {requiredMeasurements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Medições Obrigatórias
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
          </div>

          {/* Coluna Lateral - Informações Complementares */}
          <div className="space-y-6">
            {/* Cirurgias */}
            {surgeries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Cirurgias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {surgeries.map((surgery) => {
                        const daysSinceSurgery = differenceInDays(
                          new Date(),
                          new Date(surgery.surgery_date)
                        );
                        return (
                          <div key={surgery.id} className="border-l-2 border-primary pl-3 py-2">
                            <p className="font-medium">{surgery.surgery_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(surgery.surgery_date), 'dd/MM/yyyy', { locale: ptBR })}
                              {' • '}
                              Há {daysSinceSurgery} dias
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {surgery.affected_side}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Objetivos */}
            {goals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Objetivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {goals.map((goal) => {
                        const daysUntilTarget = goal.target_date
                          ? differenceInDays(new Date(goal.target_date), new Date())
                          : null;
                        return (
                          <div key={goal.id} className="border-l-2 border-secondary pl-3 py-2">
                            <p className="font-medium">{goal.goal_title}</p>
                            {goal.target_date && daysUntilTarget !== null && (
                              <p className="text-sm text-muted-foreground">
                                {daysUntilTarget > 0
                                  ? `Faltam ${daysUntilTarget} dias`
                                  : daysUntilTarget === 0
                                  ? 'Hoje!'
                                  : `Atrasado ${Math.abs(daysUntilTarget)} dias`}
                              </p>
                            )}
                            <Badge
                              variant={
                                goal.status === 'concluido'
                                  ? 'default'
                                  : goal.status === 'em_andamento'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="mt-1"
                            >
                              {goal.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Patologias */}
            {pathologies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Patologias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pathologies.map((pathology) => (
                      <div key={pathology.id} className="flex items-center justify-between">
                        <span className="text-sm">{pathology.pathology_name}</span>
                        <Badge
                          variant={
                            pathology.status === 'tratada'
                              ? 'default'
                              : pathology.status === 'em_tratamento'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {pathology.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evoluções Anteriores */}
            {previousEvolutions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Evoluções Anteriores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {previousEvolutions.map((evolution) => (
                        <div key={evolution.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {format(new Date(evolution.record_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPreviousEvolution(evolution)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          {evolution.subjective && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {evolution.subjective}
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

        {/* Gráficos de Evolução */}
        {Object.keys(measurementsByType).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução de Medições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(measurementsByType)[0]}>
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(measurementsByType).length, 4)}, 1fr)` }}>
                  {Object.keys(measurementsByType).slice(0, 4).map((measurementName) => (
                    <TabsTrigger key={measurementName} value={measurementName}>
                      {measurementName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(measurementsByType).slice(0, 4).map(([measurementName, data]) => (
                  <TabsContent key={measurementName} value={measurementName} className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.slice().reverse()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          name={measurementName}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default PatientEvolution;
