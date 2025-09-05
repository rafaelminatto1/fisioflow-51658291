import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useTreatmentSessions, TreatmentSession } from '@/hooks/useTreatmentSessions';
import { useExercisePlans } from '@/hooks/useExercisePlans';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Activity, 
  TrendingUp, 
  Target, 
  Clock, 
  User, 
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TreatmentSessionManagerProps {
  selectedPatientId?: string;
}

interface NewSessionForm {
  patient_id?: string;
  observations: string;
  pain_level: number;
  evolution_notes: string;
  duration_minutes: number;
  techniques_used: string[];
  equipment_used: string[];
  patient_response: string;
  homework_assigned: string;
  next_session_goals: string;
  session_date: string;
  session_type: string;
  pain_level_before: number;
  pain_level_after: number;
  functional_score_before: number;
  functional_score_after: number;
  exercises: any[];
}

export default function TreatmentSessionManager({ selectedPatientId }: TreatmentSessionManagerProps) {
  const {
    sessions,
    loading,
    createSession,
    updateSession,
    deleteSession,
    fetchSessionsByPatient,
    getPatientTimeline
  } = useTreatmentSessions();

  const { patients } = useData();
  const { exercisePlans } = useExercisePlans();
  const { toast } = useToast();

  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [patientSessions, setPatientSessions] = useState<TreatmentSession[]>([]);
  const [patientTimeline, setPatientTimeline] = useState<any[]>([]);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');

  const [newSessionForm, setNewSessionForm] = useState<NewSessionForm>({
    patient_id: selectedPatientId || '',
    observations: '',
    pain_level: 0,
    evolution_notes: '',
    duration_minutes: 60,
    techniques_used: [],
    equipment_used: [],
    patient_response: '',
    homework_assigned: '',
    next_session_goals: '',
    session_date: new Date().toISOString().split('T')[0],
    session_type: 'regular',
    pain_level_before: 0,
    pain_level_after: 0,
    functional_score_before: 0,
    functional_score_after: 0,
    exercises: []
  });

  // Load patient data when selectedPatient changes
  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient);
    }
  }, [selectedPatient]);

  // Set initial patient if provided via props
  useEffect(() => {
    if (selectedPatientId) {
      setSelectedPatient(selectedPatientId);
      setNewSessionForm(prev => ({ ...prev, patient_id: selectedPatientId }));
    }
  }, [selectedPatientId]);

  const loadPatientData = async (patientId: string) => {
    try {
      const [sessionsData, timelineData] = await Promise.all([
        fetchSessionsByPatient(patientId),
        getPatientTimeline(patientId)
      ]);
      
      setPatientSessions(sessionsData);
      setPatientTimeline(timelineData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do paciente",
        variant: "destructive",
      });
    }
  };

  const handleCreateSession = async () => {
    try {
      if (!newSessionForm.patient_id) {
        toast({
          title: "Erro",
          description: "Selecione um paciente",
          variant: "destructive",
        });
        return;
      }

      await createSession({
        patient_id: newSessionForm.patient_id,
        observations: newSessionForm.observations,
        pain_level: newSessionForm.pain_level,
        evolution_notes: newSessionForm.evolution_notes,
        next_session_goals: newSessionForm.next_session_goals,
        duration_minutes: newSessionForm.duration_minutes,
        techniques_used: newSessionForm.techniques_used,
        equipment_used: newSessionForm.equipment_used,
        patient_response: newSessionForm.patient_response,
        homework_assigned: newSessionForm.homework_assigned,
        created_by: '' // Will be set by the hook
      });

      resetNewSessionForm();
      setIsNewSessionOpen(false);
      
      if (selectedPatient === newSessionForm.patient_id) {
        loadPatientData(selectedPatient);
      }

      toast({
        title: "Sucesso",
        description: "Sessão de tratamento criada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão de tratamento",
        variant: "destructive",
      });
    }
  };

  const resetNewSessionForm = () => {
    setNewSessionForm({
      patient_id: selectedPatientId || '',
      observations: '',
      pain_level: 0,
      evolution_notes: '',
      duration_minutes: 60,
      techniques_used: [],
      equipment_used: [],
      patient_response: '',
      homework_assigned: '',
      next_session_goals: '',
      session_date: new Date().toISOString().split('T')[0],
      session_type: 'regular',
      pain_level_before: 0,
      pain_level_after: 0,
      functional_score_before: 0,
      functional_score_after: 0,
      exercises: []
    });
  };

  // Exercise management functions
  const addExercise = () => {
    const newExercise = {
      id: Date.now(),
      name: '',
      sets: 1,
      reps: 10,
      duration: 0,
      notes: ''
    };
    setNewSessionForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
  };

  const updateExercise = (index: number, field: string, value: any) => {
    setNewSessionForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const removeExercise = (index: number) => {
    setNewSessionForm(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'completed': { icon: CheckCircle, label: 'Concluída', className: 'border-green-500' },
      'in_progress': { icon: Clock, label: 'Em Andamento', className: 'border-yellow-500' },
      'cancelled': { icon: XCircle, label: 'Cancelada', className: 'border-red-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;
    const Icon = config.icon;

    return {
      element: (
        <Badge variant="outline" className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      ),
      className: config.className
    };
  };

  const getSessionTypeLabel = (type: string) => {
    const types = {
      'initial': 'Avaliação Inicial',
      'follow_up': 'Acompanhamento',
      'discharge': 'Alta',
      'regular': 'Sessão Regular'
    };
    return types[type as keyof typeof types] || 'Sessão Regular';
  };

  // Prepare chart data from timeline
  const chartData = patientTimeline.map(entry => ({
    date: format(new Date(entry.session_date), 'dd/MM'),
    pain: entry.pain_level,
    function: entry.functional_score
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando sessões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Patient Selection and New Session Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Label htmlFor="patient-select">Selecionar Paciente</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um paciente..." />
              </SelectTrigger>
              <SelectContent>
                {patients?.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Sessão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nova Sessão de Tratamento</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Patient and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-patient">Paciente</Label>
                  <Select value={newSessionForm.patient_id} onValueChange={(value) => 
                    setNewSessionForm(prev => ({ ...prev, patient_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-date">Data da Sessão</Label>
                  <Input
                    type="date"
                    value={newSessionForm.session_date}
                    onChange={(e) => setNewSessionForm(prev => ({ ...prev, session_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-type">Tipo de Sessão</Label>
                  <Select value={newSessionForm.session_type} onValueChange={(value) => 
                    setNewSessionForm(prev => ({ ...prev, session_type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Avaliação Inicial</SelectItem>
                      <SelectItem value="regular">Sessão Regular</SelectItem>
                      <SelectItem value="follow_up">Acompanhamento</SelectItem>
                      <SelectItem value="discharge">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    type="number"
                    value={newSessionForm.duration_minutes}
                    onChange={(e) => setNewSessionForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    min="15"
                    max="180"
                  />
                </div>
              </div>

              {/* Pain Level Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Avaliação da Dor</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nível de Dor - Início: {newSessionForm.pain_level_before}/10</Label>
                    <Slider
                      value={[newSessionForm.pain_level_before]}
                      onValueChange={(value) => setNewSessionForm(prev => ({ ...prev, pain_level_before: value[0] }))}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nível de Dor - Final: {newSessionForm.pain_level_after}/10</Label>
                    <Slider
                      value={[newSessionForm.pain_level_after]}
                      onValueChange={(value) => setNewSessionForm(prev => ({ ...prev, pain_level_after: value[0] }))}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Functional Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Avaliação Funcional</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Score Funcional - Início: {newSessionForm.functional_score_before}/100</Label>
                    <Slider
                      value={[newSessionForm.functional_score_before]}
                      onValueChange={(value) => setNewSessionForm(prev => ({ ...prev, functional_score_before: value[0] }))}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Score Funcional - Final: {newSessionForm.functional_score_after}/100</Label>
                    <Slider
                      value={[newSessionForm.functional_score_after]}
                      onValueChange={(value) => setNewSessionForm(prev => ({ ...prev, functional_score_after: value[0] }))}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Exercises Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Exercícios Realizados</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Exercício
                  </Button>
                </div>

                {newSessionForm.exercises.map((exercise, index) => (
                  <Card key={exercise.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Nome do Exercício</Label>
                        <Input
                          value={exercise.name}
                          onChange={(e) => updateExercise(index, 'name', e.target.value)}
                          placeholder="Nome do exercício"
                        />
                      </div>
                      <div>
                        <Label>Séries</Label>
                        <Input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Repetições</Label>
                        <Input
                          type="number"
                          value={exercise.reps}
                          onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => removeExercise(index)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Observations and Notes */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="observations">Observações da Sessão</Label>
                  <Textarea
                    value={newSessionForm.observations}
                    onChange={(e) => setNewSessionForm(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Descreva as observações da sessão..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evolution">Evolução e Progresso</Label>
                  <Textarea
                    value={newSessionForm.evolution_notes}
                    onChange={(e) => setNewSessionForm(prev => ({ ...prev, evolution_notes: e.target.value }))}
                    placeholder="Descreva a evolução do paciente..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next-goals">Objetivos para Próxima Sessão</Label>
                  <Textarea
                    value={newSessionForm.next_session_goals}
                    onChange={(e) => setNewSessionForm(prev => ({ ...prev, next_session_goals: e.target.value }))}
                    placeholder="Defina os objetivos para a próxima sessão..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSession}>
                  Registrar Sessão
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content with Tabs */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {patients?.find(p => p.id === selectedPatient)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sessions">Sessões</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="sessions" className="space-y-4">
                <div className="space-y-4">
                  {patientSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhuma sessão registrada para este paciente.</p>
                    </div>
                  ) : (
                    patientSessions.map((session) => (
                      <div key={session.id} className="session-item p-4 bg-card rounded-lg border-l-4 border-primary">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">Sessão - {format(new Date(session.created_at), 'dd/MM/yyyy')}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">Concluída</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-muted-foreground">Duração: {session.duration_minutes || 60}min</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Activity className="h-4 w-4 text-red-500" />
                              <span className="text-sm font-medium">Nível de Dor</span>
                            </div>
                            <span className="text-xl font-bold">{session.pain_level}/10</span>
                          </div>
                          
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">Progresso</span>
                            </div>
                            <span className="text-xl font-bold">Bom</span>
                          </div>
                          
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium">Técnicas</span>
                            </div>
                            <span className="text-xl font-bold">
                              {session.techniques_used ? session.techniques_used.length : 0}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-sm">Observações:</span>
                            <p className="text-sm text-muted-foreground mt-1">{session.observations}</p>
                          </div>
                          
                          {session.techniques_used && session.techniques_used.length > 0 && (
                            <div>
                              <span className="font-medium text-sm">Técnicas utilizadas:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {session.techniques_used.map((technique: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {technique}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                {chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="pain" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          name="Nível de Dor"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="function" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Score Funcional"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Dados insuficientes para gerar timeline.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{patientSessions.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Sessões registradas
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Dor Média</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {patientSessions.length > 0 
                          ? (patientSessions.reduce((sum, s) => sum + s.pain_level, 0) / patientSessions.length).toFixed(1)
                          : '0'
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Escala 0-10
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Duração Total</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {patientSessions.reduce((sum, s) => sum + (s.duration_minutes || 60), 0)}min
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tempo total de tratamento
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}