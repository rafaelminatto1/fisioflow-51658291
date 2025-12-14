import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, BookOpen, Target, FileText, Heart, 
  Dumbbell, VideoOff
} from 'lucide-react';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
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
  
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'templates' | 'protocols'>('library');
  const [showNewModal, setShowNewModal] = useState(false);

  const exercisesWithoutVideo = exercises.filter(ex => !ex.video_url);

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
      label: 'Sem Vídeo',
      value: exercisesWithoutVideo.length,
      icon: VideoOff,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Favoritos',
      value: favorites.length,
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
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
      <div className="space-y-4 sm:space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <span className="hidden sm:inline">Biblioteca de Exercícios</span>
              <span className="sm:hidden">Exercícios</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie exercícios, templates e protocolos
            </p>
          </div>
          <Button onClick={handleNewExercise} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Novo</span>
            <span className="hidden sm:inline">Novo Exercício</span>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg" />
                  <div className="space-y-1 sm:space-y-2">
                    <Skeleton className="h-3 w-16 sm:w-20" />
                    <Skeleton className="h-5 sm:h-6 w-8 sm:w-10" />
                  </div>
                </div>
              </Card>
            ))
          ) : (
            stats.map((stat) => (
              <Card 
                key={stat.label} 
                className="p-3 sm:p-4 hover:shadow-md transition-all hover:border-primary/30 cursor-default"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={cn("p-2 sm:p-2.5 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
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
          </TabsList>

          <TabsContent value="library" className="mt-6">
            <ExerciseLibrary 
              onEditExercise={handleEditExercise}
            />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <TemplateManager />
          </TabsContent>

          <TabsContent value="protocols" className="mt-6">
            <ProtocolsManager />
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
