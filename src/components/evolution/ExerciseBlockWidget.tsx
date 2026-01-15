import React, { useState } from 'react';
import { useExercises } from '@/hooks/useExercises';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Dumbbell, Search, Sparkles, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SessionExercise } from './SessionExercisesPanel';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExerciseBlockWidgetProps {
    exercises: SessionExercise[];
    onChange: (exercises: SessionExercise[]) => void;
    onSuggest?: () => void;
    disabled?: boolean;
    className?: string;
}

export const ExerciseBlockWidget: React.FC<ExerciseBlockWidgetProps> = ({
    exercises,
    onChange,
    onSuggest,
    disabled = false,
    className
}) => {
    const { exercises: availableExercises } = useExercises();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExerciseId, setSelectedExerciseId] = useState('');

    const generateSessionId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    };

    const filteredExercises = availableExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddExercise = (exerciseId: string) => {
        const exercise = availableExercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        const newExercise: SessionExercise = {
            id: generateSessionId(),
            exerciseId: exercise.id,
            name: exercise.name,
            sets: exercise.sets || 3,
            repetitions: exercise.repetitions || 10,
            completed: true,
            observations: ''
        };

        onChange([...exercises, newExercise]);
        setSelectedExerciseId('');
    };

    const handleUpdateExercise = (id: string, field: keyof SessionExercise, value: any) => {
        onChange(exercises.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    };

    const handleRemoveExercise = (id: string) => {
        onChange(exercises.filter(e => e.id !== id));
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="p-3 border-b flex items-center justify-between gap-2 shrink-0 bg-muted/20">
                <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Select value={selectedExerciseId} onValueChange={handleAddExercise} disabled={disabled}>
                        <SelectTrigger className="pl-9 h-8 text-xs">
                            <SelectValue placeholder="Adicionar da biblioteca..." />
                        </SelectTrigger>
                        <SelectContent>
                            <div className="p-2 border-b">
                                <Input
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-7 text-xs"
                                    autoFocus
                                />
                            </div>
                            <ScrollArea className="h-[200px]">
                                {filteredExercises.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-muted-foreground">Nenhum encontrado</div>
                                ) : (
                                    filteredExercises.map((exercise) => (
                                        <SelectItem key={exercise.id} value={exercise.id} className="text-xs">
                                            {exercise.name}
                                        </SelectItem>
                                    ))
                                )}
                            </ScrollArea>
                        </SelectContent>
                    </Select>
                </div>
                {onSuggest && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onSuggest}
                                    className="h-8 px-2 gap-1.5 text-xs text-purple-600 border-purple-200 bg-purple-50/50 hover:bg-purple-100/50"
                                    disabled={disabled || exercises.length === 0}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Sugerir</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Evoluir exercícios baseado na dor/dados</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                    {exercises.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border rounded-lg border-dashed text-muted-foreground">
                            <Dumbbell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-xs">Nenhum exercício registrado</p>
                        </div>
                    ) : (
                        exercises.map((exercise, index) => (
                            <div key={exercise.id} className="group border rounded-lg p-2.5 space-y-2.5 bg-card hover:border-primary/30 transition-colors relative">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 font-medium text-sm">
                                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px]">
                                            {index + 1}
                                        </span>
                                        <span className="truncate max-w-[180px]" title={exercise.name}>
                                            {exercise.name}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRemoveExercise(exercise.id)}
                                        disabled={disabled}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Séries</Label>
                                        <Input
                                            type="number"
                                            value={exercise.sets}
                                            onChange={(e) => handleUpdateExercise(exercise.id, 'sets', parseInt(e.target.value) || 0)}
                                            className="h-7 text-xs px-2"
                                            disabled={disabled}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Reps</Label>
                                        <Input
                                            type="number"
                                            value={exercise.repetitions}
                                            onChange={(e) => handleUpdateExercise(exercise.id, 'repetitions', parseInt(e.target.value) || 0)}
                                            className="h-7 text-xs px-2"
                                            disabled={disabled}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Carga</Label>
                                        <Input
                                            value={exercise.weight || ''}
                                            onChange={(e) => handleUpdateExercise(exercise.id, 'weight', e.target.value)}
                                            placeholder="Ex: 5kg"
                                            className="h-7 text-xs px-2"
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Observações</Label>
                                    <Input
                                        value={exercise.observations || ''}
                                        onChange={(e) => handleUpdateExercise(exercise.id, 'observations', e.target.value)}
                                        placeholder="Como foi realizado?"
                                        className="h-7 text-xs px-2 italic"
                                        disabled={disabled}
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-1 border-t mt-1">
                                    <Badge
                                        variant={exercise.completed ? "secondary" : "outline"}
                                        className={cn(
                                            "text-[10px] px-1.5 py-0 cursor-pointer h-5",
                                            exercise.completed ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" : "hover:bg-muted"
                                        )}
                                        onClick={() => handleUpdateExercise(exercise.id, 'completed', !exercise.completed)}
                                    >
                                        {exercise.completed ? "Concluído" : "Pendente"}
                                    </Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
