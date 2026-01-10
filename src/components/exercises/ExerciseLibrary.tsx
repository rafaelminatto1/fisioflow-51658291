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

import { Checkbox } from '@/components/ui/checkbox';
import { CreateTemplateFromSelectionModal } from './CreateTemplateFromSelectionModal';

// ... (existing imports)

export function ExerciseLibrary({ onSelectExercise, onEditExercise }: ExerciseLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  // ... (existing state)
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'no-video'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewExercise, setViewExercise] = useState<Exercise | null>(null);

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);

  const { exercises, loading, deleteExercise, isDeleting } = useExercises();
  const { isFavorite, toggleFavorite } = useExerciseFavorites();

  // ... (existing memos: categories, difficulties, etc.)

  const toggleSelection = (id: string) => {
    setSelectedExercises(prev =>
      prev.includes(id) ? prev.filter(exId => exId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedExercises.length === filteredExercises.length) {
      setSelectedExercises([]);
    } else {
      setSelectedExercises(filteredExercises.map(ex => ex.id));
    }
  };

  // ... (existing filteredExercises memo)

  // ... (existing handlers)

  if (loading) {
    // ... (existing loading state)
    return <div>Loading...</div>; // (placeholder for brevity, keeping original loading is fine)
  }

  return (
    <div className="space-y-4 pb-20"> {/* pb-20 for floating bar space */}
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        {/* ... (existing search bar and filters) */}

        {/* Filter Chips & View Toggle & Selection Mode */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* ... (existing filter buttons) */}
            <Button
              variant={isSelectionMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedExercises([]);
              }}
              className="h-8 border-dashed"
            >
              {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar Vários'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isSelectionMode && (
              <div className="flex items-center gap-2 mr-4 animate-in fade-in slide-in-from-right-4">
                <Checkbox
                  checked={selectedExercises.length > 0 && selectedExercises.length === filteredExercises.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Selecionar Todos
                </span>
              </div>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {filteredExercises.length} resultado{filteredExercises.length !== 1 ? 's' : ''}
            </span>
            {/* ... (existing view mode toggle) */}
          </div>
        </div>
      </div>

      {/* Exercise Grid/List */}
      {filteredExercises.length === 0 ? (
        // ... (existing EmptyState)
        <EmptyState icon={Dumbbell} title="Nenhum exercício" />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredExercises.map((exercise) => (
            <div key={exercise.id} className="relative group">
              <ExerciseCard
                exercise={exercise}
                isFavorite={isFavorite(exercise.id)}
                onToggleFavorite={() => toggleFavorite(exercise.id)}
                onView={() => setViewExercise(exercise)}
                onEdit={() => onEditExercise(exercise)}
                onDelete={() => setDeleteId(exercise.id)}
              />
              {isSelectionMode && (
                <div className="absolute top-2 right-2 z-20">
                  <Checkbox
                    checked={selectedExercises.includes(exercise.id)}
                    onCheckedChange={() => toggleSelection(exercise.id)}
                    className="h-6 w-6 border-2 bg-background data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExercises.map((exercise) => (
            <div key={exercise.id} className="relative flex items-center gap-2">
              {isSelectionMode && (
                <Checkbox
                  checked={selectedExercises.includes(exercise.id)}
                  onCheckedChange={() => toggleSelection(exercise.id)}
                />
              )}
              <div className="flex-1">
                <ExerciseListItem
                  exercise={exercise}
                  isFavorite={isFavorite(exercise.id)}
                  onToggleFavorite={() => toggleFavorite(exercise.id)}
                  onView={() => setViewExercise(exercise)}
                  onEdit={() => onEditExercise(exercise)}
                  onDelete={() => setDeleteId(exercise.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Bar */}
      {isSelectionMode && selectedExercises.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <span className="font-medium">{selectedExercises.length} selecionados</span>
          <div className="h-4 w-px bg-background/20" />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowCreateTemplateModal(true)}
          >
            Criar Template
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              selectedExercises.forEach(id => {
                if (!isFavorite(id)) toggleFavorite(id);
              });
              setIsSelectionMode(false);
              setSelectedExercises([]);
            }}
          >
            Favoritar Todos
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      {/* ... (existing AlertDialog) */}

      {/* View Modal */}
      {/* ... (existing ExerciseViewModal) */}

      {/* Create Template Modal */}
      <CreateTemplateFromSelectionModal
        open={showCreateTemplateModal}
        onOpenChange={setShowCreateTemplateModal}
        selectedExerciseIds={selectedExercises}
        onSuccess={() => {
          setShowCreateTemplateModal(false);
          setIsSelectionMode(false);
          setSelectedExercises([]);
        }}
      />
    </div>
  );
}
