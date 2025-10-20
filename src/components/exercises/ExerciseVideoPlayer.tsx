import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Heart, BookmarkPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExerciseVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  category: string;
  targetMuscles: string[];
  instructions: string[];
}

interface ExerciseVideoPlayerProps {
  exercise: ExerciseVideo;
  onComplete?: () => void;
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({ 
  exercise,
  onComplete 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    toast({
      title: "Vídeo reiniciado",
      description: "O exercício foi reiniciado do início",
    });
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos",
      description: exercise.title,
    });
  };

  const handleSaveToProtocol = () => {
    toast({
      title: "Salvo no protocolo",
      description: "Exercício adicionado ao protocolo do paciente",
    });
  };

  const difficultyColors = {
    iniciante: 'bg-green-100 text-green-800',
    intermediario: 'bg-yellow-100 text-yellow-800',
    avancado: 'bg-red-100 text-red-800',
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle>{exercise.title}</CardTitle>
            <div className="flex gap-2">
              <Badge className={difficultyColors[exercise.difficulty]}>
                {exercise.difficulty}
              </Badge>
              <Badge variant="outline">{exercise.category}</Badge>
              <Badge variant="outline">{exercise.duration}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSaveToProtocol}
            >
              <BookmarkPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vídeo Player */}
        <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
          {exercise.thumbnailUrl && !isPlaying ? (
            <img 
              src={exercise.thumbnailUrl} 
              alt={exercise.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <video 
                className="w-full h-full object-cover"
                src={exercise.videoUrl}
                controls={isPlaying}
              />
            </div>
          )}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                className="rounded-full w-16 h-16"
                onClick={togglePlay}
              >
                <Play className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>

        {/* Controles */}
        {isPlaying && (
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" onClick={togglePlay}>
              <Pause className="w-4 h-4 mr-2" />
              Pausar
            </Button>
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reiniciar
            </Button>
          </div>
        )}

        {/* Descrição */}
        <div className="space-y-2">
          <h4 className="font-semibold">Descrição</h4>
          <p className="text-sm text-muted-foreground">{exercise.description}</p>
        </div>

        {/* Músculos Alvo */}
        <div className="space-y-2">
          <h4 className="font-semibold">Músculos Trabalhados</h4>
          <div className="flex flex-wrap gap-2">
            {exercise.targetMuscles.map((muscle, index) => (
              <Badge key={index} variant="secondary">{muscle}</Badge>
            ))}
          </div>
        </div>

        {/* Instruções */}
        <div className="space-y-2">
          <h4 className="font-semibold">Instruções Passo a Passo</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            {exercise.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>

        <Button onClick={onComplete} className="w-full bg-primary">
          Marcar como Concluído
        </Button>
      </CardContent>
    </Card>
  );
};
