import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell } from 'lucide-react';

interface ExerciseLibraryProps {
  onExerciseSelect: (exercise: any) => void;
  onAddToPlan: (exercise: any) => void;
  className?: string;
}

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  onExerciseSelect,
  onAddToPlan,
  className
}) => {
  const mockExercises = [
    {
      id: '1',
      name: 'Flexão de Braço',
      category: 'Força',
      description: 'Exercício para fortalecimento dos membros superiores'
    },
    {
      id: '2', 
      name: 'Agachamento',
      category: 'Força',
      description: 'Exercício para fortalecimento dos membros inferiores'
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Biblioteca de Exercícios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {mockExercises.map((exercise) => (
            <div key={exercise.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5" />
                <div className="flex-1">
                  <h4 className="font-medium">{exercise.name}</h4>
                  <p className="text-sm text-muted-foreground">{exercise.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onExerciseSelect(exercise)}>
                    Ver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onAddToPlan(exercise)}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};