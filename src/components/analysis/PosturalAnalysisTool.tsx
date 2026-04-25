import React, { useRef, useEffect, useState } from "react";
import {
  Camera,
  RefreshCcw,
  Grid,
  Maximize2,
  AlertCircle,
  Trash2,
  User,
  Upload,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePoseDetection } from "@/hooks/biomechanics/usePoseDetection";
import { BiomechanicsOverlay } from "./canvas/BiomechanicsOverlay";
import { UnifiedLandmark } from "@/utils/geometry";

type ViewType = "front" | "side" | "back";

interface PosturalAnalysisToolProps {
  onCapture?: (image: string, analysis: any) => void;
  patientName?: string;
}

export const PosturalAnalysisTool: React.FC<PosturalAnalysisToolProps> = ({
  onCapture,
  patientName,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showSilhouette, setShowSilhouette] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("front");
  const [capturedImages, setCapturedImages] = useState<
    { url: string; type: string; landmarks: any }[]
  >([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const { detect, isReady, init } = usePoseDetection({
    runningMode: "VIDEO",
  });
  const [currentLandmarks, setCurrentLandmarks] = useState<UnifiedLandmark[]>([]);

  // Initialize Pose Detection
  useEffect(() => {
    init();
  }, [init]);

  // Process frame loop
  useEffect(() => {
    let requestRef: number;

    const processFrame = () => {
      if (isReady && videoRef.current) {
        const video = videoRef.current;
        if (video.readyState >= 2) {
          const result = detect(video);
          if (result?.landmarks?.length > 0) {
            setCurrentLandmarks(result.landmarks[0]);
          }
        }
      }
      requestRef = requestAnimationFrame(processFrame);
    };

    requestRef = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(requestRef);
  }, [isReady, detect]);

  const captureSnapshot = (type: string) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);
    const imageSrc = canvas.toDataURL("image/jpeg", 0.92);
    const snapshot = {
      url: imageSrc,
      type,
      landmarks: [...currentLandmarks],
    };
    setCapturedImages((prev) => [snapshot, ...prev]);
    if (onCapture) onCapture(imageSrc, { type, landmarks: currentLandmarks });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setMediaError("Envie um video para usar a analise postural no web.");
      return;
    }
    setMediaError(null);
    const nextUrl = URL.createObjectURL(file);
    setVideoSrc((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return nextUrl;
    });
  };

  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 h-full min-h-[600px]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          {/* Main Viewport */}
          <Card className="lg:col-span-3 relative overflow-hidden bg-black border-2 border-primary/20 rounded-2xl shadow-2xl group">
            {mediaError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-bold">Arquivo nao suportado</h3>
                <p className="text-muted-foreground mt-2">{mediaError}</p>
                <Button
                  variant="outline"
                  className="mt-6 border-white/20"
                  onClick={() => {
                    setMediaError(null);
                    fileInputRef.current?.click();
                  }}
                >
                  Escolher outro video
                </Button>
              </div>
            ) : !videoSrc ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Upload className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Upload para avaliacao postural</h3>
                  <p className="text-muted-foreground mt-2">
                    Envie um video gravado para usar a sobreposicao biomecanica e gerar capturas da
                    avaliacao.
                  </p>
                </div>
                <Button className="mt-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar video
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />

                <BiomechanicsOverlay
                  landmarks={currentLandmarks}
                  width={videoRef.current?.videoWidth || 1280}
                  height={videoRef.current?.videoHeight || 720}
                  showGrid={showGrid}
                  showAngles={showAngles}
                  showSilhouette={showSilhouette}
                  silhouetteType={viewType}
                  showPlumbLine={showGrid}
                />

                {/* HUD Overlay */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Badge
                    className={cn(
                      "backdrop-blur-md text-white border-none px-3 py-1 gap-2",
                      isReady ? "bg-green-500/80" : "bg-primary/80",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full bg-white",
                        isReady ? "animate-pulse" : "opacity-50",
                      )}
                    />
                    {isReady ? "AI Ativo: Biomechanics Lab" : "AI Carregando..."}
                  </Badge>
                  {patientName && (
                    <Badge
                      variant="outline"
                      className="bg-black/40 backdrop-blur-md text-white border-white/20 font-medium"
                    >
                      Paciente: {patientName}
                    </Badge>
                  )}
                </div>

                {/* Floating Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant={showGrid ? "default" : "ghost"}
                        onClick={() => setShowGrid(!showGrid)}
                        className="rounded-xl h-12 w-12 text-white"
                      >
                        <Grid className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Grade Clínica</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant={showSilhouette ? "default" : "ghost"}
                        onClick={() => setShowSilhouette(!showSilhouette)}
                        className="rounded-xl h-12 w-12 text-white"
                      >
                        <User className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Guia de Silhueta</TooltipContent>
                  </Tooltip>

                  <div className="h-8 w-px bg-white/10 mx-1" />

                  <Button
                    onClick={() => captureSnapshot(viewType.toUpperCase())}
                    disabled={!isReady || !videoSrc}
                    className="h-14 px-8 rounded-xl bg-white text-black hover:bg-white/90 font-bold gap-2"
                  >
                    <Camera className="h-5 w-5" /> Capturar{" "}
                    {viewType === "front"
                      ? "Anterior"
                      : viewType === "side"
                        ? "Lateral"
                        : "Posterior"}
                  </Button>

                  <div className="h-8 w-px bg-white/10 mx-1" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => init()}
                        className="rounded-xl h-12 w-12 text-white"
                      >
                        <RefreshCcw className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Recalibrar AI</TooltipContent>
                  </Tooltip>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl h-12 w-12 text-white"
                  >
                    <Upload className="h-5 w-5" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </>
            )}
          </Card>

          {/* Sidebar Tools */}
          <div className="flex flex-col gap-6">
            <Card className="border-none shadow-sm bg-card/50">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Modo de Avaliação
                  </h4>

                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant={viewType === "front" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewType("front")}
                      className="justify-start gap-2"
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          viewType === "front" ? "bg-white" : "bg-primary",
                        )}
                      />
                      Vista Anterior (Frente)
                    </Button>
                    <Button
                      variant={viewType === "side" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewType("side")}
                      className="justify-start gap-2"
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          viewType === "side" ? "bg-white" : "bg-primary",
                        )}
                      />
                      Vista Lateral (Perfil)
                    </Button>
                    <Button
                      variant={viewType === "back" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewType("back")}
                      className="justify-start gap-2"
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          viewType === "back" ? "bg-white" : "bg-primary",
                        )}
                      />
                      Vista Posterior (Costas)
                    </Button>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Visualização
                  </h4>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Exibir Ângulos</Label>
                    <Switch checked={showAngles} onCheckedChange={setShowAngles} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Esqueleto 3D</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gallery */}
            <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex justify-between">
                Capturas Lab <span>{capturedImages.length}</span>
              </h4>
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-1 gap-3 pr-4">
                  {capturedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border bg-background shadow-sm animate-in zoom-in-95"
                    >
                      <img src={img.url} alt={img.type} className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() =>
                            setCapturedImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-1 left-1">
                        <Badge className="bg-primary text-[10px] px-1.5 py-0 h-4 uppercase">
                          {img.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {capturedImages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl text-muted-foreground/40">
                      <Camera className="h-8 w-8 mb-2" />
                      <p className="text-[10px] uppercase font-bold text-center px-4">
                        Aguardando capturas biomecânicas
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
