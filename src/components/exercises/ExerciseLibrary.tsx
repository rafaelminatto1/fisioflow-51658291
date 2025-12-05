import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Play, Search, Edit, Trash2, Heart, Dumbbell, 
  Video, Clock, Repeat, LayoutGrid, List, AlertTriangle, VideoOff
} from 'lucide-react';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import { cn } from '@/lib/utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExerciseViewModal } from './ExerciseViewModal';

interface ExerciseLibraryProps {
  onSelectExercise?: (exercise: Exercise) => void;
  onEditExercise: (exercise: Exercise) => void;
}

const difficultyColors: Record<string, string> = {
  'Fácil': 'bg-green-500/10 text-green-600 border-green-500/30',
  'Iniciante': 'bg-green-500/10 text-green-600 border-green-500/30',
  'Médio': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  'Intermediário': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  'Difícil': 'bg-red-500/10 text-red-600 border-red-500/30',
  'Avançado': 'bg-red-500/10 text-red-600 border-red-500/30',
};

export function ExerciseLibrary({ onSelectExercise, onEditExercise }: ExerciseLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showNoVideoOnly, setShowNoVideoOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewExercise, setViewExercise] = useState<Exercise | null>(null);
  
  const { 
    exercises, 
    loading,
    deleteExercise,
    isDeleting,
  } = useExercises();

  const { isFavorite, toggleFavorite } = useExerciseFavorites();

  const categories = ['all', ...Array.from(new Set(exercises.map(e => e.category).filter(Boolean)))];
  const difficulties = ['all', ...Array.from(new Set(exercises.map(e => e.difficulty).filter(Boolean)))];
  
  const exercisesWithoutVideo = exercises.filter(ex => !ex.video_url);
  
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = searchTerm === '' || 
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || ex.difficulty === selectedDifficulty;
    const matchesFavorite = !showFavoritesOnly || isFavorite(ex.id);
    const matchesNoVideo = !showNoVideoOnly || !ex.video_url;
    return matchesSearch && matchesCategory && matchesDifficulty && matchesFavorite && matchesNoVideo;
  });

  const handleViewExercise = (exercise: Exercise) => {
    setViewExercise(exercise);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteExercise(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-40 w-full mb-4 rounded-md" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercícios por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'Todas categorias' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Dificuldade" />
          </SelectTrigger>
          <SelectContent>
            {difficulties.map((diff) => (
              <SelectItem key={diff} value={diff}>
                {diff === 'all' ? 'Todas dificuldades' : diff}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowFavoritesOnly(!showFavoritesOnly);
              if (!showFavoritesOnly) setShowNoVideoOnly(false);
            }}
          >
            <Heart className={cn("h-4 w-4 mr-2", showFavoritesOnly && "fill-current")} />
            Favoritos
          </Button>
          <Button
            variant={showNoVideoOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowNoVideoOnly(!showNoVideoOnly);
              if (!showNoVideoOnly) setShowFavoritesOnly(false);
            }}
            className={cn(showNoVideoOnly && "bg-orange-500 hover:bg-orange-600")}
          >
            <VideoOff className="h-4 w-4 mr-2" />
            Sem Vídeo ({exercisesWithoutVideo.length})
          </Button>
          <span className="text-sm text-muted-foreground">
            {filteredExercises.length} exercício{filteredExercises.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Exercise Grid/List */}
      {filteredExercises.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum exercício encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all' 
              ? 'Tente ajustar os filtros de busca' 
              : 'Adicione seu primeiro exercício à biblioteca'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((exercise) => (
            <Card 
              key={exercise.id} 
              className="group overflow-hidden hover:shadow-lg transition-all hover:border-primary/30"
            >
              {/* Image/Placeholder */}
              <div className="relative h-40 bg-muted">
                {exercise.image_url ? (
                  <img 
                    src={exercise.image_url} 
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Dumbbell className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                {exercise.video_url && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                      <Video className="h-3 w-3 mr-1" />
                      Vídeo
                    </Badge>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute top-2 left-2 bg-background/80 backdrop-blur hover:bg-background",
                    isFavorite(exercise.id) && "text-red-500"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(exercise.id);
                  }}
                >
                  <Heart className={cn("h-4 w-4", isFavorite(exercise.id) && "fill-current")} />
                </Button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                    {exercise.name}
                  </h3>
                  {exercise.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {exercise.description}
                    </p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  {exercise.category && (
                    <Badge variant="secondary" className="text-xs">
                      {exercise.category}
                    </Badge>
                  )}
                  {exercise.difficulty && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", difficultyColors[exercise.difficulty])}
                    >
                      {exercise.difficulty}
                    </Badge>
                  )}
                </div>

                {/* Parameters */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {exercise.sets && (
                    <span className="flex items-center gap-1">
                      <Repeat className="h-3 w-3" />
                      {exercise.sets} séries
                    </span>
                  )}
                  {exercise.repetitions && (
                    <span>{exercise.repetitions} reps</span>
                  )}
                  {exercise.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {exercise.duration}s
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleViewExercise(exercise)}
                    className="flex-1"
                    size="sm"
                    variant={exercise.video_url ? 'default' : 'secondary'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button
                    onClick={() => onEditExercise(exercise)}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setDeleteId(exercise.id)}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExercises.map((exercise) => (
            <Card 
              key={exercise.id} 
              className="p-4 hover:shadow-md transition-all hover:border-primary/30 group"
            >
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                <div className="h-16 w-16 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                  {exercise.image_url ? (
                    <img 
                      src={exercise.image_url} 
                      alt={exercise.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dumbbell className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {exercise.name}
                    </h3>
                    {exercise.video_url && (
                      <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {exercise.category && (
                      <Badge variant="secondary" className="text-xs">
                        {exercise.category}
                      </Badge>
                    )}
                    {exercise.difficulty && (
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", difficultyColors[exercise.difficulty])}
                      >
                        {exercise.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Parameters */}
                <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                  {exercise.sets && <span>{exercise.sets} séries</span>}
                  {exercise.repetitions && <span>{exercise.repetitions} reps</span>}
                  {exercise.duration && <span>{exercise.duration}s</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(isFavorite(exercise.id) && "text-red-500")}
                    onClick={() => toggleFavorite(exercise.id)}
                  >
                    <Heart className={cn("h-4 w-4", isFavorite(exercise.id) && "fill-current")} />
                  </Button>
                  <Button
                    onClick={() => handleViewExercise(exercise)}
                    size="sm"
                    variant={exercise.video_url ? 'default' : 'secondary'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button
                    onClick={() => onEditExercise(exercise)}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setDeleteId(exercise.id)}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
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

      <ExerciseViewModal
        open={!!viewExercise}
        onOpenChange={(open) => !open && setViewExercise(null)}
        exercise={viewExercise}
        onEdit={onEditExercise}
      />
    </div>
  );
}
