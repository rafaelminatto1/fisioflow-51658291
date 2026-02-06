/**
 * Patient Journey Timelapse Component
 *
 * Automatically stitches together patient evolution photos into a timelapse video
 * to demonstrate progress during long-term treatments.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {

  Video,
  Image as ImageIcon,
  Upload,
  Play,
  Pause,
  Download,
  Sparkles,
  Film,
  Trash2,
  Plus,
  Clock,
  Calendar,
  X,
  MoveVertical,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimelineImage {
  id: string;
  file: File;
  preview: string;
  date: string;
  notes?: string;
}

interface JourneyTimelapseProps {
  patientName?: string;
  onSave?: (blob: Blob) => void;
}

const TRANSITION_TYPES = [
  { value: 'fade', label: 'Fade Suave', duration: 500 },
  { value: 'cut', label: 'Corte Direto', duration: 200 },
  { value: 'dissolve', label: 'Dissolver', duration: 800 },
  { value: 'zoom', label: 'Zoom', duration: 1000 },
];

const FRAME_RATES = [
  { value: '1', label: '1 fps (Lento)' },
  { value: '2', label: '2 fps' },
  { value: '5', label: '5 fps' },
  { value: '10', label: '10 fps (Rápido)' },
];

export function JourneyTimelapse({
  patientName = 'Paciente',
  onSave,
}: JourneyTimelapseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<TimelineImage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [fps, setFps] = useState(2);
  const [transition, setTransition] = useState('fade');
  const [durationPerImage, setDurationPerImage] = useState(1000);
  const [showDates, setShowDates] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [watermark, setWatermark] = useState('');
  const [generating, setGenerating] = useState(false);

  const animationRef = useRef<number>();
  const lastFrameTime = useRef<number>(0);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const newImages: TimelineImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const preview = URL.createObjectURL(file);
        const img: TimelineImage = {
          id: `img-${Date.now()}-${i}`,
          file,
          preview,
          date: new Date().toISOString().split('T')[0],
        };

        // Try to extract date from EXIF (simplified)
        newImages.push(img);
      }

      setImages((prev) => [...prev, ...newImages].sort((a, b) =>
        a.date.localeCompare(b.date)
      ));

      toast.success(`${newImages.length} imagem(ns) adicionada(s)`);
    },
    []
  );

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img?.preview) {
        URL.revokeObjectURL(img.preview);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const updateImageDate = (id: string, date: string) => {
    setImages((prev) =>
      prev
        .map((img) => (img.id === id ? { ...img, date } : img))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  };

  const playTimelapse = useCallback(() => {
    if (images.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameIndex = currentFrame;
    const startTime = performance.now();
    lastFrameTime.current = startTime;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastFrameTime.current;
      const frameDuration = 1000 / fps;

      if (elapsed >= frameDuration) {
        frameIndex = (frameIndex + 1) % images.length;
        setCurrentFrame(frameIndex);
        lastFrameTime.current = currentTime - (elapsed % frameDuration);

        // Draw current frame
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Calculate aspect ratio to fit canvas
          const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          );
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;

          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          // Overlay info
          if (showDates && images[frameIndex]) {
            const dateOverlay = document.createElement('canvas');
            const overlayCtx = dateOverlay.getContext('2d');
            if (overlayCtx) {
              overlayCtx.font = 'bold 24px Arial';
              const text = formatDate(images[frameIndex].date);
              const metrics = overlayCtx.measureText(text);

              // Background
              ctx.fillStyle = 'rgba(0,0,0,0.7)';
              ctx.fillRect(10, 10, metrics.width + 20, 40);

              // Text
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 24px Arial';
              ctx.fillText(text, 20, 40);
            }
          }

          // Progress bar
          if (showProgress) {
            const progress = (frameIndex + 1) / images.length;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(0, canvas.height - 10, canvas.width * progress, 10);
          }

          // Frame counter
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = '16px Arial';
          ctx.fillText(
            `${frameIndex + 1} / ${images.length}`,
            canvas.width - 80,
            30
          );
        };
        img.src = images[frameIndex].preview;
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [images, fps, isPlaying, currentFrame, showDates, showProgress]);

  // Start/stop playback
  React.useEffect(() => {
    if (isPlaying && images.length > 0) {
      playTimelapse();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, images, playTimelapse]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Initial draw when images change
  React.useEffect(() => {
    if (images.length > 0 && canvasRef.current && !isPlaying) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = 800;
        canvas.height = 600;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw placeholder
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${images.length} imagens carregadas`,
          canvas.width / 2,
          canvas.height / 2
        );
        ctx.font = '16px Arial';
        ctx.fillText(
          'Clique em play para visualizar',
          canvas.width / 2,
          canvas.height / 2 + 40
        );
      };
      img.src = images[0].preview;
    }
  }, [images, isPlaying]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          Timelapse da Jornada do Paciente
        </CardTitle>
        <CardDescription>
          Crie vídeos timelapse automáticos com fotos de evolução
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            id="timelapse-upload"
          />
          <label htmlFor="timelapse-upload">
            <Button asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Carregar Fotos da Evolução
              </span>
            </Button>
          </label>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione múltiplas fotos. Serão ordenadas por data automaticamente.
          </p>
        </div>

        {/* Images List */}
        {images.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Fotos da Evolução ({images.length})
              </Label>
              <Button variant="outline" size="sm" onClick={() => setImages([])}>
                Limpar Todas
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className="relative group border rounded-lg overflow-hidden"
                >
                  <img
                    src={img.preview}
                    alt={`Frame ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-2 h-full flex flex-col justify-between">
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeImage(img.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <input
                        type="date"
                        value={img.date}
                        onChange={(e) => updateImageDate(img.id, e.target.value)}
                        className="text-xs bg-transparent text-white border border-white/30 rounded px-2 py-1"
                      />
                    </div>
                  </div>
                  <Badge className="absolute top-2 left-2 text-xs">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas Preview */}
        {images.length > 0 && (
          <div className="space-y-4">
            <Label>Pré-visualização</Label>
            <div className="bg-black rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full"
                style={{ maxHeight: '400px' }}
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={images.length === 0}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-4">
                  <Label className="text-sm">Velocidade:</Label>
                  <div className="flex gap-1">
                    {FRAME_RATES.map((rate) => (
                      <Badge
                        key={rate.value}
                        variant={fps === parseInt(rate.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFps(parseInt(rate.value))}
                      >
                        {rate.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">
                    Frame {currentFrame + 1} / {images.length}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${((currentFrame + 1) / images.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="show-dates" className="cursor-pointer text-sm">
                  Mostrar Datas
                </Label>
                <Switch
                  id="show-dates"
                  checked={showDates}
                  onCheckedChange={setShowDates}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="show-progress" className="cursor-pointer text-sm">
                  Barra de Progresso
                </Label>
                <Switch
                  id="show-progress"
                  checked={showProgress}
                  onCheckedChange={setShowProgress}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Marca d'água</Label>
                <Input
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  placeholder="Sua Clínica"
                />
              </div>
            </div>
          </div>
        )}

        {/* Export Note */}
        {images.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Exportação de Vídeo</p>
                <p className="text-xs mt-1">
                  Esta é uma pré-visualização do timelapse. A exportação completa em formato
                  vídeo será implementada em breve com suporte a todos os formatos populares.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LGPD Notice */}
        {images.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-200">
            <p className="font-medium mb-1">⚠️ LGPD - Consentimento Necessário</p>
            <p>
              Certifique-se de que o paciente assinou o Termo de Consentimento para Uso de Imagem
              antes de compartilhar qualquer conteúdo com sua evolução.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
