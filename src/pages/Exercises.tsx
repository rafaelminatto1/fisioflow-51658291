import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Activity, Heart, BookOpen, Layers } from 'lucide-react';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { NewExerciseModal } from '@/components/modals/NewExerciseModal';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';

export default function Exercises() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState('library');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { exercises, createExercise, updateExercise, isCreating, isUpdating } = useExercises();
  const { favorites } = useExerciseFavorites();
  const { protocols } = useExerciseProtocols();

  const handleViewExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setActiveTab('player');
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsModalOpen(true);
  };

  const handleNewExercise = () => {
    setEditingExercise(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingExercise) {
      updateExercise({ id: editingExercise.id, ...data });
    } else {
      createExercise(data);
    }
    setIsModalOpen(false);
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
              Gerencie e visualize exercícios terapêuticos
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
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{exercises.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Favoritos</p>
                <p className="text-2xl font-bold">{favorites.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Protocolos</p>
                <p className="text-2xl font-bold">{protocols.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Layers className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">
                  {new Set(exercises.map(e => e.category).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="library">Biblioteca</TabsTrigger>
            <TabsTrigger value="protocols">Protocolos</TabsTrigger>
            <TabsTrigger value="player">Player</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-6">
            <ExerciseLibrary 
              onSelectExercise={handleViewExercise}
              onEditExercise={handleEditExercise}
            />
          </TabsContent>

          <TabsContent value="protocols" className="mt-6">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Protocolos em desenvolvimento</p>
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
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleSubmit}
        exercise={editingExercise || undefined}
        isLoading={isCreating || isUpdating}
      />
    </MainLayout>
  );
}
