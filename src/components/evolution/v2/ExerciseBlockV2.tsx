import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Dumbbell,
  Plus,
  X,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Frown,
  Flame,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Search,
  Library,
  ImageOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { withImageParams } from '@/lib/storageProxy';
import type { ExerciseV2Item, ExerciseFeedback } from './types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface ExerciseBlockV2Props {
  exercises: ExerciseV2Item[];
  onChange: (exercises: ExerciseV2Item[]) => void;
  disabled?: boolean;
  className?: string;
}

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'ex_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const ExerciseBlockV2: React.FC<ExerciseBlockV2Props> = ({
  exercises,
  onChange,
  disabled = false,
  className,
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const { exercises: libraryExercises } = useExercises();
  const [searchValue, setSearchValue] = useState('');

  const completedCount = exercises.filter((e) => e.completed).length;
  const issueCount = exercises.filter(
    (e) => e.patientFeedback?.pain || e.patientFeedback?.fatigue || e.patientFeedback?.difficultyPerforming
  ).length;

  const filteredLibrary = useMemo(() => {
    if (!searchValue) return libraryExercises.slice(0, 15);
    return libraryExercises
      .filter((ex) => ex.name.toLowerCase().includes(searchValue.toLowerCase()))
      .slice(0, 15);
  }, [libraryExercises, searchValue]);

  const handleAddFromLibrary = useCallback(
    (exercise: Exercise) => {
      const newExercise: ExerciseV2Item = {
        id: generateId(),
        exerciseId: exercise.id,
        name: exercise.name,
        prescription: `${exercise.sets || 3}x${exercise.repetitions || 10}rep`,
        completed: false,
        image_url: exercise.image_url,
      };
      onChange([...exercises, newExercise]);
      setShowAutocomplete(false);
      setSearchValue('');
    },
    [exercises, onChange]
  );

  const handleQuickAdd = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && quickAddValue.trim()) {
        // Parse quick-add format: "Exercise name 3x10rep" or just "Exercise name"
        const match = quickAddValue.match(/^(.+?)(?:\s+(\d+x\d+\w*))?$/);
        const name = match?.[1]?.trim() || quickAddValue.trim();
        const prescription = match?.[2] || '3x10rep';

        const newExercise: ExerciseV2Item = {
          id: generateId(),
          name,
          prescription,
          completed: false,
        };
        onChange([...exercises, newExercise]);
        setQuickAddValue('');
      } else if (e.key === 'Tab' && quickAddValue.trim()) {
        e.preventDefault();
        // Tab triggers autocomplete search
        const match = libraryExercises.find((ex) =>
          ex.name.toLowerCase().startsWith(quickAddValue.toLowerCase())
        );
        if (match) {
          handleAddFromLibrary(match);
          setQuickAddValue('');
        }
      }
    },
    [quickAddValue, exercises, onChange, libraryExercises, handleAddFromLibrary]
  );

  const handleToggle = useCallback(
    (id: string) => {
      onChange(
        exercises.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
      );
    },
    [exercises, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(exercises.filter((e) => e.id !== id));
    },
    [exercises, onChange]
  );

  const handleUpdatePrescription = useCallback(
    (id: string, prescription: string) => {
      onChange(
        exercises.map((e) => (e.id === id ? { ...e, prescription } : e))
      );
    },
    [exercises, onChange]
  );

  const handleUpdateFeedback = useCallback(
    (id: string, field: keyof ExerciseFeedback, value: boolean | string) => {
      onChange(
        exercises.map((e) => {
          if (e.id !== id) return e;
          const feedback = e.patientFeedback || { pain: false, fatigue: false, difficultyPerforming: false };
          return { ...e, patientFeedback: { ...feedback, [field]: value } };
        })
      );
    },
    [exercises, onChange]
  );

  const handleUpdateObservations = useCallback(
    (id: string, observations: string) => {
      onChange(
        exercises.map((e) => (e.id === id ? { ...e, observations } : e))
      );
    },
    [exercises, onChange]
  );

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500/10">
            <Dumbbell className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold">Exercícios</h3>
          {exercises.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{exercises.length}
            </Badge>
          )}
          {issueCount > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {issueCount} alerta{issueCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="gap-1.5 text-primary hover:text-primary"
            >
              <Library className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Biblioteca</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Buscar exercício..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>Nenhum exercício encontrado.</CommandEmpty>
                <CommandGroup>
                  {filteredLibrary.map((exercise) => (
                    <CommandItem
                      key={exercise.id}
                      value={exercise.id}
                      onSelect={() => handleAddFromLibrary(exercise)}
                      className="flex items-center gap-3 p-2 cursor-pointer"
                    >
                      <div className="h-8 w-8 flex-shrink-0 rounded bg-muted overflow-hidden">
                        {exercise.image_url ? (
                          <img
                            src={withImageParams(exercise.image_url, {
                              width: 64,
                              height: 64,
                              dpr: 2,
                              format: 'auto',
                              fit: 'cover',
                            })}
                            alt={exercise.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{exercise.name}</span>
                        <span className="text-xs text-muted-foreground">{exercise.category}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Exercise list */}
      <div className="p-2">
        {exercises.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Nenhum exercício adicionado</p>
            <p className="text-xs mt-1">
              Use "Biblioteca" ou digite abaixo (Enter para adicionar, Tab para autocomplete)
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {exercises.map((exercise) => (
              <ExerciseV2Row
                key={exercise.id}
                exercise={exercise}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onUpdatePrescription={handleUpdatePrescription}
                onUpdateFeedback={handleUpdateFeedback}
                onUpdateObservations={handleUpdateObservations}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {/* Quick add input */}
        <div className="mt-2 px-1">
          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
            <Plus className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
            <Input
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={handleQuickAdd}
              placeholder="Digitar exercício e Enter (ex: 'Agachamento 3x10rep') ou Tab para autocomplete..."
              disabled={disabled}
              className="h-7 border-0 shadow-none px-0 text-sm placeholder:text-muted-foreground/40 focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {exercises.length > 0 && (
        <div className="px-3 pb-2">
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Individual exercise row
const ExerciseV2Row: React.FC<{
  exercise: ExerciseV2Item;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdatePrescription: (id: string, prescription: string) => void;
  onUpdateFeedback: (id: string, field: keyof ExerciseFeedback, value: boolean | string) => void;
  onUpdateObservations: (id: string, observations: string) => void;
  disabled: boolean;
}> = React.memo(
  ({
    exercise,
    onToggle,
    onRemove,
    onUpdatePrescription,
    onUpdateFeedback,
    onUpdateObservations,
    disabled,
  }) => {
    const [expanded, setExpanded] = useState(false);
    const hasFeedbackIssues =
      exercise.patientFeedback?.pain ||
      exercise.patientFeedback?.fatigue ||
      exercise.patientFeedback?.difficultyPerforming;

    return (
      <div
        className={cn(
          'group rounded-md border border-transparent transition-all',
          expanded && 'border-border/40 bg-muted/30',
          exercise.completed && !expanded && 'opacity-60'
        )}
      >
        {/* Main row */}
        <div className="flex items-center gap-2 py-2 px-2">
          {/* Checkbox */}
          <button
            onClick={() => onToggle(exercise.id)}
            disabled={disabled}
            className="flex-shrink-0"
          >
            {exercise.completed ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-blue-500" />
            ) : (
              <Circle className="h-4.5 w-4.5 text-muted-foreground/40 hover:text-muted-foreground" />
            )}
          </button>

          {/* Exercise image (small) */}
          {exercise.image_url && (
            <div className="h-7 w-7 flex-shrink-0 rounded overflow-hidden bg-muted">
              <img
                src={withImageParams(exercise.image_url, {
                  width: 56,
                  height: 56,
                  dpr: 2,
                  format: 'auto',
                  fit: 'cover',
                })}
                alt={exercise.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Name */}
          <span
            className={cn(
              'flex-1 text-sm font-medium',
              exercise.completed && 'line-through text-muted-foreground'
            )}
          >
            {exercise.name}
          </span>

          {/* Prescription (editable) */}
          <Input
            value={exercise.prescription}
            onChange={(e) => onUpdatePrescription(exercise.id, e.target.value)}
            className="h-6 w-24 text-xs text-center border-dashed font-mono"
            disabled={disabled}
          />

          {/* Feedback icons */}
          {hasFeedbackIssues && (
            <TooltipProvider>
              <div className="flex items-center gap-0.5">
                {exercise.patientFeedback?.pain && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    </TooltipTrigger>
                    <TooltipContent>Dor durante exercício</TooltipContent>
                  </Tooltip>
                )}
                {exercise.patientFeedback?.fatigue && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                    </TooltipTrigger>
                    <TooltipContent>Fadiga excessiva</TooltipContent>
                  </Tooltip>
                )}
                {exercise.patientFeedback?.difficultyPerforming && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Frown className="h-3.5 w-3.5 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>Dificuldade na execução</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )}

          {/* Expand / Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-muted"
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => onRemove(exercise.id)}
              disabled={disabled}
              className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="px-8 pb-3 space-y-2 animate-slide-in">
            {/* Feedback toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Paciente:</span>

              <FeedbackToggle
                active={exercise.patientFeedback?.pain || false}
                onToggle={(v) => onUpdateFeedback(exercise.id, 'pain', v)}
                icon={<AlertTriangle className="h-3 w-3" />}
                label="Dor"
                activeColor="text-red-600 bg-red-50 border-red-200"
                disabled={disabled}
              />
              <FeedbackToggle
                active={exercise.patientFeedback?.fatigue || false}
                onToggle={(v) => onUpdateFeedback(exercise.id, 'fatigue', v)}
                icon={<Flame className="h-3 w-3" />}
                label="Fadiga"
                activeColor="text-orange-600 bg-orange-50 border-orange-200"
                disabled={disabled}
              />
              <FeedbackToggle
                active={exercise.patientFeedback?.difficultyPerforming || false}
                onToggle={(v) => onUpdateFeedback(exercise.id, 'difficultyPerforming', v)}
                icon={<Frown className="h-3 w-3" />}
                label="Dificuldade"
                activeColor="text-amber-600 bg-amber-50 border-amber-200"
                disabled={disabled}
              />
            </div>

            {/* Observations */}
            <Input
              value={exercise.observations || ''}
              onChange={(e) => onUpdateObservations(exercise.id, e.target.value)}
              placeholder="Observações: amplitude, compensações, ajustes..."
              className="h-7 text-xs border-dashed"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    );
  }
);

ExerciseV2Row.displayName = 'ExerciseV2Row';

// Feedback toggle button
const FeedbackToggle: React.FC<{
  active: boolean;
  onToggle: (value: boolean) => void;
  icon: React.ReactNode;
  label: string;
  activeColor: string;
  disabled: boolean;
}> = ({ active, onToggle, icon, label, activeColor, disabled }) => (
  <button
    onClick={() => onToggle(!active)}
    disabled={disabled}
    className={cn(
      'flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-all',
      active ? activeColor : 'text-muted-foreground bg-background border-border/50 hover:border-border'
    )}
  >
    {icon}
    {label}
  </button>
);
