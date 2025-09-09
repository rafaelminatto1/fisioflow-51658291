import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { NewExerciseModal } from "@/components/modals/NewExerciseModal";
import { ExerciseLibrary } from "@/components/exercises/ExerciseLibrary";
import { ExercisePlayer } from "@/components/exercises/ExercisePlayer";
import { ExercisePrescriptionManager } from "@/components/exercises/ExercisePrescriptionManager";
import { ExerciseProgressTracker } from "@/components/exercises/ExerciseProgressTracker";
import { ExerciseProtocolManager } from "@/components/exercises/ExerciseProtocolManager";
import { ExerciseSOAPIntegration } from "@/components/exercises/ExerciseSOAPIntegration";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseFavorites } from "@/hooks/useExerciseFavorites";
import { useExerciseProtocols } from "@/hooks/useExerciseProtocols";
import { useExercisePlans } from "@/hooks/useExercisePlans";
import { usePatients } from "@/hooks/usePatients";
import { 
  Dumbbell, 
  PlusCircle, 
  Heart, 
  BookOpen, 
  Settings,
  Target,
  TrendingUp,
  Stethoscope,
  FileText,
  BarChart3,
  Users,
  Activity,
  Award,
  Clock,
  Brain,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Exercises = () => {
  const [selectedExercise, setSelectedExercise] = useState<{ 
    id: string; 
    name: string; 
    category: string; 
    description?: string; 
    instructions?: string; 
    video_url?: string;
  } | null>(null);
  
  const [activeTab, setActiveTab] = useState("library");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  const { exercises, stats } = useExercises();
  const { favorites } = useExerciseFavorites();
  const { protocols, protocolStats } = useExerciseProtocols();
  const { planStats } = useExercisePlans();
  const { patients } = usePatients();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Exercícios | FisioFlow";
  }, []);

  const handleViewExercise = (exercise: { 
    id: string; 
    name: string; 
    category: string; 
    description?: string; 
    instructions?: string; 
    video_url?: string;
  }) => {
    setSelectedExercise(exercise);
    setActiveTab("player");
  };

  const handleAddToPlan = (exerciseData: { 
    id: string; 
    name: string; 
    category: string; 
    description?: string; 
    instructions?: string; 
    video_url?: string;
  }) => {
    console.log('Adding exercise to plan:', exerciseData);
    // This could open a modal to select which plan to add to
    toast({
      title: "Exercício selecionado",
      description: `${exerciseData.name} pode ser adicionado a um plano na aba Prescrição`
    });
  };

  // Calculate comprehensive statistics
  const comprehensiveStats = {
    totalExercises: exercises.length,
    favorites: favorites.length,
    protocols: protocols.length,
    activePlans: planStats.activePlans,
    totalVolume: stats.totalExercises,
    categoriesCount: Object.keys(stats.exercisesByCategory || {}).length,
    popularCategory: Object.entries(stats.exercisesByCategory || {})
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
    evidenceBasedProtocols: protocolStats.protocolsByEvidence?.A || 0,
  };

  return (
    <MainLayout>
      <main className="space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary grid place-items-center shadow-lg">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Sistema de Exercícios Terapêuticos
              </h1>
              <p className="text-muted-foreground">
                Gestão completa de exercícios, prescrições, protocolos e progresso de pacientes
              </p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary" className="text-xs">
                  Baseado em Evidências
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Progressão Inteligente
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Integração SOAP
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <NewExerciseModal
              trigger={
                <Button variant="outline" className="bg-background">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Novo Exercício
                </Button>
              }
            />
            <Button className="bg-gradient-primary hover:opacity-90">
              <Brain className="w-4 h-4 mr-2" />
              IA Assistente
            </Button>
          </div>
        </section>

        {/* Comprehensive Statistics Dashboard */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">{comprehensiveStats.totalExercises}</p>
                  <p className="text-xs text-blue-700">Exercícios</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-900">{comprehensiveStats.favorites}</p>
                  <p className="text-xs text-red-700">Favoritos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900">{comprehensiveStats.protocols}</p>
                  <p className="text-xs text-green-700">Protocolos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-900">{comprehensiveStats.activePlans}</p>
                  <p className="text-xs text-purple-700">Planos Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-900">{comprehensiveStats.evidenceBasedProtocols}</p>
                  <p className="text-xs text-orange-700">Evidência A</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-900">{comprehensiveStats.categoriesCount}</p>
                  <p className="text-xs text-teal-700">Categorias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-900">{patients.length}</p>
                  <p className="text-xs text-indigo-700">Pacientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink-900">{comprehensiveStats.popularCategory}</p>
                  <p className="text-xs text-pink-700">Mais Popular</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Enhanced Main Content with Professional Tabs */}
        <section>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7 h-auto p-1">
              <TabsTrigger 
                value="library" 
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-xs">Biblioteca</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="prescription"
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs">Prescrição</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="protocols"
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Stethoscope className="w-4 h-4" />
                <span className="text-xs">Protocolos</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="progress"
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Progresso</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="integration"
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Activity className="w-4 h-4" />
                <span className="text-xs">SOAP</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="analytics"
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Analytics</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="player" 
                disabled={!selectedExercise}
                className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Zap className="w-4 h-4" />
                <span className="text-xs">Player</span>
              </TabsTrigger>
            </TabsList>

            {/* Exercise Library */}
            <TabsContent value="library" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Biblioteca de Exercícios Terapêuticos
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Acesso completo à biblioteca de exercícios com filtros avançados e análise detalhada
                  </p>
                </CardHeader>
                <CardContent>
                  <ExerciseLibrary
                    onExerciseSelect={handleViewExercise}
                    onAddToPlan={handleAddToPlan}
                    className="border-0 shadow-none bg-transparent"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Exercise Prescription */}
            <TabsContent value="prescription" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Sistema de Prescrição de Exercícios
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Crie planos de exercícios personalizados com base em evidências científicas
                  </p>
                </CardHeader>
                <CardContent>
                  <ExercisePrescriptionManager
                    patientId={selectedPatientId}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Evidence-Based Protocols */}
            <TabsContent value="protocols" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Protocolos Baseados em Evidências
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Biblioteca de protocolos clínicos validados cientificamente para diferentes condições
                  </p>
                </CardHeader>
                <CardContent>
                  <ExerciseProtocolManager />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progress Tracking */}
            <TabsContent value="progress" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Acompanhamento e Evolução
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Monitore o progresso dos pacientes com métricas detalhadas e análise de tendências
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedPatientId ? (
                    <ExerciseProgressTracker patientId={selectedPatientId} />
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Selecione um Paciente</h3>
                      <p className="text-muted-foreground mb-6">
                        Escolha um paciente para visualizar o progresso dos exercícios
                      </p>
                      <select 
                        className="px-4 py-2 border rounded-lg"
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                      >
                        <option value="">Selecionar paciente...</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SOAP Integration */}
            <TabsContent value="integration" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Integração com Registros SOAP
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Conecte prescrições de exercícios aos registros clínicos para documentação completa
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedPatientId ? (
                    <ExerciseSOAPIntegration patientId={selectedPatientId} />
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Selecione um Paciente</h3>
                      <p className="text-muted-foreground mb-6">
                        Escolha um paciente para ver a integração com registros SOAP
                      </p>
                      <select 
                        className="px-4 py-2 border rounded-lg"
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                      >
                        <option value="">Selecionar paciente...</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Dashboard */}
            <TabsContent value="analytics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Dashboard de Analytics
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Análises avançadas de uso, efetividade e tendências do sistema de exercícios
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Exercise Distribution */}
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(stats.exercisesByCategory || {}).map(([category, count]) => (
                            <div key={category} className="flex items-center justify-between text-sm">
                              <span className="capitalize">{category}</span>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Protocol Evidence Levels */}
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Protocolos por Evidência</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(protocolStats.protocolsByEvidence || {}).map(([level, count]) => (
                            <div key={level} className="flex items-center justify-between text-sm">
                              <span>Nível {level}</span>
                              <Badge 
                                variant="secondary" 
                                className={
                                  level === 'A' ? 'bg-green-100 text-green-800' :
                                  level === 'B' ? 'bg-blue-100 text-blue-800' :
                                  level === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Most Used Protocols */}
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Protocolos Mais Usados</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {protocolStats.mostUsedProtocols?.slice(0, 5).map((protocol, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="truncate flex-1">{protocol.name}</span>
                              <Badge variant="secondary">{protocol.usage_count}x</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Exercise Player */}
            <TabsContent value="player" className="mt-6">
              {selectedExercise ? (
                <ExercisePlayer
                  exercise={selectedExercise}
                  onClose={() => {
                    setSelectedExercise(null);
                    setActiveTab("library");
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Zap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Player de Exercícios</h3>
                    <p className="text-muted-foreground">
                      Selecione um exercício da biblioteca para visualizar instruções detalhadas
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Quick Actions Footer */}
        <section className="bg-muted/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => setActiveTab("prescription")}
            >
              <Target className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium text-sm">Nova Prescrição</div>
                <div className="text-xs text-muted-foreground">Criar plano personalizado</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => setActiveTab("protocols")}
            >
              <BookOpen className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium text-sm">Protocolo Evidência</div>
                <div className="text-xs text-muted-foreground">Buscar template clínico</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => setActiveTab("progress")}
            >
              <TrendingUp className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium text-sm">Acompanhar Progresso</div>
                <div className="text-xs text-muted-foreground">Monitorar evolução</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => setActiveTab("integration")}
            >
              <Activity className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium text-sm">Integrar SOAP</div>
                <div className="text-xs text-muted-foreground">Documentar evolução</div>
              </div>
            </Button>
          </div>
        </section>
      </main>
    </MainLayout>
  );
};

export default Exercises;