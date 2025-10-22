import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Play, Plus } from 'lucide-react';
import type { Exercise } from '@/hooks/useExercises';

interface ExercisePlayerProps {
  exercise: Exercise;
  onAddToPlan?: (exerciseId: string) => void;
}

export const ExercisePlayer: React.FC<ExercisePlayerProps> = ({
  exercise,
  onAddToPlan
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{exercise.name}</CardTitle>
            <div className="flex gap-2">
              {exercise.category && (
                <Badge variant="secondary">{exercise.category}</Badge>
              )}
              {exercise.difficulty && (
                <Badge variant="outline">{exercise.difficulty}</Badge>
              )}
            </div>
          </div>
          {onAddToPlan && (
            <Button onClick={() => onAddToPlan(exercise.id)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar ao Plano
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Video Section */}
          {exercise.video_url && (
            <div>
              <h4 className="font-semibold mb-3">Vídeo Demonstrativo</h4>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Play className="w-12 h-12 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Image Section */}
          {exercise.image_url && (
            <div>
              <h4 className="font-semibold mb-3">Imagem</h4>
              <img 
                src={exercise.image_url} 
                alt={exercise.name}
                className="w-full rounded-lg"
              />
            </div>
          )}
          
          {/* Description */}
          {exercise.description && (
            <div>
              <h4 className="font-semibold mb-2">Descrição</h4>
              <p className="text-muted-foreground">{exercise.description}</p>
            </div>
          )}
          
          {/* Instructions */}
          {exercise.instructions && (
            <div>
              <h4 className="font-semibold mb-2">Instruções</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{exercise.instructions}</p>
            </div>
          )}

          {/* Exercise Parameters */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            {exercise.sets && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Séries</p>
                <p className="text-xl font-bold">{exercise.sets}</p>
              </div>
            )}
            {exercise.repetitions && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Repetições</p>
                <p className="text-xl font-bold">{exercise.repetitions}</p>
              </div>
            )}
            {exercise.duration && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="text-xl font-bold">{exercise.duration}s</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};