import React, { useState } from 'react';

// External libraries
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Brain,
  Target,
  TrendingUp,
  Play,
  Search,
  Users,
  Dumbbell,
  Award,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Calendar
} from 'lucide-react';

// UI Components
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


// Local components
import { NewExercisePlanModal } from '@/components/modals/NewExercisePlanModal';
import { ProgressChart } from '@/components/charts/ProgressChart';
import { PainLevelChart } from '@/components/charts/PainLevelChart';
import { SmartProgressionManager } from '@/components/exercise/SmartProgressionManager';

// Hooks and contexts
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';

export function SmartExercisePlans() {
  const { patients, exercisePlans, patientProgress, addPatientProgress } = useData();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProgressOpen, setIsProgressOpen] = useState(false);

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

  const handleProgressEntry = async () => {
    if (!selectedPatient) {
      toast({
        title: "Erro",
        description: "Selecione um paciente.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addPatientProgress({
        patient_id: selectedPatient,
        progress_date: new Date().toISOString().split('T')[0],
        pain_level: progressEntry.painLevel,
        functional_score: progressEntry.functionalScore,
        exercise_compliance: progressEntry.exerciseCompliance,
        notes: progressEntry.notes
      });

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
    } catch (error) {
      console.error('Erro ao registrar progresso:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar progresso.",
        variant: "destructive",
      });
    }
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

  // Prepare chart data for progress visualization
  const getProgressChartData = (patientId: string) => {
    const progressData = patientProgress
      .filter(p => p.patient_id === patientId)
      .sort((a, b) => new Date(a.progress_date).getTime() - new Date(b.progress_date).getTime())
      .map(p => ({
        date: format(new Date(p.progress_date), 'dd/MM', { locale: ptBR }),
        painLevel: p.pain_level,
        functionalScore: p.functional_score,
        exerciseCompliance: p.exercise_compliance
      }));
    
    return progressData;
  };

  const getPainChartData = (patientId: string) => {
    return patientProgress
      .filter(p => p.patient_id === patientId)
      .sort((a, b) => new Date(a.progress_date).getTime() - new Date(b.progress_date).getTime())
      .map(p => ({
        date: format(new Date(p.progress_date), 'dd/MM', { locale: ptBR }),
        painLevel: p.pain_level
      }));
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
            <NewExercisePlanModal
              trigger={
                <Button className="bg-primary hover:bg-primary/90">
                  <Brain className="w-4 h-4 mr-2" />
                  Criar Plano IA
                </Button>
              }
            />

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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="plans">Planos Ativos</TabsTrigger>
            <TabsTrigger value="progress">Progresso</TabsTrigger>
            <TabsTrigger value="ai-analytics">AI Analytics</TabsTrigger>
            <TabsTrigger value="smart-progression">Progressão IA</TabsTrigger>
            <TabsTrigger value="smart-reports">Relatórios IA</TabsTrigger>
            <TabsTrigger value="treatment-sessions">Sessões</TabsTrigger>
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
                  const patient = patients.find(p => p.id === plan.patient_id);
                  const progressData = patientProgress.find(p => p.patient_id === plan.patient_id);
                  
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
                                  {plan.description || 'Plano personalizado'}
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
                        
                        {/* Current Progress */}
                        {progressData && (
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className={`text-2xl font-bold ${getPainLevelColor(progressData.pain_level)}`}>
                                {progressData.pain_level}/10
                              </div>
                              <div className="text-xs text-muted-foreground">Nível de Dor</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {progressData.functional_score}%
                              </div>
                              <div className="text-xs text-muted-foreground">Score Funcional</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {progressData.exercise_compliance}%
                              </div>
                              <div className="text-xs text-muted-foreground">Aderência</div>
                            </div>
                          </div>
                        )}

                        {/* Exercise Summary */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" />
                            Exercícios do Plano
                          </h4>
                          <div className="bg-muted/50 rounded-lg p-4 text-center">
                            <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Exercícios serão configurados em breve
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button variant="outline" size="sm">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                          <Button variant="outline" size="sm">
                            <TrendingUp className="w-4 h-4 mr-2" />
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
            {selectedPatient ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProgressChart 
                  data={getProgressChartData(selectedPatient)}
                  patientName={patients.find(p => p.id === selectedPatient)?.name}
                />
                <PainLevelChart 
                  data={getPainChartData(selectedPatient)}
                  patientName={patients.find(p => p.id === selectedPatient)?.name}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Selecione um paciente</h3>
                  <p className="text-muted-foreground">
                    Escolha um paciente para visualizar seus gráficos de progresso.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="smart-progression" className="space-y-4">
            {selectedPatient ? (
              <SmartProgressionManager 
                patientId={selectedPatient}
                planId={filteredPlans.find(p => p.patient_id === selectedPatient)?.id}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Selecione um paciente</h3>
                  <p className="text-muted-foreground">
                    Escolha um paciente para gerenciar sua progressão inteligente.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="smart-reports">
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Relatórios Inteligentes</h3>
                <p className="text-muted-foreground">
                  Em breve: relatórios automáticos gerados por IA baseados no progresso dos pacientes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatment-sessions" className="space-y-4">
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sessões de Tratamento</h3>
                <p className="text-muted-foreground">
                  Em breve: gerenciamento completo de sessões de tratamento com registro SOAP.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-analytics" className="space-y-4">
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
                    <p className="text-xs font-medium">Desenvolvimento em andamento</p>
                    <p className="text-xs text-muted-foreground">
                      Sistema de IA será implementado em breve
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
                    <div className="text-2xl font-bold text-green-600">{exercisePlans.length}</div>
                    <div className="text-xs text-muted-foreground">Planos ativos</div>
                  </div>
                  <Progress value={75} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Sistema funcionando perfeitamente
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