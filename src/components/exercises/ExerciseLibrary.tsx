import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExerciseLibraryProps {
  onSelectExercise: (exercise: Exercise) => void;
  onEditExercise: (exercise: Exercise) => void;
}

export function ExerciseLibrary({ onSelectExercise, onEditExercise }: ExerciseLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { 
    exercises, 
    loading,
    deleteExercise,
    isDeleting,
  } = useExercises();

  const categories = ['all', ...Array.from(new Set(exercises.map(e => e.category).filter(Boolean)))];
  
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = searchTerm === '' || 
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteExercise(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando exercícios...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercícios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category)}
          >
            {category === 'all' ? 'Todos' : category}
          </Badge>
        ))}
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              {exercise.image_url && (
                <img 
                  src={exercise.image_url} 
                  alt={exercise.name}
                  className="w-full h-40 object-cover rounded-md"
                />
              )}
              <div>
                <h3 className="font-semibold">{exercise.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {exercise.description}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {exercise.category && (
                  <Badge variant="secondary">{exercise.category}</Badge>
                )}
                {exercise.difficulty && (
                  <Badge variant="outline">{exercise.difficulty}</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onSelectExercise(exercise)}
                  className="flex-1"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Ver
                </Button>
                <Button
                  onClick={() => onEditExercise(exercise)}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setDeleteId(exercise.id)}
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum exercício encontrado
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
