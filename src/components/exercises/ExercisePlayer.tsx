import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ExercisePlayerProps {
  exercise: {
    id: string;
    name: string;
    category: string;
    description?: string;
    instructions?: string;
    video_url?: string;
  };
  onClose: () => void;
}

export const ExercisePlayer: React.FC<ExercisePlayerProps> = ({
  exercise,
  onClose
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{exercise.name}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Categoria</h4>
            <p>{exercise.category}</p>
          </div>
          
          {exercise.description && (
            <div>
              <h4 className="font-medium mb-2">Descrição</h4>
              <p>{exercise.description}</p>
            </div>
          )}
          
          {exercise.instructions && (
            <div>
              <h4 className="font-medium mb-2">Instruções</h4>
              <p>{exercise.instructions}</p>
            </div>
          )}
          
          {exercise.video_url && (
            <div>
              <h4 className="font-medium mb-2">Vídeo</h4>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Player de vídeo aqui</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};