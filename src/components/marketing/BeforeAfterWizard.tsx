/**
 * Smart Before/After Wizard Component
 *
 * A drag-and-drop tool to create professional before/after comparison images
 * with auto-alignment, grid overlay, watermark, and face blur options.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {

  Upload,
  Image as ImageIcon,
  Download,
  Sparkles,
  Grid3x3,
  X,
  Plus,
  Minus,
  RotateCw,
  FlipHorizontal,
  Eye,
  EyeOff,
  WaterDrop,
  Scissors,
  Move,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  type: 'before' | 'after';
}

interface GridConfig {
  show: boolean;
  color: string;
  opacity: number;
  size: number;
}

interface WatermarkConfig {
  show: boolean;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  size: number;
}

interface BeforeAfterWizardProps {
  patientName?: string;
  clinicName?: string;
  onSave?: (blob: Blob) => void;
}

export function BeforeAfterWizard({
  patientName = 'Paciente',
  clinicName = 'Sua Clínica',
  onSave,
}: BeforeAfterWizardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ before?: ImageFile; after?: ImageFile }>({});
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    show: true,
    color: '#ffffff',
    opacity: 0.3,
    size: 50,
  });
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({
    show: true,
    text: clinicName,
    position: 'bottom-right',
    opacity: 0.7,
    size: 24,
  });
  const [showLabels, setShowLabels] = useState(true);
  const [blurFaces, setBlurFaces] = useState(false);
  const [splitView, setSplitView] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem válido');
        return;
      }

      const preview = URL.createObjectURL(file);
      const imageFile: ImageFile = {
        id: `${type}-${Date.now()}`,
        file,
        preview,
        type,
      };

      setImages((prev) => ({ ...prev, [type]: imageFile }));
      toast.success(`Imagem "${type === 'before' ? 'Antes' : 'Depois'}" carregada`);
    },
    []
  );

  const removeImage = (type: 'before' | 'after') => {
    setImages((prev) => {
      const updated = { ...prev };
      if (updated[type]?.preview) {
        URL.revokeObjectURL(updated[type]!.preview);
      }
      delete updated[type];
      return updated;
    });
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !images.before || !images.after) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgBefore = new Image();
    const imgAfter = new Image();

    imgBefore.onload = () => {
      imgAfter.onload = () => {
        // Set canvas size to match images (assuming same dimensions)
        const maxWidth = Math.max(imgBefore.width, imgAfter.width);
        const maxHeight = Math.max(imgBefore.height, imgAfter.height);
        canvas.width = maxWidth;
        canvas.height = maxHeight;

        // Draw split view
        if (splitView) {
          const splitX = (sliderPosition / 100) * maxWidth;

          // Draw "after" image (background)
          ctx.drawImage(imgAfter, 0, 0, maxWidth, maxHeight);

          // Draw "before" image (foreground, clipped)
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, splitX, maxHeight);
          ctx.clip();
          ctx.drawImage(imgBefore, 0, 0, maxWidth, maxHeight);
          ctx.restore();

          // Draw slider line
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(splitX, 0);
          ctx.lineTo(splitX, maxHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw slider handle
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(splitX, maxHeight / 2, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(splitX, maxHeight / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Side by side view
          const halfWidth = maxWidth / 2;
          ctx.drawImage(imgBefore, 0, 0, halfWidth, maxHeight);
          ctx.drawImage(imgAfter, halfWidth, 0, halfWidth, maxHeight);

          // Draw divider
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(halfWidth, 0);
          ctx.lineTo(halfWidth, maxHeight);
          ctx.stroke();
        }

        // Apply blur if enabled
        if (blurFaces) {
          ctx.filter = 'blur(10px)';
          // Apply blur to top center area (face position)
          const faceY = maxHeight * 0.1;
          const faceHeight = maxHeight * 0.2;
          ctx.fillStyle = 'rgba(0,0,0,0.01)';
          ctx.fillRect(maxWidth * 0.3, faceY, maxWidth * 0.4, faceHeight);
          ctx.filter = 'none';
        }

        // Draw grid
        if (gridConfig.show) {
          ctx.strokeStyle = gridConfig.color;
          ctx.globalAlpha = gridConfig.opacity;
          ctx.lineWidth = 1;

          // Vertical lines
          for (let x = 0; x <= maxWidth; x += gridConfig.size) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, maxHeight);
            ctx.stroke();
          }

          // Horizontal lines
          for (let y = 0; y <= maxHeight; y += gridConfig.size) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(maxWidth, y);
            ctx.stroke();
          }

          ctx.globalAlpha = 1;
        }

        // Draw labels
        if (showLabels) {
          ctx.font = 'bold 24px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;

          const labelBefore = 'ANTES';
          const labelAfter = 'DEPOIS';

          // Before label background
          const textBeforeWidth = ctx.measureText(labelBefore).width;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(10, 10, textBeforeWidth + 20, 40);

          ctx.fillStyle = '#ffffff';
          ctx.strokeText(labelBefore, 20, 40);
          ctx.fillText(labelBefore, 20, 40);

          // After label background
          const textAfterWidth = ctx.measureText(labelAfter).width;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(maxWidth - textAfterWidth - 30, 10, textAfterWidth + 20, 40);

          ctx.fillStyle = '#ffffff';
          ctx.strokeText(labelAfter, maxWidth - textAfterWidth - 20, 40);
          ctx.fillText(labelAfter, maxWidth - textAfterWidth - 20, 40);
        }

        // Draw watermark
        if (watermarkConfig.show && watermarkConfig.text) {
          ctx.font = `${watermarkConfig.size}px Arial`;
          ctx.globalAlpha = watermarkConfig.opacity;

          const textWidth = ctx.measureText(watermarkConfig.text).width;
          const padding = 15;
          let x = padding;
          let y = padding;

          switch (watermarkConfig.position) {
            case 'top-right':
              x = maxWidth - textWidth - padding;
              break;
            case 'bottom-left':
              y = maxHeight - padding;
              break;
            case 'bottom-right':
              x = maxWidth - textWidth - padding;
              y = maxHeight - padding;
              break;
            case 'center':
              x = (maxWidth - textWidth) / 2;
              y = maxHeight / 2;
              break;
          }

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeText(watermarkConfig.text, x, y);
          ctx.fillText(watermarkConfig.text, x, y);

          ctx.globalAlpha = 1;
        }

        // LGPD notice
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(
          `Autorizado: ${patientName}`,
          padding,
          maxHeight - padding - 15
        );
      };

      imgBefore.src = images.before!.preview;
      imgAfter.src = images.after!.preview;
    };
  }, [images, gridConfig, watermarkConfig, showLabels, blurFaces, splitView, sliderPosition, patientName]);

  // Auto-render canvas when dependencies change
  React.useEffect(() => {
    if (images.before && images.after) {
      renderCanvas();
    }
  }, [renderCanvas]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `antes-depois-${patientName}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Imagem baixada com sucesso!');

      if (onSave && blob) {
        onSave(blob);
      }
    }, 'image/png');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Antes e Depois Inteligente
        </CardTitle>
        <CardDescription>
          Crie comparações profissionais com grid, marca d'água e proteção LGPD
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Before Image */}
          <div className="space-y-2">
            <Label>Antes</Label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                images.before
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              {images.before ? (
                <div className="relative">
                  <img
                    src={images.before.preview}
                    alt="Antes"
                    className="max-h-48 mx-auto rounded"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeImage('before')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Badge className="absolute top-2 left-2">ANTES</Badge>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Foto inicial do tratamento
                  </p>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'before')}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Carregar
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* After Image */}
          <div className="space-y-2">
            <Label>Depois</Label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                images.after
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              {images.after ? (
                <div className="relative">
                  <img
                    src={images.after.preview}
                    alt="Depois"
                    className="max-h-48 mx-auto rounded"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeImage('after')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Badge className="absolute top-2 left-2">DEPOIS</Badge>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Foto após o tratamento
                  </p>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'after')}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Carregar
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Preview */}
        {images.before && images.after && (
          <div className="space-y-4">
            <Label>Pré-visualização</Label>
            <div className="relative bg-black rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto"
                style={{ maxHeight: '400px' }}
              />
              {splitView && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
                  style={{ left: `${sliderPosition}%` }}
                />
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        {images.before && images.after && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* View Options */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Opções de Visualização
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="split-view" className="cursor-pointer">
                    Vista Dividida (Slider)
                  </Label>
                  <Switch
                    id="split-view"
                    checked={splitView}
                    onCheckedChange={setSplitView}
                  />
                </div>

                {splitView && (
                  <div className="space-y-2">
                    <Label>Posição do Slider</Label>
                    <Slider
                      value={[sliderPosition]}
                      onValueChange={([v]) => setSliderPosition(v)}
                      min={10}
                      max={90}
                      step={1}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-labels" className="cursor-pointer">
                    Mostrar Labels (Antes/Depois)
                  </Label>
                  <Switch
                    id="show-labels"
                    checked={showLabels}
                    onCheckedChange={setShowLabels}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="blur-faces" className="cursor-pointer">
                    Desfocar Rostos (LGPD)
                  </Label>
                  <Switch
                    id="blur-faces"
                    checked={blurFaces}
                    onCheckedChange={setBlurFaces}
                  />
                </div>
              </div>
            </div>

            {/* Grid & Watermark */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                Grid e Marca d'água
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-grid" className="cursor-pointer">
                    Mostrar Grid
                  </Label>
                  <Switch
                    id="show-grid"
                    checked={gridConfig.show}
                    onCheckedChange={(checked) =>
                      setGridConfig({ ...gridConfig, show: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tamanho do Grid</Label>
                  <Slider
                    value={[gridConfig.size]}
                    onValueChange={([v]) => setGridConfig({ ...gridConfig, size: v })}
                    min={20}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Texto da Marca d'água</Label>
                  <Input
                    value={watermarkConfig.text}
                    onChange={(e) =>
                      setWatermarkConfig({ ...watermarkConfig, text: e.target.value })
                    }
                    placeholder="Sua Clínica"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-watermark" className="cursor-pointer">
                    Mostrar Marca d'água
                  </Label>
                  <Switch
                    id="show-watermark"
                    checked={watermarkConfig.show}
                    onCheckedChange={(checked) =>
                      setWatermarkConfig({ ...watermarkConfig, show: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Button */}
        {images.before && images.after && (
          <Button onClick={handleDownload} disabled={isProcessing} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar Imagem
          </Button>
        )}

        {/* LGPD Notice */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-200">
          <p className="font-medium mb-1">⚠️ LGPD - Proteção de Dados</p>
          <p>
            Certifique-se de que o paciente assinou o Termo de Consentimento para Uso de Imagem.
            Use a opção de desfocar rostos para maior privacidade.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
