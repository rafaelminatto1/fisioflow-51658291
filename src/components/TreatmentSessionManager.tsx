import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Edit,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  BarChart3
} from 'lucide-react';
import { useTreatmentSessions, TreatmentSession, SessionExercise, PatientTimeline } from '@/hooks/useTreatmentSessions';
import { usePatients } from '@/hooks/usePatients';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface TreatmentSessionManagerProps {
  selectedPatientId?: string;
}

export default function TreatmentSessionManager({ selectedPatientId }: TreatmentSessionManagerProps) {
  const {
    sessions,
    loading,
    createSession,
    updateSession,
    deleteSession,
    fetchSessionsByPatient,
    calculateSessionMetrics,
    getPatientTimeline
  } = useTreatmentSessions();
  
  const { patients } = usePatients();
  const [selectedPatient, setSelectedPatient] = useState(selectedPatientId || '');
  const [patientSessions, setPatientSessions] = useState<TreatmentSession[]>([]);
  const [patientTimeline, setPatientTimeline] = useState<PatientTimeline[]>([]);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TreatmentSession | null>(null);
  const [activeTab, setActiveTab] = useState('sessions');

  // New session form state
  const [newSession, setNewSession] = useState({
    patient_id: selectedPatientId || '',
    session_date: new Date(),
    session_type: 'treatment' as const,
    duration_minutes: 60,
    pain_level_before: 5,
    pain_level_after: 5,
    functional_score_before: 50,
    functional_score_after: 50,
    observations: '',
    next_session_date: undefined as Date | undefined,
    exercises: [] as SessionExercise[]
  });

  // Load patient sessions when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient);
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatientId) {
      setSelectedPatient(selectedPatientId);
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
      console.error('Erro ao carregar dados do paciente:', error);
    }
  };

  const handleCreateSession = async () => {
    try {
      const sessionData = {
        ...newSession,
        therapist_id: 'current-user-id', // TODO: Get from auth context
        session_date: newSession.session_date.toISOString(),
        next_session_date: newSession.next_session_date?.toISOString(),
        exercises_performed: newSession.exercises,
        status: 'completed' as const
      };

      await createSession(sessionData);
      setIsNewSessionOpen(false);
      resetNewSessionForm();
      if (selectedPatient) {
        loadPatientData(selectedPatient);
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
    }
  };

  const resetNewSessionForm = () => {
    setNewSession({
      patient_id: selectedPatient,
      session_date: new Date(),
      session_type: 'treatment',
      duration_minutes: 60,
      pain_level_before: 5,
      pain_level_after: 5,
      functional_score_before: 50,
      functional_score_after: 50,
      observations: '',
      next_session_date: undefined,
      exercises: []
    });
  };

  const addExercise = () => {
    const newExercise: SessionExercise = {
      id: `temp-${Date.now()}`,
      exercise_name: '',
      sets_planned: 3,
      sets_completed: 3,
      reps_planned: 10,
      reps_completed: 10,
      difficulty_level: 5,
      patient_feedback: '',
      therapist_notes: ''
    };
    setNewSession(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
  };

  const updateExercise = (index: number, updates: Partial<SessionExercise>) => {
    setNewSession(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === index ? { ...ex, ...updates } : ex)
    }));
  };

  const removeExercise = (index: number) => {
    setNewSession(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Concluída', variant: 'default' as const, icon: CheckCircle },
      scheduled: { label: 'Agendada', variant: 'secondary' as const, icon: Clock },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, icon: XCircle },
      no_show: { label: 'Faltou', variant: 'outline' as const, icon: AlertCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getSessionTypeLabel = (type: string) => {
    const types = {
      consultation: 'Consulta',
      treatment: 'Tratamento',
      evaluation: 'Avaliação',
      follow_up: 'Acompanhamento'
    };
    return types[type as keyof typeof types] || type;
  };

  const chartData = patientTimeline.map(item => ({
    date: format(new Date(item.session_date), 'dd/MM', { locale: ptBR }),
    dor: item.pain_level,
    funcionalidade: item.functional_score
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
      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Sessões de Tratamento
          </CardTitle>
          <CardDescription>
            Gerencie e acompanhe as sessões de tratamento dos pacientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="patient-select">Selecionar Paciente</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPatient && (
              <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Sessão
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Sessão de Tratamento</DialogTitle>
                    <DialogDescription>
                      Registre uma nova sessão de tratamento para o paciente
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Session Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="session-date">Data da Sessão</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(newSession.session_date, 'dd/MM/yyyy', { locale: ptBR })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newSession.session_date}
                              onSelect={(date) => date && setNewSession(prev => ({ ...prev, session_date: date }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label htmlFor="session-type">Tipo de Sessão</Label>
                        <Select 
                          value={newSession.session_type} 
                          onValueChange={(value: any) => setNewSession(prev => ({ ...prev, session_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultation">Consulta</SelectItem>
                            <SelectItem value="treatment">Tratamento</SelectItem>
                            <SelectItem value="evaluation">Avaliação</SelectItem>
                            <SelectItem value="follow_up">Acompanhamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="duration">Duração (minutos)</Label>
                        <Input
                          type="number"
                          value={newSession.duration_minutes}
                          onChange={(e) => setNewSession(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                          min="15"
                          max="180"
                        />
                      </div>
                    </div>

                    {/* Pain and Functional Scores */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="pain-before">Dor Antes (0-10)</Label>
                        <Input
                          type="number"
                          value={newSession.pain_level_before}
                          onChange={(e) => setNewSession(prev => ({ ...prev, pain_level_before: parseInt(e.target.value) }))}
                          min="0"
                          max="10"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="pain-after">Dor Depois (0-10)</Label>
                        <Input
                          type="number"
                          value={newSession.pain_level_after}
                          onChange={(e) => setNewSession(prev => ({ ...prev, pain_level_after: parseInt(e.target.value) }))}
                          min="0"
                          max="10"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="func-before">Funcionalidade Antes (0-100)</Label>
                        <Input
                          type="number"
                          value={newSession.functional_score_before}
                          onChange={(e) => setNewSession(prev => ({ ...prev, functional_score_before: parseInt(e.target.value) }))}
                          min="0"
                          max="100"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="func-after">Funcionalidade Depois (0-100)</Label>
                        <Input
                          type="number"
                          value={newSession.functional_score_after}
                          onChange={(e) => setNewSession(prev => ({ ...prev, functional_score_after: parseInt(e.target.value) }))}
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>

                    {/* Exercises */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <Label>Exercícios Realizados</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Exercício
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {newSession.exercises.map((exercise, index) => (
                          <Card key={index}>
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-3">
                                  <Label>Nome do Exercício</Label>
                                  <Input
                                    value={exercise.exercise_name}
                                    onChange={(e) => updateExercise(index, { exercise_name: e.target.value })}
                                    placeholder="Ex: Agachamento"
                                  />
                                </div>
                                
                                <div>
                                  <Label>Séries Planejadas/Realizadas</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      value={exercise.sets_planned}
                                      onChange={(e) => updateExercise(index, { sets_planned: parseInt(e.target.value) })}
                                      min="1"
                                    />
                                    <Input
                                      type="number"
                                      value={exercise.sets_completed}
                                      onChange={(e) => updateExercise(index, { sets_completed: parseInt(e.target.value) })}
                                      min="0"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Repetições Planejadas/Realizadas</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      value={exercise.reps_planned}
                                      onChange={(e) => updateExercise(index, { reps_planned: parseInt(e.target.value) })}
                                      min="1"
                                    />
                                    <Input
                                      type="number"
                                      value={exercise.reps_completed}
                                      onChange={(e) => updateExercise(index, { reps_completed: parseInt(e.target.value) })}
                                      min="0"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Dificuldade (1-10)</Label>
                                  <Input
                                    type="number"
                                    value={exercise.difficulty_level}
                                    onChange={(e) => updateExercise(index, { difficulty_level: parseInt(e.target.value) })}
                                    min="1"
                                    max="10"
                                  />
                                </div>
                                
                                <div className="md:col-span-2">
                                  <Label>Feedback do Paciente</Label>
                                  <Input
                                    value={exercise.patient_feedback}
                                    onChange={(e) => updateExercise(index, { patient_feedback: e.target.value })}
                                    placeholder="Como o paciente se sentiu"
                                  />
                                </div>
                                
                                <div className="md:col-span-3">
                                  <Label>Observações do Terapeuta</Label>
                                  <Textarea
                                    value={exercise.therapist_notes}
                                    onChange={(e) => updateExercise(index, { therapist_notes: e.target.value })}
                                    placeholder="Observações sobre a execução"
                                    rows={2}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end mt-4">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeExercise(index)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Observations */}
                    <div>
                      <Label htmlFor="observations">Observações Gerais</Label>
                      <Textarea
                        value={newSession.observations}
                        onChange={(e) => setNewSession(prev => ({ ...prev, observations: e.target.value }))}
                        placeholder="Observações sobre a sessão"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateSession}>
                        Salvar Sessão
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patient Sessions Content */}
      {selectedPatient && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-4">
            <div className="grid gap-4">
              {patientSessions.map(session => {
                const metrics = calculateSessionMetrics(session);
                return (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {getSessionTypeLabel(session.session_type)} - {format(new Date(session.session_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </CardTitle>
                          <CardDescription>
                            Duração: {session.duration_minutes} min
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(session.status)}
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {session.pain_level_after}
                          </div>
                          <div className="text-sm text-muted-foreground">Nível de Dor</div>
                          {metrics.pain_improvement !== 0 && (
                            <div className={`text-xs flex items-center justify-center gap-1 ${
                              metrics.pain_improvement > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {metrics.pain_improvement > 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <TrendingUp className="h-3 w-3" />
                              )}
                              {Math.abs(metrics.pain_improvement)}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {session.functional_score_after}%
                          </div>
                          <div className="text-sm text-muted-foreground">Funcionalidade</div>
                          {metrics.functional_improvement !== 0 && (
                            <div className={`text-xs flex items-center justify-center gap-1 ${
                              metrics.functional_improvement > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {metrics.functional_improvement > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {Math.abs(metrics.functional_improvement)}%
                            </div>
                          )}
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {session.exercises_performed?.length || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Exercícios</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {metrics.completion_rate}%
                          </div>
                          <div className="text-sm text-muted-foreground">Taxa de Conclusão</div>
                        </div>
                      </div>
                      
                      {session.observations && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Observações:</h4>
                          <p className="text-sm text-muted-foreground">{session.observations}</p>
                        </div>
                      )}
                      
                      {session.exercises_performed && session.exercises_performed.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Exercícios Realizados:</h4>
                          <div className="space-y-2">
                            {session.exercises_performed.map((exercise, index) => (
                              <div key={index} className="bg-muted p-3 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-medium">{exercise.exercise_name}</h5>
                                    <p className="text-sm text-muted-foreground">
                                      {exercise.sets_completed}/{exercise.sets_planned} séries × {exercise.reps_completed}/{exercise.reps_planned} repetições
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    Dificuldade {exercise.difficulty_level}/10
                                  </Badge>
                                </div>
                                {exercise.patient_feedback && (
                                  <p className="text-sm mt-2">
                                    <strong>Feedback:</strong> {exercise.patient_feedback}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Timeline de Progresso
                </CardTitle>
                <CardDescription>
                  Evolução do paciente ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="dor" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          name="Nível de Dor"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="funcionalidade" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Funcionalidade"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma sessão registrada ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics do Paciente
                </CardTitle>
                <CardDescription>
                  Métricas e estatísticas detalhadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patientSessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary">
                            {patientSessions.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Total de Sessões</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {patientSessions.reduce((acc, session) => 
                              acc + (session.duration_minutes || 0), 0
                            )} min
                          </div>
                          <div className="text-sm text-muted-foreground">Tempo Total</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">
                            {Math.round(
                              patientSessions.reduce((acc, session) => {
                                const metrics = calculateSessionMetrics(session);
                                return acc + metrics.completion_rate;
                              }, 0) / patientSessions.length
                            )}%
                          </div>
                          <div className="text-sm text-muted-foreground">Taxa Média de Conclusão</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma sessão para analisar.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}