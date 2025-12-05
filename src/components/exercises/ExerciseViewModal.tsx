import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, Heart, Share2, ExternalLink, Edit,
  Clock, Repeat, Dumbbell, FileText, Video, Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import type { Exercise } from '@/hooks/useExercises';

interface ExerciseViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onEdit?: (exercise: Exercise) => void;
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

export function ExerciseViewModal({ 
  open, 
  onOpenChange, 
  exercise,
  onEdit 
}: ExerciseViewModalProps) {
  const { isFavorite, toggleFavorite } = useExerciseFavorites();
  
  if (!exercise) return null;

  const embedUrl = exercise.video_url ? getEmbedUrl(exercise.video_url) : null;
  const isDirectVideo = embedUrl?.match(/\.(mp4|webm|ogg)$/i);
  const hasVideo = !!exercise.video_url;
  const hasImage = !!exercise.image_url;
  const hasInfo = !!(exercise.description || exercise.instructions);

  const defaultTab = hasVideo ? 'video' : hasImage ? 'image' : 'info';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <DialogTitle className="text-2xl pr-8">{exercise.name}</DialogTitle>
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
                {!hasVideo && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Sem vídeo
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className={cn(isFavorite(exercise.id) && "text-red-500")}
              onClick={() => toggleFavorite(exercise.id)}
            >
              <Heart className={cn("h-4 w-4 mr-2", isFavorite(exercise.id) && "fill-current")} />
              {isFavorite(exercise.id) ? 'Favoritado' : 'Favoritar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => {
                onOpenChange(false);
                onEdit(exercise);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>

          {/* Exercise Parameters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Repeat className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Séries</p>
              <p className="text-xl font-bold">{exercise.sets || '-'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Dumbbell className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Repetições</p>
              <p className="text-xl font-bold">{exercise.repetitions || '-'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Duração</p>
              <p className="text-xl font-bold">{exercise.duration ? `${exercise.duration}s` : '-'}</p>
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="video" disabled={!hasVideo}>
                <Video className="h-4 w-4 mr-2" />
                Vídeo
              </TabsTrigger>
              <TabsTrigger value="image" disabled={!hasImage}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Imagem
              </TabsTrigger>
              <TabsTrigger value="info">
                <FileText className="h-4 w-4 mr-2" />
                Informações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="mt-4">
              {hasVideo ? (
                <div className="space-y-2">
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
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs"
                    onClick={() => window.open(exercise.video_url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Abrir em nova aba
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum vídeo disponível para este exercício</p>
                  {onEdit && (
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => {
                        onOpenChange(false);
                        onEdit(exercise);
                      }}
                    >
                      Adicionar vídeo
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="image" className="mt-4">
              {hasImage ? (
                <div className="rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={exercise.image_url!} 
                    alt={exercise.name}
                    className="w-full max-h-[400px] object-contain"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma imagem disponível para este exercício</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-4 space-y-4">
              {exercise.description && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Descrição
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {exercise.description}
                  </p>
                </div>
              )}
              
              {exercise.instructions && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Instruções de Execução
                  </h4>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">
                    {exercise.instructions}
                  </p>
                </div>
              )}

              {!exercise.description && !exercise.instructions && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma informação adicional disponível</p>
                  {onEdit && (
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => {
                        onOpenChange(false);
                        onEdit(exercise);
                      }}
                    >
                      Adicionar informações
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
