import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain,
  Target,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Search,
  Users,
  Dumbbell,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowRight,
  Video,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data for smart exercise plans
const mockSmartPlans = [
  {
    id: '1',
    name: 'Plano Lombalgia - Maria Silva',
    description: 'Protocolo para fortalecimento e estabilização lombar',
    patientId: '1',
    condition: 'Lombalgia crônica',
    objectives: ['Reduzir dor', 'Fortalecer core', 'Melhorar postura'],
    status: 'Ativo' as const,
    exercises: [
      {
        exerciseId: '1',
        currentSets: 3,
        currentReps: 15,
        restTime: 60,
        progressionLevel: 3,
        notes: 'Paciente consegue executar com boa técnica',
        videoUrl: 'https://example.com/video1.mp4'
      }
    ],
    progressionRules: [
      {
        id: '1',
        triggerCondition: 'sessions_completed' as const,
        triggerValue: 3,
        action: 'increase_reps' as const,
        actionValue: 2,
        description: 'Aumentar 2 repetições após 3 sessões consecutivas'
      }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-15'),
    lastProgressionDate: new Date('2024-02-10')
  }
];

const mockProgressData = [
  {
    id: '1',
    patientId: '1',
    date: new Date('2024-02-15'),
    painLevel: 4,
    functionalScore: 75,
    exerciseCompliance: 85,
    notes: 'Boa evolução, paciente motivado',
    measurements: [
      { location: 'Flexão lombar', value: 45, unit: 'degrees' as const },
      { location: 'Força abdominal', value: 7, unit: 'score' as const }
    ],
    createdAt: new Date('2024-02-15')
  }
];

export function SmartExercisePlans() {
  const { patients, exercises, exercisePlans, addExercisePlan, patientProgress, addPatientProgress } = useData();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    patientId: '',
    condition: '',
    objectives: ['']
  });

  const [progressEntry, setProgressEntry] = useState({
    painLevel: 5,
    functionalScore: 50,
    exerciseCompliance: 100,
    notes: ''
  });

  const filteredPlans = exercisePlans.filter(plan => {
    const patient = patients.find(p => p.id === plan.patient_id);
    const matchesPatient = !selectedPatient || plan.patient_id === selectedPatient;
    const matchesSearch = !searchTerm || 
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesPatient && matchesSearch;
  });

  const handleCreatePlan = () => {
    if (!newPlan.name || !newPlan.patientId || !newPlan.condition) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Plano inteligente criado com sucesso!",
    });

    setNewPlan({
      name: '',
      description: '',
      patientId: '',
      condition: '',
      objectives: ['']
    });
    setIsNewPlanOpen(false);
  };

  const handleProgressEntry = () => {
    if (!selectedPatient) {
      toast({
        title: "Erro",
        description: "Selecione um paciente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Progresso registrado com sucesso!",
    });

    setProgressEntry({
      painLevel: 5,
      functionalScore: 50,
      exerciseCompliance: 100,
      notes: ''
    });
    setIsProgressOpen(false);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Ativo': 'bg-green-100 text-green-800',
      'Inativo': 'bg-gray-100 text-gray-800',
      'Concluído': 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPainLevelColor = (level: number) => {
    if (level <= 3) return 'text-green-600';
    if (level <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Planos Inteligentes</h1>
            <p className="text-muted-foreground">Exercícios personalizados com progressão automática</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isNewPlanOpen} onOpenChange={setIsNewPlanOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Brain className="w-4 h-4 mr-2" />
                  Criar Plano IA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Plano Inteligente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Paciente</label>
                      <Select value={newPlan.patientId} onValueChange={(value) => setNewPlan(prev => ({ ...prev, patientId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Condição Principal</label>
                      <Input 
                        value={newPlan.condition}
                        onChange={(e) => setNewPlan(prev => ({ ...prev, condition: e.target.value }))}
                        placeholder="Ex: Lombalgia crônica"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nome do Plano</label>
                    <Input 
                      value={newPlan.name}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Protocolo Lombalgia - João Silva"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descrição</label>
                    <Textarea 
                      value={newPlan.description}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva os objetivos e metodologia do plano..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Objetivos do Tratamento</label>
                    <div className="space-y-2">
                      {newPlan.objectives.map((objective, index) => (
                        <Input 
                          key={index}
                          value={objective}
                          onChange={(e) => {
                            const newObjectives = [...newPlan.objectives];
                            newObjectives[index] = e.target.value;
                            setNewPlan(prev => ({ ...prev, objectives: newObjectives }));
                          }}
                          placeholder="Ex: Reduzir dor lombar"
                        />
                      ))}
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setNewPlan(prev => ({ ...prev, objectives: [...prev.objectives, ''] }))}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Objetivo
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsNewPlanOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreatePlan}>
                      Criar Plano
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Registrar Progresso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Progresso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Paciente</label>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Nível de Dor (0-10)</label>
                      <Input 
                        type="number"
                        min="0"
                        max="10"
                        value={progressEntry.painLevel}
                        onChange={(e) => setProgressEntry(prev => ({ ...prev, painLevel: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Score Funcional (%)</label>
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={progressEntry.functionalScore}
                        onChange={(e) => setProgressEntry(prev => ({ ...prev, functionalScore: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Aderência (%)</label>
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={progressEntry.exerciseCompliance}
                        onChange={(e) => setProgressEntry(prev => ({ ...prev, exerciseCompliance: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Observações</label>
                    <Textarea 
                      value={progressEntry.notes}
                      onChange={(e) => setProgressEntry(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Evolução observada, dificuldades, conquistas..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsProgressOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleProgressEntry}>
                      Registrar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar planos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os pacientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os pacientes</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">Planos Ativos</TabsTrigger>
            <TabsTrigger value="progress">Progresso</TabsTrigger>
            <TabsTrigger value="analytics">Analytics IA</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            {filteredPlans.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum plano encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie planos inteligentes personalizados para seus pacientes.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredPlans.map((plan) => {
                  const patient = patients.find(p => p.id === plan.patientId);
                  const progressData = mockProgressData.find(p => p.patientId === plan.patientId);
                  
                  return (
                    <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Brain className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-xl">{plan.name}</CardTitle>
                              <CardDescription className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {patient?.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Target className="w-4 h-4" />
                                  {plan.condition}
                                </span>
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(plan.status)}>
                              {plan.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Play className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                        
                        {/* Objectives */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Objetivos
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {plan.objectives.map((objective, index) => (
                              <Badge key={index} variant="outline">
                                {objective}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Current Progress */}
                        {progressData && (
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className={`text-2xl font-bold ${getPainLevelColor(progressData.painLevel)}`}>
                                {progressData.painLevel}/10
                              </div>
                              <div className="text-xs text-muted-foreground">Nível de Dor</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {progressData.functionalScore}%
                              </div>
                              <div className="text-xs text-muted-foreground">Score Funcional</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {progressData.exerciseCompliance}%
                              </div>
                              <div className="text-xs text-muted-foreground">Aderência</div>
                            </div>
                          </div>
                        )}

                        {/* Exercise Summary */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" />
                            Exercícios ({plan.exercises.length})
                          </h4>
                          <div className="space-y-2">
                            {plan.exercises.slice(0, 3).map((exercise, index) => {
                              const exerciseData = exercises.find(e => e.id === exercise.exerciseId);
                              return (
                                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {exerciseData?.name || 'Exercício não encontrado'}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      Nível {exercise.progressionLevel}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{exercise.currentSets}x{exercise.currentReps}</span>
                                    {exercise.videoUrl && <Video className="w-3 h-3" />}
                                  </div>
                                </div>
                              );
                            })}
                            {plan.exercises.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{plan.exercises.length - 3} exercícios adicionais
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI Progression Rules */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Regras de Progressão IA
                          </h4>
                          <div className="space-y-2">
                            {plan.progressionRules.map((rule, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs p-2 bg-blue-50 rounded">
                                <ArrowUp className="w-3 h-3 text-blue-600" />
                                <span>{rule.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button variant="outline" size="sm">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                          <Button variant="outline" size="sm">
                            <Video className="w-4 h-4 mr-2" />
                            Demonstrações
                          </Button>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Ajustar IA
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockProgressData.map((progress) => {
                const patient = patients.find(p => p.id === progress.patientId);
                return (
                  <Card key={progress.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{patient?.name}</CardTitle>
                      <CardDescription>
                        {format(progress.date, 'dd/MM/yyyy', { locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Nível de Dor</span>
                          <span className={getPainLevelColor(progress.painLevel)}>
                            {progress.painLevel}/10
                          </span>
                        </div>
                        <Progress value={progress.painLevel * 10} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Score Funcional</span>
                          <span className="text-blue-600">{progress.functionalScore}%</span>
                        </div>
                        <Progress value={progress.functionalScore} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Aderência</span>
                          <span className="text-green-600">{progress.exerciseCompliance}%</span>
                        </div>
                        <Progress value={progress.exerciseCompliance} className="h-2" />
                      </div>

                      {progress.measurements && progress.measurements.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Medições</h5>
                          {progress.measurements.map((measurement, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span>{measurement.location}</span>
                              <span>{measurement.value} {measurement.unit}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {progress.notes && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Observações</h5>
                          <p className="text-xs text-muted-foreground">{progress.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    IA Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs">85% dos pacientes mostram melhora em 4 semanas</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs">Progressão automática aumentou aderência em 23%</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs">3 pacientes precisam de ajuste no plano</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    Recomendações IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-xs font-medium">Maria Silva</p>
                    <p className="text-xs text-muted-foreground">
                      Sugerido: Adicionar exercícios de estabilização
                    </p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-xs font-medium">João Santos</p>
                    <p className="text-xs text-muted-foreground">
                      Sugerido: Reduzir intensidade por 1 semana
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-500" />
                    Metas Alcançadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">12/15</div>
                    <div className="text-xs text-muted-foreground">Objetivos este mês</div>
                  </div>
                  <Progress value={80} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    80% das metas mensais alcançadas
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}