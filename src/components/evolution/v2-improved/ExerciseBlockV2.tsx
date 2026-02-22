/**
 * ExerciseBlockV2 - Improved V2
 *
 * Enhanced exercises block with better UX,
 * professional design, and improved feedback indicators.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  Dumbbell,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Frown,
  Flame,
  ChevronDown,
  ChevronUp,
  Library,
  ImageOff,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <div className={cn(
      'w-full transition-all duration-300',
      className
    )}>
      {/* Exercise list */}
      <div className="pb-3">
        {exercises.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 mx-auto mb-3 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium">Nenhum exercício adicionado</p>
            <p className="text-xs mt-1.5 opacity-70">
              Use "Biblioteca" ou digite abaixo (Enter para adicionar, Tab para autocomplete)
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
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
        <div className="mt-3">
          <div className="relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={handleQuickAdd}
              placeholder="Digite um exercício e Enter (ex: 'Agachamento 3x10rep') ou Tab para autocomplete..."
              disabled={disabled}
              className="h-9 pl-10 pr-4 text-sm border-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-200 focus:shadow-sm rounded-md transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Progress bar - Enhanced */}
      {
        exercises.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Progresso</span>
              <span>{Math.round((completedCount / exercises.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )
      }
    </div >
  );
};

// Individual exercise row - Enhanced
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
    const [isRemoving, setIsRemoving] = useState(false);

    const hasFeedbackIssues =
      exercise.patientFeedback?.pain ||
      exercise.patientFeedback?.fatigue ||
      exercise.patientFeedback?.difficultyPerforming;

    const handleRemove = () => {
      setIsRemoving(true);
      setTimeout(() => onRemove(exercise.id), 200);
    };

    return (
      <div
        className={cn(
          'group relative flex flex-col rounded-lg transition-all duration-200',
          'border border-transparent hover:bg-slate-50',
          expanded && 'bg-slate-50',
          exercise.completed && !expanded && 'opacity-50',
          isRemoving && 'opacity-0 scale-95'
        )}
      >
        {/* Main row */}
        <div className="flex items-center gap-3 py-2.5 px-3">
          {/* Checkbox */}
          <button
            onClick={() => onToggle(exercise.id)}
            disabled={disabled}
            className="flex-shrink-0 transition-all duration-200 hover:scale-110"
          >
            {exercise.completed ? (
              <div className="w-5 h-5 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-lg border-2 border-muted-foreground/30 hover:border-blue-500 transition-colors" />
            )}
          </button>

          {/* Exercise image (thumbnail) */}
          {exercise.image_url && (
            <div className="h-9 w-9 flex-shrink-0 rounded-lg overflow-hidden bg-muted border border-border/30">
              <img
                src={withImageParams(exercise.image_url, {
                  width: 72,
                  height: 72,
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
            className="h-7 w-20 text-xs text-center border-dashed font-mono rounded-lg px-2"
            disabled={disabled}
          />

          {/* Feedback icons */}
          {hasFeedbackIssues && (
            <TooltipProvider>
              <div className="flex items-center gap-0.5">
                {exercise.patientFeedback?.pain && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="p-1 rounded-md bg-red-500/10">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Dor durante exercício
                    </TooltipContent>
                  </Tooltip>
                )}
                {exercise.patientFeedback?.fatigue && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="p-1 rounded-md bg-orange-500/10">
                        <Flame className="h-3 w-3 text-orange-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Fadiga excessiva
                    </TooltipContent>
                  </Tooltip>
                )}
                {exercise.patientFeedback?.difficultyPerforming && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="p-1 rounded-md bg-amber-500/10">
                        <Frown className="h-3 w-3 text-amber-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Dificuldade na execução
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem onClick={() => setExpanded(!expanded)} className="gap-2">
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Recolher detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Ver detalhes
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRemove} className="gap-2 text-destructive focus:text-destructive">
                <X className="h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Expanded details with animation */}
        {expanded && (
          <div className="px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
            {/* Feedback toggles */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground font-medium mr-1">Paciente relatou:</span>

              <FeedbackToggle
                active={exercise.patientFeedback?.pain || false}
                onToggle={(v) => onUpdateFeedback(exercise.id, 'pain', v)}
                icon={<AlertTriangle className="h-3 w-3" />}
                label="Dor"
                activeColor="bg-red-500 text-white border-red-500"
                disabled={disabled}
              />
              <FeedbackToggle
                active={exercise.patientFeedback?.fatigue || false}
                onToggle={(v) => onUpdateFeedback(exercise.id, 'fatigue', v)}
                icon={<Flame className="h-3 w-3" />}
                label="Fadiga"
                activeColor="bg-orange-500 text-white border-orange-500"
                disabled={disabled}
              />
              <FeedbackToggle
                active={exercise.patientFeedback?.difficultyPerforming || false}
                onToggle={(v) => onUpdateFeedback(exercise.id, 'difficultyPerforming', v)}
                icon={<Frown className="h-3 w-3" />}
                label="Dificuldade"
                activeColor="bg-amber-500 text-white border-amber-500"
                disabled={disabled}
              />
            </div>

            {/* Observations */}
            <Input
              value={exercise.observations || ''}
              onChange={(e) => onUpdateObservations(exercise.id, e.target.value)}
              placeholder="Observações: amplitude, compensações, ajustes realizados..."
              className="h-8 text-xs border-dashed rounded-lg"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    );
  }
);

ExerciseV2Row.displayName = 'ExerciseV2Row';

// Enhanced feedback toggle button
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
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-200',
      'hover:scale-105 active:scale-95',
      active
        ? `${activeColor} shadow-sm`
        : 'text-muted-foreground bg-background border-border/50 hover:border-border hover:bg-muted/50',
      disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
    )}
  >
    {icon}
    {label}
  </button>
);
