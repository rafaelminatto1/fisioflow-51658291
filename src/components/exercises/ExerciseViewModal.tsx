import React from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {

  Heart, Share2, ExternalLink, Edit,
  Clock, Repeat, Dumbbell, FileText, Video, Image as ImageIcon,
  AlertTriangle, Printer, X, CheckCircle2, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import type { Exercise } from '@/hooks/useExercises';
import { withImageParams, buildImageSrcSet } from '@/lib/storageProxy';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface ExerciseViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onEdit?: (exercise: Exercise) => void;
}

const difficultyColors: Record<string, string> = {
  'Fácil': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-emerald-500/20',
  'Iniciante': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-emerald-500/20',
  'Médio': 'bg-amber-500/10 text-amber-600 border-amber-500/20 ring-amber-500/20',
  'Intermediário': 'bg-amber-500/10 text-amber-600 border-amber-500/20 ring-amber-500/20',
  'Difícil': 'bg-rose-500/10 text-rose-600 border-rose-500/20 ring-rose-500/20',
  'Avançado': 'bg-rose-500/10 text-rose-600 border-rose-500/20 ring-rose-500/20',
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

  const defaultTab = hasVideo ? 'video' : 'image';

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: exercise?.name ?? 'Exercício',
        text: exercise.description || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-[50%] top-[50%] z-50 transform !-translate-x-1/2 !-translate-y-1/2 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-5xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          onOpenChange(false)
        }}
      >

        {/* Header */}
        <div className="flex-none p-4 sm:p-6 border-b bg-background/50 backdrop-blur-sm z-10 flex items-start justify-between gap-4">
          <div className="space-y-1.5 pt-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {exercise?.name ?? 'Exercício'}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {exercise.category && (
                <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/10 transition-colors">
                  {exercise.category}
                </Badge>
              )}
              {exercise.difficulty && (
                <Badge
                  variant="outline"
                  className={cn("border bg-background/50", difficultyColors[exercise.difficulty])}
                >
                  {exercise.difficulty}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-md transition-all",
                  isFavorite(exercise.id)
                    ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-600"
                    : "text-muted-foreground hover:text-rose-500"
                )}
                onClick={() => toggleFavorite(exercise.id)}
                title={isFavorite(exercise.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <Heart className={cn("h-4 w-4", isFavorite(exercise.id) && "fill-current")} />
              </Button>

              <Separator orientation="vertical" className="h-4" />

              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={handleShare} title="Compartilhar">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => window.print()} title="Imprimir">
                <Printer className="h-4 w-4" />
              </Button>

              {onEdit && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => {
                    onOpenChange(false);
                    onEdit(exercise);
                  }} title="Editar">
                    <Edit className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted ml-2">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12">

          {/* Left Column - Media (7 cols) */}
          <div className="lg:col-span-7 bg-muted/10 h-full flex flex-col border-r border-border/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-muted/40 pointer-events-none" />

            <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col relative z-0">
              <div className="px-6 pt-4 flex-none z-10">
                <TabsList className="bg-background/80 backdrop-blur border w-auto inline-flex shadow-sm">
                  <TabsTrigger value="video" disabled={!hasVideo} className="gap-2 px-4">
                    <Video className="h-4 w-4" /> Vídeo
                  </TabsTrigger>
                  <TabsTrigger value="image" disabled={!hasImage} className="gap-2 px-4">
                    <ImageIcon className="h-4 w-4" /> Imagem
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 p-3 sm:p-6 flex items-center justify-center min-h-0">
                <TabsContent value="video" className="w-full h-full mt-0 data-[state=active]:flex data-[state=active]:items-center data-[state=active]:justify-center">
                  {hasVideo ? (
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black/5 relative group">
                      {embedUrl ? (
                        isDirectVideo ? (
                          <video controls className="w-full h-full" src={embedUrl}>
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
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                          <AlertTriangle className="h-12 w-12 opacity-50" />
                          <p>Erro ao carregar vídeo</p>
                          <Button variant="outline" size="sm" onClick={() => window.open(exercise.video_url, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir externo
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-12 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
                      <VideoOffState />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="image" className="w-full h-full mt-0 data-[state=active]:flex data-[state=active]:items-center data-[state=active]:justify-center">
                  {hasImage ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-white/5 rounded-xl overflow-hidden shadow-lg border border-border/50">
                      <OptimizedImage
                        src={exercise.image_url!}
                        alt={exercise?.name ?? 'Exercício'}
                        className="max-w-full max-h-full object-contain"
                        aspectRatio="auto"
                        priority={true}
                        srcset={buildImageSrcSet(exercise.image_url!, {
                          widths: [640, 960, 1280, 1600],
                          format: 'auto',
                          fit: 'inside',
                          quality: 80
                        })}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 70vw, 60vw"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-12 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground">Sem imagem</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Column - Information (5 cols) */}
          <div className="lg:col-span-5 h-full min-h-0 bg-background flex flex-col">
            <ScrollArea className="flex-1 h-full min-h-0">
              <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">

                {/* Metrics / Parameters */}
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard
                    icon={Repeat}
                    label="Séries"
                    value={exercise.sets}
                    subLabel={exercise.sets ? "séries" : undefined}
                  />
                  <MetricCard
                    icon={Dumbbell}
                    label="Repetições"
                    value={exercise.repetitions}
                    subLabel={exercise.repetitions ? "reps" : undefined}
                  />
                  <MetricCard
                    icon={Clock}
                    label="Duração"
                    value={exercise.duration}
                    subLabel={exercise.duration ? "segundos" : undefined}
                  />
                </div>

                <Separator />

                {/* Description */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <FileText className="h-4 w-4" />
                    </div>
                    Descrição
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/40">
                    {exercise.description ? (
                      <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                        {exercise.description}
                      </p>
                    ) : (
                      <span className="text-sm text-muted-foreground/50 italic">Nenhuma descrição fornecida.</span>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    Instruções de Execução
                  </div>
                  <div className="bg-muted/30  rounded-lg border border-border/40 overflow-hidden">
                    {exercise.instructions ? (
                      <div className="p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {exercise.instructions}
                      </div>
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground/50 italic">Nenhuma instrução adicional.</div>
                    )}
                  </div>
                </div>

                {/* Related (Optional - keeping simplified for now) */}
                {exercise.category && (
                  <div className="pt-4 mt-auto">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">Relacionados</h4>
                    <Button variant="outline" className="w-full justify-between group h-auto py-3 border-dashed" disabled>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">Ver mais exercícios de {exercise.category}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </Button>
                  </div>
                )}

              </div>
            </ScrollArea>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ icon: Icon, label, value, _subLabel }: { icon: React.ComponentType<{ className?: string }>, label: string, value?: string | number | null, subLabel?: string }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/50 flex flex-col items-center justify-center text-center gap-1 hover:bg-muted/50 transition-colors group">
      <div className="p-2 rounded-full bg-background shadow-sm mb-1 group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-[10px] items-center font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-lg font-bold tracking-tight", !value && "text-muted-foreground/40")}>
          {value || '-'}
        </span>
      </div>
    </div>
  );
}

function VideoOffState() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Video className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-muted-foreground">Sem vídeo disponível</p>
        <p className="text-xs text-muted-foreground/60 max-w-[200px] mx-auto">Este exercício não possui uma demonstração em vídeo.</p>
      </div>
    </div>
  )
}
