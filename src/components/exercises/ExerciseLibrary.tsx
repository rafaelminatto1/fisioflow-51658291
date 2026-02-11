import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {

  Play, Search, Edit, Trash2, Heart, Dumbbell,
  Video, Clock, Repeat, LayoutGrid, List, VideoOff,
  Eye, MoreVertical, Merge, Plus, CheckCircle2
} from 'lucide-react';
import { EQUIPMENT, HOME_EQUIPMENT_GROUP, NO_EQUIPMENT_GROUP_ID } from '@/lib/constants/exerciseConstants';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ExerciseViewModal } from './ExerciseViewModal';
import { EmptyState } from '@/components/ui/empty-state';
import { ExerciseFiltersPanel, type ExerciseFiltersState } from './ExerciseFiltersPanel';
import { MergeExercisesModal } from './MergeExercisesModal';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateTemplateFromSelectionModal } from './CreateTemplateFromSelectionModal';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { withImageParams } from '@/lib/storageProxy';
import * as ReactWindow from 'react-window';
const { FixedSizeGrid: Grid, FixedSizeList } = ReactWindow;
import type { ListChildComponentProps, GridChildComponentProps } from 'react-window';

// Custom AutoSizer component to avoid react-virtualized import issues
function AutoSizer({ children }: { children: (size: { width: number; height: number }) => React.ReactElement }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}
import { useDebounce } from '@/hooks/performance/useDebounce';


interface ExerciseLibraryProps {
  onSelectExercise?: (exercise: Exercise) => void;
  onEditExercise: (exercise: Exercise) => void;
  /** When true, shows 'Adicionar' button instead of 'Ver Detalhes' */
  selectionMode?: boolean;
  /** List of exercise IDs already added to the session */
  addedExerciseIds?: string[];
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

const ExerciseCard = React.memo(function ExerciseCard({
  exercise,
  isFavorite,
  onToggleFavorite,
  onView,
  onEdit,
  onDelete,
  selectionMode,
  isAdded,
  onAdd,
  imagePriority = false,
}: {
  exercise: Exercise;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectionMode?: boolean;
  isAdded?: boolean;
  onAdd?: () => void;
  /** Prioridade de carregamento (above-the-fold): eager + fetchPriority high */
  imagePriority?: boolean;
}) {
  const diffConfig = exercise.difficulty ? difficultyConfig[exercise.difficulty] : null;
  const catColor = exercise.category ? categoryColors[exercise.category] || 'bg-muted text-muted-foreground' : '';
  const thumbSrc = exercise.image_url
    ? withImageParams(exercise.image_url, { width: 400, height: 300, format: 'auto', fit: 'cover', quality: 75, dpr: 1 })
    : undefined;

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-primary/40 hover:-translate-y-1 will-change-transform touch-manipulation h-full flex flex-col">
      {/* Image Section */}
      <div className="relative h-44 bg-gradient-to-br from-muted to-muted/50 overflow-hidden flex-shrink-0">
        {thumbSrc ? (
          <OptimizedImage
            src={thumbSrc}
            alt={exercise.name ?? 'Exercício'}
            className="h-full w-full transition-transform duration-500 group-hover:scale-110"
            aspectRatio="4:3"
            fallback="/placeholder.svg"
            priority={imagePriority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="p-4 rounded-full bg-primary/10">
              <Dumbbell className="h-10 w-10 text-primary/40" />
            </div>
          </div>
        )}

        {/* Overlay Gradient - pointer-events-none to prevent blocking touch */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg touch-manipulation",
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

        {/* Quick View on Hover - pointer-events-none on mobile to prevent blocking */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none md:pointer-events-auto">
          <Button
            onClick={onView}
            size="lg"
            className="shadow-2xl gap-2 bg-white/95 text-foreground hover:bg-white touch-manipulation"
          >
            <Play className="h-5 w-5" />
            Visualizar
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="space-y-1 flex-1">
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {exercise.name ?? 'Sem nome'}
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
        {(exercise.sets || exercise.repetitions || exercise.duration) ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50 min-h-[28px]">
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
        ) : (
          <div className="min-h-[28px]" />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {selectionMode ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (!isAdded && onAdd) onAdd();
              }}
              className={cn(
                "flex-1 gap-2 transition-all touch-manipulation",
                isAdded
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-primary hover:bg-primary/90"
              )}
              size="sm"
              disabled={isAdded}
            >
              {isAdded ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Adicionado
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Adicionar
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={onView}
              className="flex-1 gap-2 touch-manipulation"
              size="sm"
            >
              <Eye className="h-4 w-4" />
              Ver Detalhes
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 touch-manipulation">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} className="touch-manipulation">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFavorite} className="touch-manipulation">
                <Heart className={cn("h-4 w-4 mr-2", isFavorite && "fill-rose-500 text-rose-500")} />
                {isFavorite ? 'Remover favorito' : 'Adicionar favorito'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive touch-manipulation">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
});

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
  const thumbSrc = exercise.image_url
    ? withImageParams(exercise.image_url, { width: 120, height: 120, format: 'auto', fit: 'cover', quality: 70, dpr: 1 })
    : undefined;

  return (
    <Card className="p-4 hover:shadow-md transition-all hover:border-primary/30 group touch-manipulation">
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {thumbSrc ? (
            <OptimizedImage
              src={thumbSrc}
              alt={exercise.name ?? 'Exercício'}
              className="w-full h-full object-cover"
              aspectRatio="1:1"
              fallback="/placeholder.svg"
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
              {exercise.name ?? 'Sem nome'}
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
            className={cn("h-9 w-9 touch-manipulation", isFavorite && "text-rose-500")}
            onClick={onToggleFavorite}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>
          <Button onClick={onView} size="sm" className="gap-2 touch-manipulation">
            <Play className="h-4 w-4" />
            Ver
          </Button>
          <Button onClick={onEdit} variant="outline" size="icon" className="h-8 w-8 touch-manipulation">
            <Edit className="h-4 w-4" />
          </Button>
          <Button onClick={onDelete} variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive touch-manipulation">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
});

export function ExerciseLibrary({ onSelectExercise, onEditExercise, selectionMode = false, addedExerciseIds = [] }: ExerciseLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filter panel state
  const [advancedFilters, setAdvancedFilters] = useState<ExerciseFiltersState>({
    bodyParts: [],
    difficulty: [],
    categories: [],
    equipment: [],
    homeOnly: false,
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'no-video'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewExercise, setViewExercise] = useState<Exercise | null>(null);

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const { exercises, loading, deleteExercise, mergeExercises, isDeleting, _isMerging } = useExercises();
  const { isFavorite, toggleFavorite } = useExerciseFavorites();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredExercises = useMemo(() => {
    return exercises
      .filter((ex): ex is Exercise => ex != null && typeof ex === 'object')
      .filter(exercise => {
        // Text search
        const matchesSearch = (exercise.name?.toLowerCase() || '').includes(debouncedSearchTerm.toLowerCase()) ||
          (exercise.description?.toLowerCase() || '').includes(debouncedSearchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Quick filters
        if (activeFilter === 'favorites') return isFavorite(exercise.id);
        if (activeFilter === 'no-video') return !exercise.video_url;

        // Advanced filters - Body Parts
        if (advancedFilters.bodyParts.length > 0) {
          const exerciseBodyParts = exercise.body_parts || [];
          const hasMatchingBodyPart = advancedFilters.bodyParts.some(bp =>
            exerciseBodyParts.some(ebp => ebp.toLowerCase().includes(bp.toLowerCase()))
          );
          if (!hasMatchingBodyPart) return false;
        }

        // Advanced filters - Difficulty
        if (advancedFilters.difficulty.length > 0) {
          if (!exercise.difficulty || !advancedFilters.difficulty.includes(exercise.difficulty)) {
            return false;
          }
        }

        // Advanced filters - Categories
        if (advancedFilters.categories.length > 0) {
          if (!exercise.category || !advancedFilters.categories.includes(exercise.category)) {
            return false;
          }
        }

        // Advanced filters - Equipment
        if (advancedFilters.equipment.length > 0) {
          const exerciseEquipment = exercise.equipment || [];

          const hasMatchingEquipment = advancedFilters.equipment.some(eq => {
            // Handle the special "No Equipment / Adaptive" group
            if (eq === NO_EQUIPMENT_GROUP_ID) {
              const homeGroupLabels = EQUIPMENT
                .filter(e => HOME_EQUIPMENT_GROUP.includes(e.value))
                .map(e => e.label);
              return exerciseEquipment.some(eeq => homeGroupLabels.some(hgl => eeq.toLowerCase() === hgl.toLowerCase()));
            }

            return exerciseEquipment.some(eeq => eeq.toLowerCase().includes(eq.toLowerCase()));
          });

          if (!hasMatchingEquipment) return false;
        }

        // Home-only filter
        if (advancedFilters.homeOnly) {
          const homeEquipmentLabels = EQUIPMENT
            .filter(e => e.homeFrequency === 'always' || e.homeFrequency === 'common')
            .map(e => e.label);

          const exerciseEquipment = exercise.equipment || [];
          const isHomeExercise = exerciseEquipment.length === 0 ||
            exerciseEquipment.every(eq => homeEquipmentLabels.some(he => eq.toLowerCase().includes(he.toLowerCase())));
          if (!isHomeExercise) return false;
        }

        return true;
      });
  }, [exercises, debouncedSearchTerm, activeFilter, isFavorite, advancedFilters]);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteExercise(deleteId);
      setDeleteId(null);
    }
  };

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

  const GridRow = ({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
    const { items, columnCount } = data;
    const index = rowIndex * columnCount + columnIndex;

    if (index >= items.length) {
      return null;
    }

    const exercise = items[index];
    const gutter = 16;

    // Adjust style for gutter
    const itemStyle = {
      ...style,
      left: Number(style.left) + gutter,
      top: Number(style.top) + gutter,
      width: Number(style.width) - gutter,
      height: Number(style.height) - gutter
    };

    return (
      <div style={itemStyle}>
        <div key={exercise.id} className="relative group h-full">
          <ExerciseCard
            exercise={exercise}
            isFavorite={isFavorite(exercise.id)}
            onToggleFavorite={() => toggleFavorite(exercise.id)}
            onView={() => setViewExercise(exercise)}
            onEdit={() => onEditExercise(exercise)}
            onDelete={() => setDeleteId(exercise.id)}
            selectionMode={selectionMode}
            isAdded={addedExerciseIds.includes(exercise.id)}
            onAdd={() => onSelectExercise && onSelectExercise(exercise)}
            imagePriority={index < 6}
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
      </div>
    );
  };

  const ListRow = ({ index, style, data }: ListChildComponentProps) => {
    const exercise = data[index];
    const gutter = 8;

    const itemStyle = {
      ...style,
      height: Number(style.height) - gutter,
      marginBottom: gutter
    };

    return (
      <div style={itemStyle}>
        <div key={exercise.id} className="relative flex items-center gap-2 h-full">
          {isSelectionMode && (
            <Checkbox
              checked={selectedExercises.includes(exercise.id)}
              onCheckedChange={() => toggleSelection(exercise.id)}
            />
          )}
          <div className="flex-1 h-full">
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
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 pb-20">
        {/* Search/filters skeleton */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
        {/* Card grid skeleton - mimics real cards (image + content) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="relative h-44 bg-muted">
                <Skeleton className="h-full w-full rounded-none" />
              </div>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-9 flex-1 rounded-md" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 h-[calc(100vh-200px)] flex flex-col"> {/* Fixed height container for AutoSizer */}
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercícios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center border rounded-lg p-1">
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

        {/* Filter Chips & View Toggle & Selection Mode */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={activeFilter === 'all' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="h-8"
            >
              Todos
            </Button>
            <Button
              variant={activeFilter === 'favorites' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('favorites')}
              className="h-8"
            >
              <Heart className="h-3 w-3 mr-2" />
              Favoritos
            </Button>
            <Button
              variant={activeFilter === 'no-video' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('no-video')}
              className="h-8"
            >
              <VideoOff className="h-3 w-3 mr-2" />
              Sem Vídeo
            </Button>
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

            </div>
          </div>

          {/* Advanced Filters Panel - Always Visible */}
          <div className="animate-in slide-in-from-top-2 duration-200">
            <ExerciseFiltersPanel
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              totalCount={exercises.length}
              filteredCount={filteredExercises.length}
            />
          </div>
        </div>
      </div>

      {/* Exercise Grid/List */}
      <div className="flex-1 overflow-y-auto">
        {filteredExercises.length === 0 ? (
          <EmptyState icon={Dumbbell} title="Nenhum exercício" />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-2">
            {filteredExercises.map((exercise, index) => (
              <div key={exercise.id} className="relative group">
                <ExerciseCard
                  exercise={exercise}
                  isFavorite={isFavorite(exercise.id)}
                  onToggleFavorite={() => toggleFavorite(exercise.id)}
                  onView={() => setViewExercise(exercise)}
                  onEdit={() => onEditExercise(exercise)}
                  onDelete={() => setDeleteId(exercise.id)}
                  selectionMode={selectionMode}
                  isAdded={addedExerciseIds.includes(exercise.id)}
                  onAdd={() => onSelectExercise && onSelectExercise(exercise)}
                  imagePriority={index < 6}
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
          <div className="space-y-2 p-2">
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
      </div>

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
          {selectedExercises.length >= 2 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowMergeModal(true)}
              className="gap-1"
            >
              <Merge className="h-3 w-3" />
              Unir Exercícios
            </Button>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o exercício
              da sua biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Modal */}
      {viewExercise && (
        <ExerciseViewModal
          exercise={viewExercise}
          open={!!viewExercise}
          onOpenChange={(open) => !open && setViewExercise(null)}
          onEdit={() => {
            setViewExercise(null);
            onEditExercise(viewExercise);
          }}
        />
      )}

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

      {/* Merge Exercises Modal */}
      <MergeExercisesModal
        open={showMergeModal}
        onOpenChange={setShowMergeModal}
        exercises={exercises.filter(e => selectedExercises.includes(e.id))}
        onMerge={async (keepId, mergeIds) => {
          await mergeExercises(keepId, mergeIds);
          setShowMergeModal(false);
          setIsSelectionMode(false);
          setSelectedExercises([]);
        }}
      />
    </div>
  );
}
