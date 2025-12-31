import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Search, Edit, Trash2, Heart, Dumbbell, 
  Video, Clock, Repeat, LayoutGrid, List, VideoOff,
  Filter, SortAsc, Eye, MoreVertical, Sparkles
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExerciseViewModal } from './ExerciseViewModal';
import { EmptyState } from '@/components/ui/empty-state';

interface ExerciseLibraryProps {
  onSelectExercise?: (exercise: Exercise) => void;
  onEditExercise: (exercise: Exercise) => void;
}

const difficultyConfig: Record<string, { color: string; bg: string; border: string }> = {
  'Fácil': { color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  'Iniciante': { color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  'Médio': { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  'Intermediário': { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  'Difícil': { color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  'Avançado': { color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
};

const categoryColors: Record<string, string> = {
  'Fortalecimento': 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  'Alongamento': 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  'Mobilidade': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  'Equilíbrio': 'bg-teal-500/10 text-teal-600 border-teal-500/30',
  'Cardio': 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  'Respiratório': 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  'Propriocepção': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
};

function ExerciseCard({ 
  exercise, 
  isFavorite, 
  onToggleFavorite, 
  onView, 
  onEdit, 
  onDelete 
}: {
  exercise: Exercise;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const diffConfig = exercise.difficulty ? difficultyConfig[exercise.difficulty] : null;
  const catColor = exercise.category ? categoryColors[exercise.category] || 'bg-muted text-muted-foreground' : '';

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-primary/40 hover:-translate-y-1">
      {/* Image Section */}
      <div className="relative h-44 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
        {exercise.image_url ? (
          <img 
            src={exercise.image_url} 
            alt={exercise.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="p-4 rounded-full bg-primary/10">
              <Dumbbell className="h-10 w-10 text-primary/40" />
            </div>
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg",
              isFavorite && "text-rose-500 hover:text-rose-600"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Heart className={cn("h-4 w-4 transition-all", isFavorite && "fill-current scale-110")} />
          </Button>
          
          <div className="flex gap-2">
            {exercise.video_url ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg gap-1">
                <Video className="h-3 w-3" />
                Vídeo
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-lg gap-1">
                <VideoOff className="h-3 w-3" />
                Sem vídeo
              </Badge>
            )}
          </div>
        </div>

        {/* Quick View on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
          <Button 
            onClick={onView}
            size="lg"
            className="shadow-2xl gap-2 bg-white/95 text-foreground hover:bg-white"
          >
            <Play className="h-5 w-5" />
            Visualizar
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {exercise.name}
          </h3>
          {exercise.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {exercise.description}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          {exercise.category && (
            <Badge variant="outline" className={cn("text-xs font-medium", catColor)}>
              {exercise.category}
            </Badge>
          )}
          {exercise.difficulty && diffConfig && (
            <Badge 
              variant="outline" 
              className={cn("text-xs font-medium", diffConfig.color, diffConfig.bg, diffConfig.border)}
            >
              {exercise.difficulty}
            </Badge>
          )}
        </div>

        {/* Parameters */}
        {(exercise.sets || exercise.repetitions || exercise.duration) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
            {exercise.sets && (
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Repeat className="h-3 w-3" />
                {exercise.sets}x
              </span>
            )}
            {exercise.repetitions && (
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                {exercise.repetitions} reps
              </span>
            )}
            {exercise.duration && (
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Clock className="h-3 w-3" />
                {exercise.duration}s
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onView}
            className="flex-1 gap-2"
            size="sm"
          >
            <Eye className="h-4 w-4" />
            Ver Detalhes
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFavorite}>
                <Heart className={cn("h-4 w-4 mr-2", isFavorite && "fill-rose-500 text-rose-500")} />
                {isFavorite ? 'Remover favorito' : 'Adicionar favorito'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

const ExerciseListItem = React.memo(function ExerciseListItem({ 
  exercise, 
  isFavorite, 
  onToggleFavorite, 
  onView, 
  onEdit, 
  onDelete 
}: {
  exercise: Exercise;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const diffConfig = exercise.difficulty ? difficultyConfig[exercise.difficulty] : null;
  const catColor = exercise.category ? categoryColors[exercise.category] || 'bg-muted text-muted-foreground' : '';

  return (
    <Card className="p-4 hover:shadow-md transition-all hover:border-primary/30 group">
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {exercise.image_url ? (
            <img 
              src={exercise.image_url} 
              alt={exercise.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
              <Dumbbell className="h-6 w-6 text-primary/40" />
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
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                <Video className="h-3 w-3 mr-1" />
                Vídeo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {exercise.category && (
              <Badge variant="outline" className={cn("text-xs", catColor)}>
                {exercise.category}
              </Badge>
            )}
            {exercise.difficulty && diffConfig && (
              <Badge 
                variant="outline" 
                className={cn("text-xs", diffConfig.color, diffConfig.bg, diffConfig.border)}
              >
                {exercise.difficulty}
              </Badge>
            )}
          </div>
        </div>

        {/* Parameters */}
        <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
          {exercise.sets && (
            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
              <Repeat className="h-3 w-3" />
              {exercise.sets}x
            </span>
          )}
          {exercise.repetitions && (
            <span className="bg-muted/50 px-2 py-1 rounded">{exercise.repetitions} reps</span>
          )}
          {exercise.duration && (
            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
              <Clock className="h-3 w-3" />
              {exercise.duration}s
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9", isFavorite && "text-rose-500")}
            onClick={onToggleFavorite}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>
          <Button onClick={onView} size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            Ver
          </Button>
          <Button onClick={onEdit} variant="outline" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          <Button onClick={onDelete} variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
});

export function ExerciseLibrary({ onSelectExercise, onEditExercise }: ExerciseLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'no-video'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewExercise, setViewExercise] = useState<Exercise | null>(null);
  
  const { exercises, loading, deleteExercise, isDeleting } = useExercises();
  const { isFavorite, toggleFavorite } = useExerciseFavorites();

  const categories = useMemo(() => 
    ['all', ...Array.from(new Set(exercises.map(e => e.category).filter(Boolean)))],
    [exercises]
  );
  
  const difficulties = useMemo(() => 
    ['all', ...Array.from(new Set(exercises.map(e => e.difficulty).filter(Boolean)))],
    [exercises]
  );

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchesSearch = searchTerm === '' || 
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || ex.difficulty === selectedDifficulty;
      
      let matchesFilter = true;
      if (activeFilter === 'favorites') matchesFilter = isFavorite(ex.id);
      if (activeFilter === 'no-video') matchesFilter = !ex.video_url;
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesFilter;
    });
  }, [exercises, searchTerm, selectedCategory, selectedDifficulty, activeFilter, isFavorite]);

  const exercisesWithoutVideo = exercises.filter(ex => !ex.video_url);
  const favoritesCount = exercises.filter(ex => isFavorite(ex.id)).length;

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
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercícios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px] h-11">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
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
            <SelectTrigger className="w-full sm:w-[180px] h-11">
              <SortAsc className="h-4 w-4 mr-2 text-muted-foreground" />
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

        {/* Filter Chips & View Toggle */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="h-8"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Todos ({exercises.length})
            </Button>
            <Button
              variant={activeFilter === 'favorites' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('favorites')}
              className={cn("h-8", activeFilter === 'favorites' && "bg-rose-500 hover:bg-rose-600")}
            >
              <Heart className={cn("h-3.5 w-3.5 mr-1.5", activeFilter === 'favorites' && "fill-current")} />
              Favoritos ({favoritesCount})
            </Button>
            <Button
              variant={activeFilter === 'no-video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('no-video')}
              className={cn("h-8", activeFilter === 'no-video' && "bg-orange-500 hover:bg-orange-600")}
            >
              <VideoOff className="h-3.5 w-3.5 mr-1.5" />
              Sem Vídeo ({exercisesWithoutVideo.length})
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {filteredExercises.length} resultado{filteredExercises.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/30">
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
        </div>
      </div>

      {/* Exercise Grid/List */}
      {filteredExercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum exercício encontrado"
          description={
            searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all' || activeFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione seu primeiro exercício à biblioteca'
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              isFavorite={isFavorite(exercise.id)}
              onToggleFavorite={() => toggleFavorite(exercise.id)}
              onView={() => setViewExercise(exercise)}
              onEdit={() => onEditExercise(exercise)}
              onDelete={() => setDeleteId(exercise.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExercises.map((exercise) => (
            <ExerciseListItem
              key={exercise.id}
              exercise={exercise}
              isFavorite={isFavorite(exercise.id)}
              onToggleFavorite={() => toggleFavorite(exercise.id)}
              onView={() => setViewExercise(exercise)}
              onEdit={() => onEditExercise(exercise)}
              onDelete={() => setDeleteId(exercise.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Dialog */}
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
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Modal */}
      <ExerciseViewModal
        exercise={viewExercise}
        open={!!viewExercise}
        onOpenChange={(open) => !open && setViewExercise(null)}
      />
    </div>
  );
}
