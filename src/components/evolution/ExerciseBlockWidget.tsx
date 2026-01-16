import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useExercises } from '@/hooks/useExercises';
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
import { type Exercise } from '@/hooks/useExercises';
import { Card } from '@/components/ui/card';

// ============================================================================================
// TYPES & INTERFACES
// ============================================================================================

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
    addExercise: 'Adicionar exercício à sessão',
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

const formatExerciseSummary = (exercise: SessionExercise): string => {
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

const ExerciseCard = memo<ExerciseCardProps>(({ exercise, index, disabled, onUpdate, onRemove }) => {
    const handleUpdate = useCallback((field: keyof SessionExercise, value: string | number | boolean) => {
        onUpdate(exercise.id, field, value);
    }, [exercise.id, onUpdate]);

    const toggleCompleted = useCallback(() => {
        handleUpdate('completed', !exercise.completed);
    }, [exercise.completed, handleUpdate]);

    const statusLabel = exercise.completed ? 'Marcar como pendente' : 'Marcar como concluído';
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
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<ExerciseFilters>({});
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

    // Debounce da busca para melhorar performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [searchTerm]);

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

    const handleAddExercise = useCallback((exerciseId: string) => {
        const exercise = availableExercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        onChange([...exercises, createSessionExercise(exercise)]);
        setSelectedExerciseId('');
    }, [availableExercises, exercises, onChange]);

    const handleUpdateExercise = useCallback((id: string, field: keyof SessionExercise, value: string | number | boolean) => {
        onChange(exercises.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    }, [exercises, onChange]);

    const handleRemoveExercise = useCallback((id: string) => {
        onChange(exercises.filter(e => e.id !== id));
    }, [exercises, onChange]);

    // Fechar popover ao adicionar exercício
    useEffect(() => {
        if (selectedExerciseId) {
            setShowFilters(false);
        }
    }, [selectedExerciseId]);

    // Handler to add exercise from the library modal
    const handleAddExerciseFromLibrary = useCallback((exercise: Exercise) => {
        onChange([...exercises, createSessionExercise(exercise)]);
    }, [exercises, onChange]);

    // Handler para abrir o modal da biblioteca
    const openLibraryModal = useCallback(() => setIsLibraryModalOpen(true), []);

    // Handler para remover exercício (para uso com onClick inline)
    const handleRemove = useCallback((id: string) => {
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
                <div className="p-2.5 border-b flex items-center justify-between gap-2 shrink-0 bg-muted/20">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                        <Input
                            placeholder="Buscar exercícios..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-10 text-sm"
                            aria-label={ARIA_LABELS.search}
                            disabled={isLoading}
                        />
                        {isLoading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Filtros */}
                        <Popover open={showFilters} onOpenChange={setShowFilters}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-8 px-2.5 gap-1.5 text-sm font-medium relative transition-colors",
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

                        {/* Botão Adicionar */}
                        <Select
                            value={selectedExerciseId}
                            onValueChange={handleAddExercise}
                            disabled={disabled || filteredExercises.length === 0 || isLoading}
                        >
                            <SelectTrigger
                                className="h-8 w-[140px] text-sm"
                                aria-label={ARIA_LABELS.addExercise}
                            >
                                <SelectValue placeholder="Adicionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoading ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                                        <p>{EMPTY_STATE_MESSAGES.loading.title}</p>
                                    </div>
                                ) : filteredExercises.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        <Dumbbell className="h-6 w-6 mx-auto mb-2 opacity-30" />
                                        <p>{EMPTY_STATE_MESSAGES.noResults.title}</p>
                                        <p className="text-xs mt-1">{EMPTY_STATE_MESSAGES.noResults.description}</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[220px]">
                                        <div className="p-1.5" role="listbox">
                                            {filteredExercises.map((exercise) => (
                                                <SelectItem
                                                    key={exercise.id}
                                                    value={exercise.id}
                                                    className="text-sm cursor-pointer"
                                                    role="option"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="font-medium">{exercise.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {exercise.sets}s × {exercise.repetitions}r
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </SelectContent>
                        </Select>

                        {/* Botão Repetir Sessão Anterior */}
                        {onRepeatLastSession && hasLastSession && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRepeatLastSession}
                                        className="h-8 px-2.5 gap-1.5 text-sm font-medium border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50 transition-all"
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
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4" role="list">
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
