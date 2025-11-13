import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BookOpen, Play, Target, FileText } from 'lucide-react';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { TemplateManager } from '@/components/exercises/TemplateManager';
import { NewExerciseModal } from '@/components/modals/NewExerciseModal';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';
import { useExerciseTemplates } from '@/hooks/useExerciseTemplates';

export default function Exercises() {
  const { exercises, createExercise, updateExercise } = useExercises();
  const { favorites } = useExerciseFavorites();
  const { protocols } = useExerciseProtocols();
  const { templates } = useExerciseTemplates();
  
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
  };

  const handleAddToPlan = (exerciseId: string) => {
    console.log('Adding exercise to plan:', exerciseId);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Biblioteca de Exercícios</h1>
            <p className="text-muted-foreground">
              Gerencie exercícios, templates e protocolos terapêuticos
            </p>
          </div>
          <Button onClick={handleNewExercise}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Exercício
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{exercises.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Target className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Favoritos</p>
                <p className="text-2xl font-bold">{favorites.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Protocolos</p>
                <p className="text-2xl font-bold">{protocols.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="library">
              <BookOpen className="h-4 w-4 mr-2" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="protocols">
              <Target className="h-4 w-4 mr-2" />
              Protocolos
            </TabsTrigger>
            <TabsTrigger value="player" disabled={!selectedExercise}>
              <Play className="h-4 w-4 mr-2" />
              Player
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
            <Card className="p-6">
              <p className="text-muted-foreground text-center py-8">
                Protocolos de progressão em desenvolvimento
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="player" className="mt-6">
            {selectedExercise ? (
              <ExercisePlayer
                exercise={selectedExercise}
                onAddToPlan={handleAddToPlan}
              />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Selecione um exercício na biblioteca para visualizar
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewExerciseModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSubmit={handleSubmit}
        exercise={editingExercise || undefined}
      />
    </MainLayout>
  );
}
