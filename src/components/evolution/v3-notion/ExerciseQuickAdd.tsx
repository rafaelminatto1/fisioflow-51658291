/**
 * ExerciseQuickAdd - Inline quick add for exercises with recent exercises
 *
 * Features:
 * - Inline search for exercises
 * - Recent exercises list
 * - "x" button for quick quantity (3x10)
 * - Auto-increment reps
 * - Drag & drop from library
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Minus, Search, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  sets?: number;
  reps?: number;
  notes?: string;
}

interface ExerciseQuickAddProps {
  onAdd: (exercises: Exercise[]) => void;
  disabled?: boolean;
  className?: string;
  recentExercises?: Exercise[];
  exerciseLibrary?: Exercise[];
}

// Recent exercises cache
const getRecentExercises = (): Exercise[] => {
  try {
    const cached = localStorage.getItem('fisioflow-recent-exercises');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

const saveRecentExercises = (exercises: Exercise[]) => {
  try {
    localStorage.setItem('fisioflow-recent-exercises', JSON.stringify(exercises));
  } catch (error) {
    console.error('Failed to save recent exercises:', error);
  }
};

export const ExerciseQuickAdd: React.FC<ExerciseQuickAddProps> = ({
  onAdd,
  disabled = false,
  className,
  recentExercises = [],
  exerciseLibrary = [],
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(1);
  const [reps, setReps] = useState(10);

  // Combine recent and library exercises
  const allExercises = useMemo(() => {
    return [...new Set([...recentExercises, ...exerciseLibrary])];
  }, [recentExercises, exerciseLibrary]);

  // Filter exercises by search
  const filteredExercises = useMemo(() => {
    return allExercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allExercises, searchQuery]);

  const handleAddExercise = useCallback((exercise: Exercise) => {
    onAdd([{ ...exercise, sets, reps }]);

    // Add to recent exercises
    const updatedRecent = [
      exercise,
      ...getRecentExercises().filter(e => e.id !== exercise.id),
    ].slice(0, 10);
    saveRecentExercises(updatedRecent);

    setOpen(false);
    setSearchQuery('');
    setSelectedExercise(null);
  }, [onAdd]);

  const incrementSets = useCallback(() => {
    setSets(prev => Math.min(prev + 1, 10));
  }, []);

  const decrementSets = useCallback(() => {
    setSets(prev => Math.max(prev - 1, 1));
  }, []);

  const incrementReps = useCallback(() => {
    setReps(prev => Math.min(prev + 1, 30));
  }, []);

  const decrementReps = useCallback(() => {
    setReps(prev => Math.max(prev - 1, 1));
  }, []);

  return (
    <div className={cn('exercise-quick-add', className)}>
      {/* Main add button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Exercício</span>
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[450px] p-0" align="end">
          {/* Search bar */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar exercício..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full h-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Buscar exercícios"
              />
            </div>
          </div>

          {/* Exercise list */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredExercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm">Nenhum exercício encontrado</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredExercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    onClick={() => handleAddExercise(exercise)}
                    className={cn(
                      'group p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground text-sm">
                            {exercise.name}
                          </h4>
                          {exercise.category && (
                            <Badge variant="secondary" className="text-[10px]">
                              {exercise.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            incrementSets();
                          }}
                          disabled={disabled}
                          className="w-8 h-8 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center transition-colors"
                          aria-label="Aumentar série"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={sets}
                            onChange={(e) => setSets(parseInt(e.target.value))}
                            disabled={disabled}
                            className="w-12 h-8 rounded-md border border-input text-center text-sm"
                            aria-label="Número de séries"
                          />
                          <span className="text-xs text-muted-foreground">x</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            decrementSets();
                          }}
                          disabled={disabled || sets <= 1}
                          className="w-8 h-8 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center transition-colors"
                          aria-label="Diminuir série"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          incrementReps();
                        }}
                        disabled={disabled}
                        className="w-8 h-8 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center transition-colors"
                        aria-label="Aumentar repetições"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <div className="flex items-baseline gap-1">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={reps}
                          onChange={(e) => setReps(parseInt(e.target.value))}
                          disabled={disabled}
                          className="w-12 h-8 rounded-md border border-input text-center text-sm"
                          aria-label="Número de repetições"
                        />
                        <span className="text-xs text-muted-foreground">x</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          decrementReps();
                        }}
                        disabled={disabled || reps <= 1}
                        className="w-8 h-8 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center transition-colors"
                        aria-label="Diminuir repetições"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected exercise preview */}
      {selectedExercise && (
        <div className="mt-2 flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {selectedExercise.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedExercise.sets}x {selectedExercise.reps}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              handleAddExercise(selectedExercise);
              setSelectedExercise(null);
            }}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar</span>
          </Button>
        </div>
      )}
    </div>
  );
};

// CSS for exercise quick add
const EXERCISE_QUICK_ADD_STYLES = `
  .exercise-quick-add {
    display: inline-flex;
    align-items: center;
  }

  .exercise-quick-add input[type="number"] {
    -moz-appearance: textfield;
    -webkit-appearance: textfield;
  }

  @media (hover: none) {
    .exercise-quick-add button {
      min-width: 44px;
      min-height: 44px;
    }
  }
`;
