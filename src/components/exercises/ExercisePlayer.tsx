import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import {
  Play, Plus, Heart, Share2, ExternalLink,
  Clock, Repeat, Dumbbell, FileText, Video, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import type { Exercise } from '@/hooks/useExercises';

interface ExercisePlayerProps {
  exercise: Exercise;
  onAddToPlan?: (exerciseId: string) => void;
}

const difficultyColors: Record<string, string> = {
  'Fácil': 'bg-green-500/10 text-green-600 border-green-500/30',
  'Iniciante': 'bg-green-500/10 text-green-600 border-green-500/30',
  'Médio': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  'Intermediário': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  'Difícil': 'bg-red-500/10 text-red-600 border-red-500/30',
  'Avançado': 'bg-red-500/10 text-red-600 border-red-500/30',
};

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  // Direct video URL
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return url;
  }
  
  return null;
}

export const ExercisePlayer: React.FC<ExercisePlayerProps> = ({
  exercise,
  onAddToPlan
}) => {
  const { isFavorite, toggleFavorite } = useExerciseFavorites();
  const [activeTab, setActiveTab] = useState(exercise.video_url ? 'video' : 'info');
  
  const embedUrl = exercise.video_url ? getEmbedUrl(exercise.video_url) : null;
  const isDirectVideo = embedUrl?.match(/\.(mp4|webm|ogg)$/i);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: exercise.name,
        text: exercise.description || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-2xl">{exercise.name}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              {exercise.category && (
                <Badge variant="secondary">{exercise.category}</Badge>
              )}
              {exercise.difficulty && (
                <Badge 
                  variant="outline"
                  className={cn(difficultyColors[exercise.difficulty])}
                >
                  {exercise.difficulty}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(isFavorite(exercise.id) && "text-red-500")}
              onClick={() => toggleFavorite(exercise.id)}
            >
              <Heart className={cn("h-5 w-5", isFavorite(exercise.id) && "fill-current")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
            {onAddToPlan && (
              <Button onClick={() => onAddToPlan(exercise.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar ao Plano
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Exercise Parameters */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <Repeat className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Séries</p>
            <p className="text-2xl font-bold">{exercise.sets || '-'}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <Dumbbell className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Repetições</p>
            <p className="text-2xl font-bold">{exercise.repetitions || '-'}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Duração</p>
            <p className="text-2xl font-bold">{exercise.duration ? `${exercise.duration}s` : '-'}</p>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            {exercise.video_url && (
              <TabsTrigger value="video" className="flex-1">
                <Video className="h-4 w-4 mr-2" />
                Vídeo
              </TabsTrigger>
            )}
            {exercise.image_url && (
              <TabsTrigger value="image" className="flex-1">
                <ImageIcon className="h-4 w-4 mr-2" />
                Imagem
              </TabsTrigger>
            )}
            <TabsTrigger value="info" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
          </TabsList>

          {exercise.video_url && (
            <TabsContent value="video" className="mt-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {embedUrl ? (
                  isDirectVideo ? (
                    <video 
                      controls 
                      className="w-full h-full"
                      src={embedUrl}
                    >
                      Seu navegador não suporta vídeos.
                    </video>
                  ) : (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <Play className="w-16 h-16 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Formato de vídeo não suportado</p>
                    <Button 
                      variant="outline"
                      onClick={() => window.open(exercise.video_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir link externo
                    </Button>
                  </div>
                )}
              </div>
              {exercise.video_url && (
                <Button 
                  variant="link" 
                  className="mt-2 p-0 h-auto"
                  onClick={() => window.open(exercise.video_url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir em nova aba
                </Button>
              )}
            </TabsContent>
          )}

          {exercise.image_url && (
            <TabsContent value="image" className="mt-4">
              <div className="rounded-lg overflow-hidden bg-muted">
                <OptimizedImage
                  src={exercise.image_url}
                  alt={exercise.name || ''}
                  className="w-full max-h-[500px]"
                  aspectRatio="auto"
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="info" className="mt-4 space-y-6">
            {/* Description */}
            {exercise.description && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição
                </h4>
                <p className="text-muted-foreground leading-relaxed">{exercise.description}</p>
              </div>
            )}
            
            {/* Instructions */}
            {exercise.instructions && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Instruções de Execução
                </h4>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {exercise.instructions}
                  </p>
                </div>
              </div>
            )}

            {!exercise.description && !exercise.instructions && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma informação adicional disponível</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
