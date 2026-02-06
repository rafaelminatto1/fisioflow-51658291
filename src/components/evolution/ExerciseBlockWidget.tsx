
// ============================================================================================
// TYPES & INTERFACES
// ============================================================================================

import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Dumbbell, Search, Sparkles, Filter, X, CheckCircle2, Circle, Loader2, Library, RotateCcw, ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SessionExercise } from './SessionExercisesPanel';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExerciseFilters } from '@/services/exercises';
import { ExerciseLibraryModal } from '../exercises/ExerciseLibraryModal';
import { Card } from '@/components/ui/card';

interface ExerciseBlockWidgetProps {
    exercises: SessionExercise[];
    onChange: (exercises: SessionExercise[]) => void;
    onSuggest?: () => void;
    onRepeatLastSession?: () => void;
    hasLastSession?: boolean;
    disabled?: boolean;
    className?: string;
}

interface ExerciseCardProps {
    exercise: SessionExercise;
    index: number;
    disabled: boolean;
    onUpdate: (id: string, field: keyof SessionExercise, value: string | number | boolean) => void;
    onRemove: (id: string) => void;
}

interface FilterPopoverContentProps {
    categories: string[];
    difficulties: readonly ['Fácil', 'Média', 'Difícil'];
    bodyParts: string[];
    filters: ExerciseFilters;
    activeFiltersCount: number;
    filteredCount: number;
    onFilterChange: (key: keyof ExerciseFilters, value: string | string[] | undefined) => void;
    onToggleBodyPart: (bodyPart: string) => void;
    onClearFilters: () => void;
}

// ============================================================================================
// CONSTANTS
// ============================================================================================

const DIFFICULTY_LEVELS = ['Fácil', 'Média', 'Difícil'] as const;
const MAX_BODY_PARTS_DISPLAY = 8;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_STATE_MESSAGES = {
    noExercises: {
        title: 'Nenhum exercício adicionado',
        description: 'Use a busca e filtros acima para encontrar e adicionar exercícios à sessão',
    },
    noResults: {
        title: 'Nenhum exercício encontrado',
        description: 'Tente ajustar os filtros ou o termo de busca',
    },
    loading: {
        title: 'Carregando exercícios...',
        description: 'Buscando biblioteca de exercícios',
    },
} as const;

const ARIA_LABELS = {
    search: 'Buscar exercícios por nome',
    filters: 'Filtros de exercícios',
    clearFilters: 'Limpar todos os filtros',
    suggestExercises: 'Sugerir exercícios baseados na evolução',
    removeExercise: 'Remover exercício',
    toggleCompleted: 'Marcar como concluído',
    togglePending: 'Marcar como pendente',
    sets: 'Número de séries',
    reps: 'Número de repetições',
    weight: 'Carga utilizada',
    observations: 'Observações sobre a execução',
} as const;

// ============================================================================================
// UTILITY FUNCTIONS
// ============================================================================================

const generateSessionId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

/**
 * Creates a SessionExercise from an Exercise, ensuring all required fields are present
 * including the image_url for proper display in the exercise cards.
 */
const createSessionExercise = (exercise: Exercise): SessionExercise => ({
    id: generateSessionId(),
    exerciseId: exercise.id,
    name: exercise.name,
    sets: exercise.sets || 3,
    repetitions: exercise.repetitions || 10,
    completed: false,
    observations: '',
    weight: '',
    image_url: exercise.image_url,
});

const _formatExerciseSummary = (exercise: SessionExercise): string => {
    const parts = [`${exercise.sets}s`, `${exercise.repetitions}r`];
    if (exercise.weight) parts.push(exercise.weight);
    return parts.join(' × ');
};

// ============================================================================================
// MEMOIZED SUB-COMPONENTS
// ============================================================================================

/**
 * Exercise image component with error handling and fallback
 */
const ExerciseImage = memo(({ src, alt, className }: { src?: string; alt: string; className?: string }) => {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Reset error state when src changes
    useEffect(() => {
        setHasError(false);
        setIsLoading(true);
    }, [src]);

    if (!src || hasError) {
        return (
            <div className={cn("flex items-center justify-center", className)}>
                <div className="p-3 rounded-full bg-primary/5">
                    <ImageOff className="h-8 w-8 text-muted-foreground/30" />
                </div>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
                "transition-opacity duration-300",
                isLoading ? "opacity-0" : "opacity-100",
                className
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
                setHasError(true);
                setIsLoading(false);
            }}
        />
    );
});

ExerciseImage.displayName = 'ExerciseImage';

const FilterPopoverContent: React.FC<FilterPopoverContentProps> = memo(({
    categories,
    difficulties,
    bodyParts,
    filters,
    activeFiltersCount,
    filteredCount,
    onFilterChange,
    onToggleBodyPart,
    onClearFilters,
}) => (
    <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Filtros</span>
            {activeFiltersCount > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    aria-label={ARIA_LABELS.clearFilters}
                >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                </Button>
            )}
        </div>

        {/* Categoria */}
        {categories.length > 0 && (
            <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="filter-category">
                    Categoria
                </Label>
                <Select
                    value={filters.category || 'all'}
                    onValueChange={(value) => onFilterChange('category', value === 'all' ? undefined : value)}
                >
                    <SelectTrigger className="h-8 text-sm" id="filter-category">
                        <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-sm">Todas</SelectItem>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        {/* Dificuldade */}
        <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="filter-difficulty">
                Dificuldade
            </Label>
            <Select
                value={filters.difficulty || 'all'}
                onValueChange={(value) => onFilterChange('difficulty', value === 'all' ? undefined : value)}
            >
                <SelectTrigger className="h-8 text-sm" id="filter-difficulty">
                    <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-sm">Todas</SelectItem>
                    {difficulties.map(diff => (
                        <SelectItem key={diff} value={diff} className="text-sm">{diff}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* Partes do corpo */}
        {bodyParts.length > 0 && (
            <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                    Partes do corpo
                </Label>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtro por partes do corpo">
                    {bodyParts.slice(0, MAX_BODY_PARTS_DISPLAY).map(part => (
                        <Badge
                            key={part}
                            variant={filters.bodyParts?.includes(part) ? "default" : "outline"}
                            className={cn(
                                "text-[10px] px-2.5 py-0.5 cursor-pointer h-6 whitespace-nowrap font-medium transition-colors",
                                !filters.bodyParts?.includes(part) && "hover:bg-muted/50"
                            )}
                            onClick={() => onToggleBodyPart(part)}
                            role="checkbox"
                            aria-checked={filters.bodyParts?.includes(part) || false}
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onToggleBodyPart(part);
                                }
                            }}
                        >
                            {part}
                        </Badge>
                    ))}
                    {bodyParts.length > MAX_BODY_PARTS_DISPLAY && (
                        <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 h-6 text-muted-foreground">
                            +{bodyParts.length - MAX_BODY_PARTS_DISPLAY}
                        </Badge>
                    )}
                </div>
            </div>
        )}

        {/* Resultados */}
        <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground" aria-live="polite">
                <span className="font-semibold text-foreground">{filteredCount}</span>
                {' '}{filteredCount === 1 ? 'exercício encontrado' : 'exercícios encontrados'}
            </p>
        </div>
    </div>
));

FilterPopoverContent.displayName = 'FilterPopoverContent';

// ============================================================================================
// EXERCISE AUTOCOMPLETE SEARCH COMPONENT
// ============================================================================================

interface ExerciseAutocompleteSearchProps {
    exercises: Exercise[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onSelectExercise: (exercise: Exercise) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

const ExerciseAutocompleteSearch = memo<ExerciseAutocompleteSearchProps>(({
    exercises,
    searchTerm,
    onSearchChange,
    onSelectExercise,
    isLoading = false,
    disabled = false
}) => {
    const [open, setOpen] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Show dropdown when typing
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onSearchChange(value);
        if (value.length > 0) {
            setOpen(true);
        }
    }, [onSearchChange]);

    // Handle selecting an exercise
    const handleSelect = useCallback((exercise: Exercise) => {
        onSelectExercise(exercise);
        onSearchChange(''); // Clear the search after selection
        setOpen(false);
        inputRef.current?.focus();
    }, [onSelectExercise, onSearchChange]);

    // Close dropdown when clicking outside
    const handleOpenChange = useCallback((isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            // Keep search term when closing without selection
        }
    }, []);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
        } else if (e.key === 'ArrowDown' && !open && searchTerm.length > 0) {
            setOpen(true);
        }
    }, [open, searchTerm]);

    const displayedExercises = useMemo(() => exercises.slice(0, 15), [exercises]);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <div className="flex-1 min-w-[180px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <Input
                        ref={inputRef}
                        placeholder="Buscar e adicionar exercícios..."
                        value={searchTerm}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => searchTerm.length > 0 && setOpen(true)}
                        className="h-8 pl-9 pr-8 text-xs shadow-sm bg-background border-muted-foreground/20 focus:border-primary/50 transition-colors"
                        aria-label={ARIA_LABELS.search}
                        disabled={disabled || isLoading}
                        autoComplete="off"
                    />
                    {isLoading ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                    ) : searchTerm && (
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => {
                                onSearchChange('');
                                setOpen(false);
                            }}
                            aria-label="Limpar busca"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-[400px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <ScrollArea className="max-h-[320px]">
                    {displayedExercises.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <Dumbbell className="h-8 w-8 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">{EMPTY_STATE_MESSAGES.noResults.title}</p>
                            <p className="text-xs mt-1">{EMPTY_STATE_MESSAGES.noResults.description}</p>
                        </div>
                    ) : (
                        <div className="p-1" role="listbox">
                            {displayedExercises.map((exercise) => (
                                <button
                                    key={exercise.id}
                                    type="button"
                                    className="w-full flex items-center gap-3 p-2.5 rounded-md text-left hover:bg-accent focus:bg-accent focus:outline-none transition-colors cursor-pointer"
                                    onClick={() => handleSelect(exercise)}
                                    role="option"
                                >
                                    <div className="h-12 w-12 flex-shrink-0 rounded-md bg-muted overflow-hidden">
                                        {exercise.image_url ? (
                                            <img
                                                src={exercise.image_url}
                                                alt={exercise.name}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <Dumbbell className="h-5 w-5 text-muted-foreground/40" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{exercise.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="truncate">{exercise.category}</span>
                                            <span className="text-[10px]">•</span>
                                            <span>{exercise.sets}s × {exercise.repetitions}r</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {exercises.length > 15 && (
                                <p className="text-center text-xs text-muted-foreground py-2 border-t">
                                    +{exercises.length - 15} exercícios. Continue digitando para filtrar.
                                </p>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
});

ExerciseAutocompleteSearch.displayName = 'ExerciseAutocompleteSearch';


const ExerciseCard = memo<ExerciseCardProps>(({ exercise, index, disabled, onUpdate, onRemove }) => {
    const handleUpdate = useCallback((field: keyof SessionExercise, value: string | number | boolean) => {
        onUpdate(exercise.id, field, value);
    }, [exercise.id, onUpdate]);

    const toggleCompleted = useCallback(() => {
        handleUpdate('completed', !exercise.completed);
    }, [exercise.completed, handleUpdate]);

    const _statusLabel = exercise.completed ? 'Marcar como pendente' : 'Marcar como concluído';
    const statusIcon = exercise.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />;

    return (
        <Card
            className={cn(
                "group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/50 relative border-2",
                exercise.completed ? "border-green-500/30 bg-green-500/5 shadow-sm shadow-green-500/10" : "border-border/50"
            )}
            role="listitem"
            aria-label={`Exercício ${index + 1}: ${exercise.name}`}
        >
            {/* Visual Indicator for completion */}
            {exercise.completed && (
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500 z-10" />
            )}

            {/* Header / Thumbnail Area */}
            <div className="relative aspect-video w-full bg-muted overflow-hidden shrink-0">
                <ExerciseImage
                    src={exercise.image_url}
                    alt={exercise.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Overlay with index and remove button */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    <div className="flex justify-between items-start">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-[10px] font-bold">
                            {index + 1}
                        </span>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7 rounded-full shadow-lg"
                            onClick={() => onRemove(exercise.id)}
                            disabled={disabled}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Completion Status Badge over image */}
                <div className="absolute bottom-2 right-2">
                    <Button
                        variant={exercise.completed ? "default" : "secondary"}
                        size="sm"
                        className={cn(
                            "h-7 px-2.5 text-[10px] gap-1.5 font-bold shadow-lg transition-all",
                            exercise.completed
                                ? "bg-green-500 hover:bg-green-600 text-white border-none"
                                : "bg-white/90 hover:bg-white text-foreground"
                        )}
                        onClick={toggleCompleted}
                        disabled={disabled}
                    >
                        {statusIcon}
                        <span>{exercise.completed ? 'CONCLUÍDO' : 'PENDENTE'}</span>
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-3 space-y-3 flex-1 flex flex-col">
                <div className="min-w-0">
                    <h4 className="font-bold text-sm leading-tight line-clamp-2 min-h-[2.5rem]" title={exercise.name}>
                        {exercise.name}
                    </h4>
                </div>

                {/* Inputs Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Séries</Label>
                        <Input
                            type="number"
                            value={exercise.sets}
                            onChange={(e) => handleUpdate('sets', parseInt(e.target.value) || 0)}
                            className="h-7 text-xs px-2 font-bold bg-muted/30 focus:bg-background border-none ring-1 ring-border/50"
                            disabled={disabled}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Reps</Label>
                        <Input
                            type="number"
                            value={exercise.repetitions}
                            onChange={(e) => handleUpdate('repetitions', parseInt(e.target.value) || 0)}
                            className="h-7 text-xs px-2 font-bold bg-muted/30 focus:bg-background border-none ring-1 ring-border/50"
                            disabled={disabled}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Peso</Label>
                        <Input
                            value={exercise.weight || ''}
                            onChange={(e) => handleUpdate('weight', e.target.value)}
                            placeholder="kg"
                            className="h-7 text-xs px-2 font-bold bg-muted/30 focus:bg-background border-none ring-1 ring-border/50"
                            disabled={disabled}
                        />
                    </div>
                </div>

                {/* Observations */}
                <div className="space-y-1 mt-auto pt-2 border-t border-dashed">
                    <Label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Observações</Label>
                    <textarea
                        value={exercise.observations || ''}
                        onChange={(e) => handleUpdate('observations', e.target.value)}
                        placeholder="Como foi a execução?"
                        className="w-full text-[10px] p-2 rounded bg-muted/30 focus:bg-background border-none ring-1 ring-border/50 outline-none min-h-[40px] resize-none"
                        disabled={disabled}
                    />
                </div>
            </div>
        </Card>
    );
});

ExerciseCard.displayName = 'ExerciseCard';

// ============================================================================================
// MAIN COMPONENT
// ============================================================================================

export const ExerciseBlockWidget: React.FC<ExerciseBlockWidgetProps> = memo(({
    exercises,
    onChange,
    onSuggest,
    onRepeatLastSession,
    hasLastSession = false,
    disabled = false,
    className
}) => {
    const { exercises: availableExercises, loading: isLoading } = useExercises();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<ExerciseFilters>({});
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

    // Opções de filtros - memoizadas
    const categories = useMemo(() => {
        const uniqueCats = new Set(availableExercises.map(e => e.category).filter(Boolean));
        return Array.from(uniqueCats).sort();
    }, [availableExercises]);

    const bodyParts = useMemo(() => {
        const allParts = availableExercises.flatMap(e => e.body_parts || []);
        const uniqueParts = new Set(allParts.filter(Boolean));
        return Array.from(uniqueParts).sort();
    }, [availableExercises]);

    // Exercícios filtrados - memoizados
    const filteredExercises = useMemo(() => {
        return availableExercises.filter(ex => {
            // Filtro de busca por nome
            if (debouncedSearchTerm && !ex.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
                return false;
            }

            // Filtro de categoria
            if (filters.category && filters.category !== 'all' && ex.category !== filters.category) {
                return false;
            }

            // Filtro de dificuldade
            if (filters.difficulty && filters.difficulty !== 'all' && ex.difficulty !== filters.difficulty) {
                return false;
            }

            // Filtro de partes do corpo
            if (filters.bodyParts && filters.bodyParts.length > 0) {
                const exerciseBodyParts = ex.body_parts || [];
                const hasMatchingPart = filters.bodyParts.some(part => exerciseBodyParts.includes(part));
                if (!hasMatchingPart) return false;
            }

            return true;
        });
    }, [availableExercises, debouncedSearchTerm, filters]);

    // Contagem de filtros ativos - memoizada
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.category && filters.category !== 'all') count++;
        if (filters.difficulty && filters.difficulty !== 'all') count++;
        if (filters.bodyParts && filters.bodyParts.length > 0) count++;
        return count;
    }, [filters]);

    // Handlers com useCallback
    const handleFilterChange = useCallback((key: keyof ExerciseFilters, value: string | string[] | undefined) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const toggleBodyPart = useCallback((bodyPart: string) => {
        setFilters(prev => {
            const current = prev.bodyParts || [];
            const updated = current.includes(bodyPart)
                ? current.filter(bp => bp !== bodyPart)
                : [...current, bodyPart];
            return { ...prev, bodyParts: updated.length > 0 ? updated : undefined };
        });
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({});
        setSearchTerm('');
    }, []);



    const handleUpdateExercise = useCallback((id: string, field: keyof SessionExercise, value: string | number | boolean) => {
        onChange(exercises.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    }, [exercises, onChange]);

    const handleRemoveExercise = useCallback((id: string) => {
        onChange(exercises.filter(e => e.id !== id));
    }, [exercises, onChange]);



    // Handler to add exercise from the library modal
    const handleAddExerciseFromLibrary = useCallback((exercise: Exercise) => {
        onChange([...exercises, createSessionExercise(exercise)]);
    }, [exercises, onChange]);

    // Handler para abrir o modal da biblioteca
    const openLibraryModal = useCallback(() => setIsLibraryModalOpen(true), []);

    // Handler para remover exercício (para uso com onClick inline)
    const _handleRemove = useCallback((id: string) => {
        handleRemoveExercise(id);
    }, [handleRemoveExercise]);

    // Estatísticas da sessão
    const sessionStats = useMemo(() => {
        const completedCount = exercises.filter(e => e.completed).length;
        const allCompleted = exercises.length > 0 && exercises.every(e => e.completed);
        return { completedCount, allCompleted };
    }, [exercises]);

    return (
        <TooltipProvider>
            <div className={cn("flex flex-col h-full", className)}>
                {/* Header: Busca, Filtros e Ações */}
                <div className="p-2.5 border-b flex flex-wrap items-center gap-x-2 gap-y-2.5 shrink-0 bg-muted/20">
                    <ExerciseAutocompleteSearch
                        exercises={filteredExercises}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onSelectExercise={(exercise) => {
                            onChange([...exercises, createSessionExercise(exercise)]);
                        }}
                        isLoading={isLoading}
                        disabled={disabled}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Filtros */}
                        <Popover open={showFilters} onOpenChange={setShowFilters}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-8 sm:h-7 px-2.5 gap-1.5 text-xs font-medium relative transition-colors shadow-sm",
                                        activeFiltersCount > 0 && "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
                                    )}
                                    aria-label={ARIA_LABELS.filters}
                                    aria-expanded={showFilters}
                                >
                                    <Filter className="h-3.5 w-3.5" />
                                    <span>Filtros</span>
                                    {activeFiltersCount > 0 && (
                                        <Badge className="h-4 min-w-4 px-1 text-[10px] bg-purple-600 text-white" aria-label={`${activeFiltersCount} filtros ativos`}>
                                            {activeFiltersCount}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end">
                                <FilterPopoverContent
                                    categories={categories}
                                    difficulties={DIFFICULTY_LEVELS}
                                    bodyParts={bodyParts}
                                    filters={filters}
                                    activeFiltersCount={activeFiltersCount}
                                    filteredCount={filteredExercises.length}
                                    onFilterChange={handleFilterChange}
                                    onToggleBodyPart={toggleBodyPart}
                                    onClearFilters={clearFilters}
                                />
                            </PopoverContent>
                        </Popover>


                        {onRepeatLastSession && hasLastSession && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRepeatLastSession}
                                        className="h-7 px-2 gap-1.5 text-xs font-medium border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50 transition-all"
                                        disabled={disabled}
                                        aria-label="Repetir exercícios da sessão anterior"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                                        <span className="hidden sm:inline">Repetir</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-sm">Repetir da sessão passada</p>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {/* Botão Biblioteca */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={openLibraryModal}
                                    className="h-8 px-2.5 gap-1.5 text-sm font-medium border-dashed border-purple-300 hover:border-purple-400 hover:bg-purple-50 transition-all"
                                    disabled={disabled}
                                    aria-label="Abrir biblioteca de exercícios"
                                >
                                    <Library className="h-3.5 w-3.5 text-purple-600" />
                                    <span className="hidden sm:inline">Biblioteca</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-sm">Abrir biblioteca completa</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Botão Sugerir */}
                        {onSuggest && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onSuggest}
                                        className="h-8 px-3 gap-2 text-sm font-medium text-purple-700 border-purple-300 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-all"
                                        disabled={disabled || exercises.length === 0}
                                        aria-label={ARIA_LABELS.suggestExercises}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        <span className="hidden sm:inline">Sugerir</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-sm">Sugerir exercícios baseados na evolução</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* Lista de exercícios */}
                <ScrollArea className="flex-1">
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3" role="list">
                        {exercises.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20">
                                <Dumbbell className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">{EMPTY_STATE_MESSAGES.noExercises.title}</p>
                                <p className="text-xs mt-1 text-center max-w-[250px]">
                                    {EMPTY_STATE_MESSAGES.noExercises.description}
                                </p>
                            </div>
                        ) : (
                            exercises.map((exercise, index) => (
                                <ExerciseCard
                                    key={exercise.id}
                                    exercise={exercise}
                                    index={index}
                                    disabled={disabled}
                                    onUpdate={handleUpdateExercise}
                                    onRemove={handleRemoveExercise}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Footer com resumo */}
                {exercises.length > 0 && (
                    <div className="p-2.5 border-t bg-muted/30 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                            <span className="font-semibold text-foreground">{exercises.length}</span>
                            {exercises.length === 1 ? ' exercício' : ' exercícios'}
                        </span>
                        <Badge
                            variant="secondary"
                            className={cn(
                                "font-medium transition-colors",
                                sessionStats.allCompleted
                                    ? "bg-green-100 text-green-700 border-green-200"
                                    : "bg-muted"
                            )}
                        >
                            {sessionStats.completedCount} de {exercises.length} concluídos
                        </Badge>
                    </div>
                )}
            </div>

            {/* Exercise Library Modal - outside main div but inside TooltipProvider */}
            <ExerciseLibraryModal
                open={isLibraryModalOpen}
                onOpenChange={setIsLibraryModalOpen}
                onSelectExercise={handleAddExerciseFromLibrary}
                addedExerciseIds={exercises.map(e => e.exerciseId)}
            />
        </TooltipProvider>
    );
});

ExerciseBlockWidget.displayName = 'ExerciseBlockWidget';

export default ExerciseBlockWidget;
