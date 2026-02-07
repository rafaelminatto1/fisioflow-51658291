import React, { useState } from 'react';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Dumbbell, Library, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { ExerciseLibraryModal } from '../exercises/ExerciseLibraryModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { withImageParams } from '@/lib/storageProxy';

export interface SessionExercise {
    id: string; // unique for this session instance (uuid)
    exerciseId: string;
    name: string;
    sets: number;
    repetitions: number;
    weight?: string;
    observations?: string;
    completed: boolean;
    image_url?: string;
}

interface SessionExercisesPanelProps {
    exercises: SessionExercise[];
    onChange: (exercises: SessionExercise[]) => void;
}

export const SessionExercisesPanel: React.FC<SessionExercisesPanelProps> = ({
    exercises,
    onChange
}) => {
    const { exercises: _availableExercises } = useExercises();
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    const generateSessionId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    };

    const handleAddExercise = (exercise: Exercise) => {
        const newExercise: SessionExercise = {
            id: generateSessionId(),
            exerciseId: exercise.id,
            name: exercise.name,
            sets: exercise.sets || 3,
            repetitions: exercise.repetitions || 10,
            completed: false, // Default to not completed
            observations: '',
            image_url: exercise.image_url
        };

        onChange([...exercises, newExercise]);
    };

    const handleUpdateExercise = (id: string, field: keyof SessionExercise, value: string | number | boolean) => {
        onChange(exercises.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    };

    const handleRemoveExercise = (id: string) => {
        onChange(exercises.filter(e => e.id !== id));
    };

    const toggleCompleted = (id: string) => {
        const exercise = exercises.find(e => e.id === id);
        if (exercise) {
            handleUpdateExercise(id, 'completed', !exercise.completed);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/50">
                <div className="flex-1 w-full max-w-md">
                    <Label className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
                        Adicionar Exercício
                    </Label>
                    <ExerciseAutocomplete onSelect={handleAddExercise} />
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className="gap-2 h-10 px-4 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all"
                                onClick={() => setIsLibraryOpen(true)}
                            >
                                <Library className="h-4 w-4 text-primary" />
                                <span className="font-medium">Abrir Biblioteca</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Visualizar biblioteca completa com filtros</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4" role="list">
                    {exercises.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-muted/10 text-muted-foreground gap-3">
                            <div className="p-4 rounded-full bg-muted/20">
                                <Dumbbell className="h-8 w-8 opacity-20" />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-sm">Nenhum exercício adicionado</p>
                                <p className="text-xs opacity-60">Use a busca acima para planejar a sessão</p>
                            </div>
                        </div>
                    ) : (
                        exercises.map((exercise, index) => (
                            <Card
                                key={exercise.id}
                                role="listitem"
                                className={cn(
                                    "group relative overflow-hidden transition-all duration-200 hover:shadow-md border-l-4",
                                    exercise.completed
                                        ? "border-l-emerald-500 bg-emerald-50/10"
                                        : "border-l-primary/20 hover:border-l-primary"
                                )}
                            >
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row">
                                        {/* Thumbnail Section */}
                                        <div className="relative w-full lg:w-40 h-28 lg:h-auto bg-muted overflow-hidden shrink-0">
                                            {exercise.image_url ? (
                                                <img
                                                    src={withImageParams(exercise.image_url, { width: 420, height: 280, dpr: 2, format: 'auto', fit: 'cover' })}
                                                    alt={exercise.name}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2">
                                                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm shadow-sm h-6 px-2 font-bold">
                                                    #{index + 1}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="flex-1 p-4 space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h3 className={cn(
                                                        "font-bold text-lg leading-tight transition-colors",
                                                        exercise.completed ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                                                    )}>
                                                        {exercise.name}
                                                    </h3>
                                                    {exercise.completed && (
                                                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Concluído
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn(
                                                            "h-10 w-10 rounded-full transition-all",
                                                            exercise.completed
                                                                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200 shadow-lg"
                                                                : "bg-muted hover:bg-muted-foreground/10 text-muted-foreground"
                                                        )}
                                                        onClick={() => toggleCompleted(exercise.id)}
                                                        aria-label={exercise.completed ? 'Marcar como não concluído' : 'Marcar como concluído'}
                                                    >
                                                        {exercise.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleRemoveExercise(exercise.id)}
                                                        aria-label={`Remover exercício ${exercise.name}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Séries</Label>
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            value={exercise.sets}
                                                            onChange={(e) => handleUpdateExercise(exercise.id, 'sets', parseInt(e.target.value) || 0)}
                                                            className="h-9 font-bold bg-muted/50 focus:bg-background transition-colors text-center"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Reps</Label>
                                                    <Input
                                                        type="number"
                                                        value={exercise.repetitions}
                                                        onChange={(e) => handleUpdateExercise(exercise.id, 'repetitions', parseInt(e.target.value) || 0)}
                                                        className="h-9 font-bold bg-muted/50 focus:bg-background transition-colors text-center"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Carga</Label>
                                                    <Input
                                                        value={exercise.weight || ''}
                                                        onChange={(e) => handleUpdateExercise(exercise.id, 'weight', e.target.value)}
                                                        placeholder="Ex: 5kg"
                                                        className="h-9 font-bold bg-muted/50 focus:bg-background transition-colors text-center"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <Input
                                                    value={exercise.observations || ''}
                                                    onChange={(e) => handleUpdateExercise(exercise.id, 'observations', e.target.value)}
                                                    placeholder="Observações sobre a execução..."
                                                    className="h-9 text-xs bg-muted/30 border-dashed focus:border-solid hover:bg-muted/50 transition-all rounded-lg"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>

            <ExerciseLibraryModal
                open={isLibraryOpen}
                onOpenChange={setIsLibraryOpen}
                onSelectExercise={handleAddExercise}
            />
        </div>
    );
};
