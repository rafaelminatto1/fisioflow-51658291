import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewExerciseModal } from "@/components/modals/NewExerciseModal";
import { ExerciseLibrary } from "@/components/exercises/ExerciseLibrary";
import { ExercisePlayer } from "@/components/exercises/ExercisePlayer";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseFavorites } from "@/hooks/useExerciseFavorites";
import { useExerciseProtocols } from "@/hooks/useExerciseProtocols";
import { Dumbbell, PlusCircle, Heart, BookOpen, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, LoadingSkeleton } from "@/components/ui";


const Exercises = () => {
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string; category: string; description?: string; instructions?: string; video_url?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("library");
  const [isNewExerciseModalOpen, setIsNewExerciseModalOpen] = useState(false);
  const { exercises } = useExercises();
  const { favorites } = useExerciseFavorites();
  const { protocols } = useExerciseProtocols();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Exercícios | FisioFlow";
  }, []);

  const handleViewExercise = (exercise: { id: string; name: string; category: string; description?: string; instructions?: string; video_url?: string }) => {
    setSelectedExercise(exercise);
    setActiveTab("player");
  };

  const handleAddToPlan = (exerciseData: { id: string; name: string; category: string; description?: string; instructions?: string; video_url?: string }) => {
    console.log('Adding exercise to plan:', exerciseData);
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A criação de planos será implementada na próxima fase"
    });
  };

  return (
    <MainLayout>
      <main className="space-y-6 animate-fade-in">
        {/* Page header moderno */}
        <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary grid place-items-center shadow-medical">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Biblioteca de Exercícios
                </h1>
              </div>
            </div>
            <p className="text-muted-foreground ml-15">
              Gerencie exercícios, crie protocolos e prescreva programas personalizados
            </p>
          </div>
          <Button 
            className="shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
            onClick={() => setIsNewExerciseModalOpen(true)}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Novo Exercício</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </section>

        {/* Estatísticas rápidas - Melhoradas */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all duration-300 animate-scale-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-medical">
                  <Dumbbell className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{exercises.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{favorites.length}</p>
                  <p className="text-xs text-muted-foreground">Favoritos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{protocols.length}</p>
                  <p className="text-xs text-muted-foreground">Protocolos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(exercises.map(ex => ex.category)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Categorias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Conteúdo principal com tabs */}
        <section>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="library">Biblioteca</TabsTrigger>
              <TabsTrigger value="protocols">Protocolos</TabsTrigger>
              <TabsTrigger value="player" disabled={!selectedExercise}>
                Player {selectedExercise && `- ${selectedExercise.name}`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="mt-6">
              <ExerciseLibrary
                onExerciseSelect={handleViewExercise}
                onAddToPlan={handleAddToPlan}
                className="border-0 shadow-none bg-transparent"
              />
            </TabsContent>

            <TabsContent value="protocols" className="mt-6">
              <EmptyState
                icon={BookOpen}
                title="Protocolos em desenvolvimento"
                description="O gerenciamento de protocolos será implementado na próxima atualização"
              />
            </TabsContent>

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
                    <p className="text-muted-foreground">
                      Selecione um exercício da biblioteca para visualizar
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </section>
        
        <NewExerciseModal
          open={isNewExerciseModalOpen}
          onOpenChange={setIsNewExerciseModalOpen}
        />
      </main>
    </MainLayout>
  );
};

export default Exercises;
