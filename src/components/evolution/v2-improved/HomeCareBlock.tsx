/**
 * HomeCareBlock - Improved V2
 *
 * Enhanced home care exercises block with better UX,
 * professional design, and improved visual presentation.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Home,
  Plus,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HomeCareExercise {
  id: string;
  name: string;
  prescription: string;
  instructions?: string;
}

interface HomeCareBlockProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'hc_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const parseExercises = (value: string): HomeCareExercise[] => {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const lines = value.split('\n').filter(l => l.trim());
    return lines.map((line, i) => ({
      id: `hc_${i}`,
      name: line.replace(/^\d+[\.\)]\s*/, '').split('-')[0].trim(),
      prescription: line.split('-')[1]?.trim() || '',
      instructions: ''
    }));
  }
};

const stringifyExercises = (exercises: HomeCareExercise[]): string => {
  return JSON.stringify(exercises);
};

// Quick presets with better labels
const QUICK_PRESETS = [
  { name: 'Alongamento', pres: '3x30 seg', icon: '🧘' },
  { name: 'Fortalecimento', pres: '3x10 rep', icon: '💪' },
  { name: 'Marcha/Caminhada', pres: '10 min', icon: '🚶' },
  { name: 'Crioterapia (Gelo)', pres: '20 min', icon: '❄️' },
  { name: 'Termoterapia (Calor)', pres: '15 min', icon: '🔥' },
];

export const HomeCareBlock: React.FC<HomeCareBlockProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const [exercises, setExercises] = useState<HomeCareExercise[]>(() => parseExercises(value));
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExercisePrescription, setNewExercisePrescription] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    setExercises(parseExercises(value));
  }, [value]);

  const handleAddExercise = useCallback(() => {
    if (!newExerciseName.trim()) return;

    const newExercise: HomeCareExercise = {
      id: generateId(),
      name: newExerciseName.trim(),
      prescription: newExercisePrescription.trim() || '3x10 rep',
      instructions: '',
    };

    const updated = [...exercises, newExercise];
    setExercises(updated);
    onChange(stringifyExercises(updated));
    setNewExerciseName('');
    setNewExercisePrescription('');
  }, [exercises, newExerciseName, newExercisePrescription, onChange]);

  const handleRemoveExercise = useCallback((id: string) => {
    const updated = exercises.filter((e) => e.id !== id);
    setExercises(updated);
    onChange(stringifyExercises(updated));
  }, [exercises, onChange]);

  const handleUpdateExercise = useCallback((id: string, field: keyof HomeCareExercise, val: string) => {
    const updated = exercises.map((e) => (e.id === id ? { ...e, [field]: val } : e));
    setExercises(updated);
    onChange(stringifyExercises(updated));
  }, [exercises, onChange]);

  const handlePresetClick = useCallback((name: string, pres: string) => {
    setNewExerciseName(name);
    setNewExercisePrescription(pres);
    setShowPresets(false);
  }, []);

  return (
    <div className={cn(
      'rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300',
      'shadow-sm hover:shadow-md',
      className
    )}>
      {/* Header with gradient accent */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/60 via-violet-500 to-violet-500/60" />
        <div className="flex items-center justify-between p-3.5 border-b border-border/40 bg-gradient-to-r from-violet-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20">
              <Home className="h-4 w-4 text-violet-500" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-foreground">Exercícios para Casa</h3>
              {exercises.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {exercises.length} exercício{exercises.length !== 1 ? 's' : ''} prescritos
                </span>
              )}
            </div>
          </div>
          {exercises.length > 0 && (
            <Badge variant="secondary" className="text-xs h-6 px-2.5 rounded-full">
              <CheckCircle2 className="h-3 w-3 mr-1 text-violet-500" />
              Casa
            </Badge>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Exercise list */}
        {exercises.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 mx-auto mb-3 flex items-center justify-center">
              <Home className="h-7 w-7 opacity-30" />
            </div>
            <p className="text-sm font-medium">Nenhum exercício para casa</p>
            <p className="text-xs mt-1.5 opacity-70">Adicione exercícios que o paciente deve fazer em casa</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className="group relative flex flex-col gap-2 p-3 rounded-xl border border-border/50 hover:border-violet-200 hover:bg-violet-500/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 text-violet-600 font-bold text-xs flex-shrink-0">
                    {index + 1}
                  </div>
                  <Input
                    value={exercise.name}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'name', e.target.value)}
                    disabled={disabled}
                    className="flex-1 h-8 text-sm border-dashed rounded-lg px-3 font-medium"
                    placeholder="Nome do exercício"
                  />
                  <Input
                    value={exercise.prescription}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'prescription', e.target.value)}
                    disabled={disabled}
                    className="w-24 h-8 text-xs text-center border-dashed font-mono rounded-lg px-2"
                    placeholder="3x10"
                  />
                  <button
                    onClick={() => handleRemoveExercise(exercise.id)}
                    disabled={disabled}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                {exercise.instructions && (
                  <p className="text-xs text-muted-foreground ml-10">{exercise.instructions}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new exercise section */}
        <div className="pt-3 border-t border-border/40">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground/40" />
              <span className="text-xs font-medium text-muted-foreground">Novo exercício para casa</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddExercise();
                  }
                }}
                placeholder="Nome do exercício..."
                disabled={disabled}
                className="flex-1 h-9 border-dashed rounded-lg text-sm"
              />
              <Input
                value={newExercisePrescription}
                onChange={(e) => setNewExercisePrescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddExercise();
                  }
                }}
                placeholder="3x10"
                disabled={disabled}
                className="w-24 h-9 border-dashed text-xs text-center font-mono rounded-lg"
              />
              <Button
                size="sm"
                onClick={handleAddExercise}
                disabled={disabled || !newExerciseName.trim()}
                className="h-9 px-3 rounded-lg"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
              disabled={disabled}
              className="w-full justify-start text-xs h-8 border-dashed rounded-lg"
            >
              <Calendar className="h-3 w-3 mr-2" />
              Sugestões rápidas
            </Button>
            {showPresets && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 p-2 bg-popover border border-border rounded-xl shadow-lg animate-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetClick(preset.name, preset.pres)}
                      disabled={disabled}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
                    >
                      <span className="text-base">{preset.icon}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate">{preset.name}</span>
                        <span className="text-[10px] text-muted-foreground">{preset.pres}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
