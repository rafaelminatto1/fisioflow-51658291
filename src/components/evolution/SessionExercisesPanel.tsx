
import React, { useState } from 'react';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Dumbbell, GripVertical, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';

export interface SessionExercise {
    id: string; // unique for this session instance (uuid)
    exerciseId: string;
    name: string;
    sets: number;
    repetitions: number;
    weight?: string;
    observations?: string;
    completed: boolean;
}

interface SessionExercisesPanelProps {
    exercises: SessionExercise[];
    onChange: (exercises: SessionExercise[]) => void;
}

export const SessionExercisesPanel: React.FC<SessionExercisesPanelProps> = ({
    exercises,
    onChange
}) => {
    const { exercises: availableExercises, loading } = useExercises();
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredExercises = availableExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddExercise = (exerciseId: string) => {
        const exercise = availableExercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        const newExercise: SessionExercise = {
            id: uuidv4(),
            exerciseId: exercise.id,
            name: exercise.name,
            sets: exercise.sets || 3,
            repetitions: exercise.repetitions || 10,
            completed: true, // Default to completed when added during session? Or let user toggle.
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
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-primary" />
                        Exercícios Realizados
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add Exercise */}
                    <div className="space-y-2">
                        <Label>Adicionar Exercício</Label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Select value={selectedExerciseId} onValueChange={handleAddExercise}>
                                    <SelectTrigger className="pl-10">
                                        <SelectValue placeholder="Buscar na biblioteca..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="p-2">
                                            <Input
                                                placeholder="Filtrar..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="h-8 mb-2"
                                                autoFocus
                                            />
                                        </div>
                                        <ScrollArea className="h-[200px]">
                                            {filteredExercises.map((exercise) => (
                                                <SelectItem key={exercise.id} value={exercise.id}>
                                                    {exercise.name}
                                                </SelectItem>
                                            ))}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        {exercises.length === 0 ? (
                            <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground text-sm">
                                Nenhum exercício registrado nesta sessão.
                            </div>
                        ) : (
                            exercises.map((exercise, index) => (
                                <div key={exercise.id} className="border rounded-lg p-3 space-y-3 bg-card hover:shadow-sm transition-shadow">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 font-medium">
                                            <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                                                {index + 1}
                                            </Badge>
                                            {exercise.name}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemoveExercise(exercise.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Séries</Label>
                                            <Input
                                                type="number"
                                                value={exercise.sets}
                                                onChange={(e) => handleUpdateExercise(exercise.id, 'sets', parseInt(e.target.value) || 0)}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Reps</Label>
                                            <Input
                                                type="number"
                                                value={exercise.repetitions}
                                                onChange={(e) => handleUpdateExercise(exercise.id, 'repetitions', parseInt(e.target.value) || 0)}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Carga (kg/elástico)</Label>
                                            <Input
                                                value={exercise.weight || ''}
                                                onChange={(e) => handleUpdateExercise(exercise.id, 'weight', e.target.value)}
                                                placeholder="Ex: 5kg"
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Status</Label>
                                            <Select
                                                value={exercise.completed ? 'completed' : 'skipped'}
                                                onValueChange={(val) => handleUpdateExercise(exercise.id, 'completed', val === 'completed')}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="completed">Concluído</SelectItem>
                                                    <SelectItem value="skipped">Pulado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Observações</Label>
                                        <Input
                                            value={exercise.observations || ''}
                                            onChange={(e) => handleUpdateExercise(exercise.id, 'observations', e.target.value)}
                                            placeholder="Como o paciente realizou?"
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
