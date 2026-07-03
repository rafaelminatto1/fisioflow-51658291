import "@/styles/bundles/exercise-view-modal.css";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Share2,
  ExternalLink,
  Edit,
  Clock,
  Repeat,
  Dumbbell,
  FileText,
  Video,
  AlertTriangle,
  Printer,
  X,
  CheckCircle2,
  ChevronRight,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useExerciseFavorites } from "@/hooks/useExerciseFavorites";
import { useToast } from "@/hooks/use-toast";
import type { Exercise } from "@/hooks/useExercises";
import { getBestImageUrl, getImageUrlCandidates, isYouTubeUrl, getYouTubeThumbnailUrl } from "@/lib/imageUtils";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ShareExerciseToWhatsAppModal } from "./ShareExerciseToWhatsAppModal";
import "@/styles/print.css";
import { useQuery } from "@tanstack/react-query";
import { exercisesApi } from "@/api/v2";

interface ScientificReference {
  citation: string;
  url?: string;
  evidenceLevel?: string;
}

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "youtube";
  thumbnailUrl?: string | null;
  caption?: string | null;
  orderIndex?: number;
}

type ExerciseExtended = Exercise & {
  name_en?: string;
  aliases_pt?: string[];
  aliases_en?: string[];
  alternativeEquipment?: string[];
  precaution_level?: string;
  precaution_notes?: string;
  scientific_references?: ScientificReference[] | string | null;
  media?: MediaItem[];
};

interface ExerciseViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onEdit?: (exercise: Exercise) => void;
}

const difficultyColors: Record<string, string> = {
  Fácil: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-emerald-500/20",
  Iniciante: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-emerald-500/20",
  Médio: "bg-amber-500/10 text-amber-600 border-amber-500/20 ring-amber-500/20",
  Intermediário: "bg-amber-500/10 text-amber-600 border-amber-500/20 ring-amber-500/20",
  Difícil: "bg-rose-500/10 text-rose-600 border-rose-500/20 ring-rose-500/20",
  Avançado: "bg-rose-500/10 text-rose-600 border-rose-500/20 ring-rose-500/20",
};

function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
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
  onEdit,
}: ExerciseViewModalProps) {
  const { isFavorite, toggleFavorite } = useExerciseFavorites();
  const { toast } = useToast();
  const [shareWhatsAppOpen, setShareWhatsAppOpen] = React.useState(false);
  const [activeMediaId, setActiveMediaId] = React.useState<string | null>(null);

  const { data: detailData } = useQuery({
    queryKey: ["exercise-detail", exercise?.id],
    queryFn: () => exercisesApi.get(exercise!.id),
    enabled: Boolean(open && exercise?.id),
    staleTime: 0,
  });

  const currentExercise = React.useMemo<ExerciseExtended | null>(() => {
    if (!exercise) return null;
    const fetched = (detailData?.data as Partial<ExerciseExtended> | undefined) ?? {};
    return { ...(exercise as ExerciseExtended), ...fetched } as ExerciseExtended;
  }, [exercise, detailData]);

  const activeExercise = currentExercise || exercise;

  if (!exercise) return null;

  const mediaList = React.useMemo(() => {
    if (!activeExercise) return [];
    const list = activeExercise.media || [];
    if (list.length === 0) {
      const fallbackList = [];
      const imageUrl = getBestImageUrl(activeExercise);
      if (imageUrl) {
        fallbackList.push({
          id: "fallback-image",
          type: "image" as const,
          url: imageUrl,
          caption: "Imagem Principal",
        });
      }
      if (activeExercise.video_url) {
        const isYoutube =
          activeExercise.video_url.includes("youtube.com") || activeExercise.video_url.includes("youtu.be");
        fallbackList.push({
          id: "fallback-video",
          type: isYoutube ? ("youtube" as const) : ("video" as const),
          url: activeExercise.video_url,
          caption: "Vídeo Demonstrativo",
        });
      }
      return fallbackList;
    }
    return list;
  }, [activeExercise]);

  React.useEffect(() => {
    if (mediaList.length > 0) {
      // Tenta encontrar o primeiro vídeo/youtube
      const firstVideo = mediaList.find((m) => m.type !== "image");
      if (firstVideo) {
        setActiveMediaId(firstVideo.id);
      } else {
        setActiveMediaId(mediaList[0].id);
      }
    } else {
      setActiveMediaId(null);
    }
  }, [mediaList]);

  const activeMedia = mediaList.find((m) => m.id === activeMediaId) || mediaList[0] || null;

  const handleShare = () => {
    setShareWhatsAppOpen(true);
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      toast({
        title: "Erro ao imprimir",
        description: "Não foi possível abrir o diálogo de impressão.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="fixed left-[50%] top-[50%] z-50 !-translate-x-1/2 !-translate-y-1/2 w-[96vw] md:w-[94vw] xl:w-[90vw] max-w-[1680px] max-h-[94dvh] sm:max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col bg-card border-border/50 shadow-2xl rounded-lg exercise-print-layout"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            onOpenChange(false);
          }}
        >
          {/* Header */}
          <div className="flex-none p-4 sm:p-6 border-b bg-card z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 exercise-print-header">
            <div className="space-y-1.5 pt-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 exercise-print-title">
                {exercise?.name ?? "Exercício"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Visualização detalhada do exercício {exercise?.name}
              </DialogDescription>
              <div className="flex items-center gap-2 flex-wrap exercise-print-badges no-print">
                {exercise.category && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/10 transition-colors exercise-print-badge"
                  >
                    {exercise.category}
                  </Badge>
                )}
                {exercise.difficulty && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "border bg-card",
                      difficultyColors[exercise.difficulty],
                      "exercise-print-badge",
                    )}
                  >
                    {exercise.difficulty}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-md transition-all",
                    isFavorite(exercise.id)
                      ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-600"
                      : "text-muted-foreground hover:text-rose-500",
                  )}
                  onClick={() => toggleFavorite(exercise.id)}
                  title={
                    isFavorite(exercise.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"
                  }
                >
                  <Heart className={cn("h-4 w-4", isFavorite(exercise.id) && "fill-current")} />
                </Button>

                <Separator orientation="vertical" className="h-4" />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700"
                  onClick={handleShare}
                  title="Enviar via WhatsApp"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={handlePrint}
                  title="Imprimir"
                >
                  <Printer className="h-4 w-4" />
                </Button>

                {onEdit && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        onOpenChange(false);
                        onEdit(exercise);
                      }}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-muted ml-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Left Column - Media */}
            <div className="lg:col-span-7 xl:col-span-8 bg-muted/10 min-h-[420px] lg:min-h-0 lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-border/50 overflow-hidden relative exercise-print-media">
              <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-muted/40 pointer-events-none" />

              <div className="relative z-0 flex min-h-0 flex-1 flex-col p-4 sm:p-6 justify-center">
                {/* Main Media Preview */}
                <div className="flex-1 flex min-h-[320px] min-h-0 items-center justify-center lg:min-h-0">
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black/5 relative group flex items-center justify-center">
                    {activeMedia ? (
                      activeMedia.type === "image" ? (
                        <OptimizedImage
                          src={activeMedia.url}
                          alt={activeMedia.caption || exercise.name || "Imagem do exercício"}
                          className="h-full w-full object-contain"
                          aspectRatio="16:9"
                          fallback="/placeholder.svg"
                          style={{ objectFit: "contain" }}
                          fallbackSrcs={getImageUrlCandidates(exercise)}
                        />
                      ) : (
                        (() => {
                          const embedUrl = getEmbedUrl(activeMedia.url);
                          const isDirectVideo = embedUrl?.match(/\.(mp4|webm|ogg)$/i);
                          if (embedUrl) {
                            return isDirectVideo ? (
                              <video controls className="w-full h-full object-contain" src={embedUrl}>
                                Seu navegador não suporta vídeos.
                              </video>
                            ) : (
                              <iframe
                                src={embedUrl}
                                className="w-full h-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            );
                          } else {
                            return (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                                <AlertTriangle className="h-12 w-12 opacity-50" />
                                <p className="text-xs">Erro ao carregar vídeo</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(activeMedia.url, "_blank")}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Abrir externo
                                </Button>
                              </div>
                            );
                          }
                        })()
                      )
                    ) : (
                      <div className="text-center p-12 text-slate-400">
                        Nenhuma mídia disponível
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtitle / Caption for Active Media */}
                {activeMedia?.caption && (
                  <div className="mt-2 text-center text-xs text-muted-foreground italic">
                    {activeMedia.caption}
                  </div>
                )}

                {/* Thumbnail List (only shown if there are multiple items) */}
                {mediaList.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-thin mt-4 max-w-full justify-start no-scrollbar">
                    {mediaList.map((item) => {
                      const isActive = item.id === activeMediaId;
                      const isYouTube = item.type === "youtube" || isYouTubeUrl(item.url);
                      const isVideo = item.type === "video";
                      const thumb = item.type === "image" 
                        ? item.url 
                        : (item.thumbnailUrl || (isYouTube ? getYouTubeThumbnailUrl(item.url) : null));

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveMediaId(item.id)}
                          className={cn(
                            "h-14 w-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all relative shrink-0 flex items-center justify-center bg-slate-950",
                            isActive 
                              ? "border-primary scale-[1.03] shadow-md ring-2 ring-primary/20" 
                              : "border-transparent opacity-70 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700"
                          )}
                        >
                          {thumb ? (
                            <img src={thumb} className="h-full w-full object-cover animate-fade-in" alt="" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white/50">
                              <Video className="h-4 w-4" />
                            </div>
                          )}
                          
                          {/* Overlays for video/youtube items */}
                          {(isVideo || isYouTube) && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/20 transition-colors">
                              <div className="p-1 rounded-full bg-white/20 backdrop-blur-sm">
                                <Play className="h-3 w-3 fill-white text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Information */}
            <div className="lg:col-span-5 xl:col-span-4 h-auto lg:h-full min-h-0 bg-background flex flex-col">
              <ScrollArea className="lg:flex-1 lg:h-full lg:min-h-0">
                <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                  {/* Metrics / Parameters */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 exercise-print-metrics">
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
                  <div className="space-y-3 exercise-print-section">
                    <div className="flex items-center gap-2 text-primary font-medium exercise-print-section-title no-print">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <FileText className="h-4 w-4" />
                      </div>
                      Descrição
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/40 exercise-print-section-content">
                      {exercise.description ? (
                        <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                          {exercise.description}
                        </p>
                      ) : (
                        <span className="text-sm text-muted-foreground/50 italic">
                          Nenhuma descrição fornecida.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-3 exercise-print-section">
                    <div className="flex items-center gap-2 text-primary font-medium exercise-print-section-title no-print">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      Instruções de Execução
                    </div>
                    <div className="bg-muted/30  rounded-lg border border-border/40 overflow-hidden exercise-print-section-content">
                      {exercise.instructions ? (
                        <div className="p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {exercise.instructions}
                        </div>
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground/50 italic">
                          Nenhuma instrução adicional.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinical Intelligence: Pathologies */}
                  {(exercise.indicated_pathologies?.length ||
                    exercise.contraindicated_pathologies?.length) && (
                    <div className="space-y-4 exercise-print-section">
                      <div className="flex items-center gap-2 text-primary font-medium exercise-print-section-title no-print">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Heart className="h-4 w-4" />
                        </div>
                        Inteligência Clínica
                      </div>

                      <div className="space-y-4">
                        {exercise.indicated_pathologies &&
                          exercise.indicated_pathologies.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-semibold uppercase text-emerald-600 tracking-wider flex items-center gap-1.5 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Indicações Principais
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {exercise.indicated_pathologies.map((path) => (
                                  <Badge
                                    key={path}
                                    variant="secondary"
                                    className="bg-emerald-500/5 text-emerald-700 border-emerald-500/10 text-[11px] py-0.5"
                                  >
                                    {path}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {exercise.contraindicated_pathologies &&
                          exercise.contraindicated_pathologies.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-semibold uppercase text-rose-600 tracking-wider flex items-center gap-1.5 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Contraindicações / Cuidados
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {exercise.contraindicated_pathologies.map((path) => (
                                  <Badge
                                    key={path}
                                    variant="secondary"
                                    className="bg-rose-500/5 text-rose-700 border-rose-500/10 text-[11px] py-0.5"
                                  >
                                    {path}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Scientific References */}
                  {exercise.scientific_references && (
                    <div className="space-y-3 exercise-print-section">
                      <div className="flex items-center gap-2 text-primary font-medium exercise-print-section-title no-print">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <FileText className="h-4 w-4" />
                        </div>
                        Evidência Científica
                      </div>
                      <div className="bg-muted/20 p-4 rounded-lg border border-border/30 text-xs text-muted-foreground italic leading-relaxed exercise-print-references">
                        {typeof exercise.scientific_references === "string" ? (
                          <div className="prose prose-sm prose-invert max-w-none">
                            {exercise.scientific_references}
                          </div>
                        ) : (
                          <ul className="space-y-1 list-disc pl-4 not-italic">
                            {(exercise.scientific_references as any[]).map((ref, idx) => (
                              <li key={idx}>
                                {ref.authors && `${ref.authors}. `}
                                <strong>{ref.title}</strong>
                                {ref.journal && `. ${ref.journal}`}
                                {ref.year && ` (${ref.year})`}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Related (Optional - keeping simplified for now) */}
                  {exercise.category && (
                    <div className="pt-4 mt-auto no-print">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                        Relacionados
                      </h4>
                      <Button
                        variant="outline"
                        className="w-full justify-between group h-auto py-3 border-dashed"
                        disabled
                      >
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">
                          Ver mais exercícios de {exercise.category}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </Button>
                    </div>
                  )}

                  {/* Print Footer */}
                  <div className="exercise-print-footer hidden print:block">
                    <p>Gerado pelo FisioFlow - Sistema de Gerenciamento de Fisioterapia</p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Share to WhatsApp Modal */}
      <ShareExerciseToWhatsAppModal
        open={shareWhatsAppOpen}
        onOpenChange={setShareWhatsAppOpen}
        exercise={exercise}
      />
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subLabel: _subLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number | null;
  subLabel?: string;
}) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/50 flex flex-col items-center justify-center text-center gap-1 hover:bg-muted/50 transition-colors group exercise-print-metric">
      <div className="p-2 rounded-full bg-background shadow-sm mb-1 group-hover:scale-110 transition-transform duration-300 no-print">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-[10px] items-center font-medium text-muted-foreground uppercase tracking-wider exercise-print-metric-label whitespace-nowrap">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            !value && "text-muted-foreground/40",
            "exercise-print-metric-value",
          )}
        >
          {value || "-"}
        </span>
      </div>
    </div>
  );
}
