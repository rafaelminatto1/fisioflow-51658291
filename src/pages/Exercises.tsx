import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, BookOpen, Play, Target, FileText, Heart, 
  TrendingUp, Dumbbell 
} from 'lucide-react';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { TemplateManager } from '@/components/exercises/TemplateManager';
import { ProtocolsManager } from '@/components/exercises/ProtocolsManager';
import { NewExerciseModal } from '@/components/modals/NewExerciseModal';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';
import { useExerciseTemplates } from '@/hooks/useExerciseTemplates';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function Exercises() {
  const { exercises, loading: loadingExercises, createExercise, updateExercise, isCreating, isUpdating } = useExercises();
  const { favorites } = useExerciseFavorites();
  const { protocols, loading: loadingProtocols } = useExerciseProtocols();
  const { templates, loading: loadingTemplates } = useExerciseTemplates();
  
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'templates' | 'protocols' | 'player'>('library');
  const [showNewModal, setShowNewModal] = useState(false);

  const handleViewExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setActiveTab('player');
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowNewModal(true);
  };

  const handleNewExercise = () => {
    setEditingExercise(null);
    setShowNewModal(true);
  };

  const handleSubmit = (data: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingExercise) {
      updateExercise({ id: editingExercise.id, ...data });
    } else {
      createExercise(data);
    }
    setShowNewModal(false);
    setEditingExercise(null);
  };

  const handleAddToPlan = (exerciseId: string) => {
    console.log('Adding exercise to plan:', exerciseId);
  };

  const isLoading = loadingExercises || loadingProtocols || loadingTemplates;

  const stats = [
    {
      label: 'Total de Exercícios',
      value: exercises.length,
      icon: Dumbbell,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Favoritos',
      value: favorites.length,
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Templates',
      value: templates.length,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Protocolos',
      value: protocols.length,
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              Biblioteca de Exercícios
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie exercícios, templates e protocolos terapêuticos
            </p>
          </div>
          <Button onClick={handleNewExercise} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Novo Exercício
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                </div>
              </Card>
            ))
          ) : (
            stats.map((stat) => (
              <Card 
                key={stat.label} 
                className="p-4 hover:shadow-md transition-all hover:border-primary/30 cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
            <TabsTrigger value="library" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Biblioteca</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="protocols" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Protocolos</span>
            </TabsTrigger>
            <TabsTrigger value="player" disabled={!selectedExercise} className="gap-2">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Player</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-6">
            <ExerciseLibrary 
              onSelectExercise={handleViewExercise}
              onEditExercise={handleEditExercise}
            />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <TemplateManager />
          </TabsContent>

          <TabsContent value="protocols" className="mt-6">
            <ProtocolsManager />
          </TabsContent>

          <TabsContent value="player" className="mt-6">
            {selectedExercise ? (
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('library')}
                  className="mb-2"
                >
                  ← Voltar para Biblioteca
                </Button>
                <ExercisePlayer
                  exercise={selectedExercise}
                  onAddToPlan={handleAddToPlan}
                />
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Play className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum exercício selecionado</h3>
                <p className="text-muted-foreground mb-4">
                  Selecione um exercício na biblioteca para visualizar os detalhes
                </p>
                <Button onClick={() => setActiveTab('library')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Ir para Biblioteca
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewExerciseModal
        open={showNewModal}
        onOpenChange={(open) => {
          setShowNewModal(open);
          if (!open) setEditingExercise(null);
        }}
        onSubmit={handleSubmit}
        exercise={editingExercise || undefined}
        isLoading={isCreating || isUpdating}
      />
    </MainLayout>
  );
}
