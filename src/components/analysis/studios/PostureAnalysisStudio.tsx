import React, { useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, Ruler, Upload, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useMoveNet, useGoniometer, useTrajectory } from "@/hooks/biomechanics";

import { MoveNetSkeleton } from "../canvas/MoveNetSkeleton";
import { GoniometerOverlay } from "../canvas/GoniometerOverlay";
import { TrajectoryLines } from "../canvas/TrajectoryLines";
import { TrajectoryPanel } from "../panels/TrajectoryPanel";
import { InclinometerPanel } from "../panels/InclinometerPanel";

interface PostureAnalysisStudioProps {
  onDataUpdate?: (data: any) => void;
}

export const PostureAnalysisStudio: React.FC<PostureAnalysisStudioProps> = ({ onDataUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"video" | "image">("video");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [fps] = useState(30);

  // Plumb line (linha de prumo)
  const [showPlumbLine, setShowPlumbLine] = useState(true);
  const [plumbX, setPlumbX] = useState(400);

  const { aiEnabled, aiLoading, poseKeypoints, startMoveNet, stopMoveNet } = useMoveNet(
    videoRef as any,
  );
  const { points: goniometerPoints, updatePoint, currentAngle, clearGoniometer } = useGoniometer();
  const {
    trackedTrajs,
    addTrajectory,
    handleCanvasClick,
    removeTrajectory,
    removeTrajectoryByKeypoint,
    clearTrajectories,
  } = useTrajectory(poseKeypoints, aiEnabled, currentFrame, { width: 800, height: 600 });
  const [activeTool, setActiveTool] = useState<"none" | "goniometer" | "trajectory">("goniometer");

  React.useEffect(() => {
    onDataUpdate?.({ currentAngle, points: goniometerPoints });
  }, [currentAngle, goniometerPoints, onDataUpdate]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setMediaKind(file.type.startsWith("image/") ? "image" : "video");
      setCurrentFrame(0);
      setIsPlaying(false);
    }
  };

  const seekToFrame = (frame: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = frame / fps;
      setCurrentFrame(frame);
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  React.useEffect(() => {
    if (videoRef.current && videoSrc && mediaKind === "video") {
      const v = videoRef.current;
      const update = () => setCurrentFrame(Math.floor(v.currentTime * fps));
      v.addEventListener("timeupdate", update);
      return () => v.removeEventListener("timeupdate", update);
    }
  }, [videoSrc, mediaKind, fps]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 relative overflow-hidden bg-slate-950 border-none rounded-[2.5rem] shadow-2xl h-[600px] group/canvas">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {mediaKind === "video" ? (
              <video
                ref={videoRef}
                src={videoSrc || ""}
                className="absolute inset-0 h-full w-full object-contain opacity-80"
                playsInline
                muted
              />
            ) : (
              <img
                ref={imageRef}
                src={videoSrc || ""}
                alt="Upload postural"
                className="absolute inset-0 h-full w-full object-contain opacity-80"
              />
            )}
            {!videoSrc && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/90 px-6 text-center">
                <Upload className="h-10 w-10 text-blue-400" />
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-white">
                    Envie uma imagem ou vídeo postural
                  </p>
                  <p className="mt-2 max-w-md text-sm text-white/70">
                    Para postura, uma foto ou vídeo curto já é suficiente para linhas de referência
                    e comparação.
                  </p>
                </div>
              </div>
            )}
            <Stage
              width={800}
              height={600}
              className="absolute inset-0 z-10"
              ref={stageRef}
              onClick={(e) => {
                const pos = e.target.getStage()?.getPointerPosition();
                if (pos && activeTool === "trajectory") handleCanvasClick(pos.x, pos.y);
              }}
            >
              <Layer>
                {aiEnabled && <MoveNetSkeleton poseKeypoints={poseKeypoints} />}
                {activeTool === "goniometer" && (
                  <GoniometerOverlay points={goniometerPoints} onPointMove={updatePoint} />
                )}
                <TrajectoryLines trajectories={trackedTrajs} />

                {showPlumbLine && (
                  <Line
                    points={[plumbX, 0, plumbX, 600]}
                    stroke="#ffff00"
                    strokeWidth={2}
                    dash={[10, 5]}
                    draggable
                    onDragMove={(e) => setPlumbX(e.target.x())}
                  />
                )}
              </Layer>
            </Stage>
          </div>

          {activeTool === "goniometer" && (
            <div className="absolute top-8 left-8 z-20 bg-slate-900/80 backdrop-blur-xl text-white text-lg font-black px-6 py-2 rounded-2xl border border-white/10 shadow-2xl">
              {currentAngle}°
            </div>
          )}

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/60 backdrop-blur-3xl p-3 rounded-[2rem] border border-white/10 z-30 shadow-2xl">
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              accept="video/*,image/*"
              onChange={handleFileUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full h-10 w-10 hover:bg-white/10 transition-colors"
            >
              <Upload className="h-5 w-5 text-blue-400" />
            </Button>

            <div className="h-8 w-px bg-white/10 mx-1" />

            <Button
              variant={aiEnabled ? "default" : "ghost"}
              size="sm"
              disabled={aiLoading || !videoSrc || mediaKind !== "video"}
              onClick={() => (aiEnabled ? stopMoveNet() : startMoveNet())}
              className={`rounded-2xl gap-2 text-[10px] font-black tracking-widest uppercase px-4 h-10 transition-all ${aiEnabled ? "bg-green-600 hover:bg-green-700 shadow-[0_0_20px_rgba(34,197,94,0.4)] border-none" : "hover:bg-white/5"}`}
            >
              <Cpu className={`h-4 w-4 ${aiLoading ? "animate-spin" : ""}`} />
              {aiLoading ? "Loading..." : aiEnabled ? "AI Active" : "Pose Detection"}
            </Button>

            <div className="h-8 w-px bg-white/10 mx-1" />

            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
              <Button
                variant={activeTool === "goniometer" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTool(activeTool === "goniometer" ? "none" : "goniometer")}
                className={`rounded-xl px-4 h-8 text-[10px] font-black uppercase transition-all ${activeTool === "goniometer" ? "bg-emerald-600 hover:bg-emerald-700" : "text-white/60 hover:text-white"}`}
              >
                <Ruler className="h-3 w-3 mr-1" /> Goniometer
              </Button>
              <Button
                variant={showPlumbLine ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowPlumbLine((p) => !p)}
                className={`rounded-xl px-4 h-8 text-[10px] font-black uppercase transition-all ${showPlumbLine ? "bg-blue-600 hover:bg-blue-700" : "text-white/60 hover:text-white"}`}
              >
                PLUMB LINE
              </Button>
            </div>

            {videoSrc && mediaKind === "video" && (
              <>
                <div className="h-8 w-px bg-white/10 mx-1" />
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/60 hover:text-white rounded-xl"
                    onClick={() => seekToFrame(Math.max(0, currentFrame - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/60 hover:text-white rounded-xl"
                    onClick={togglePlayback}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/60 hover:text-white rounded-xl"
                    onClick={() => seekToFrame(currentFrame + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Badge
                    variant="outline"
                    className="ml-2 text-[9px] font-black border-white/10 text-white/40 tabular-nums"
                  >
                    #{currentFrame}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </Card>

        <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
          <Card className="border-none shadow-sm bg-muted/5">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Medições Posturais
              </h4>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-bold"
                  onClick={clearGoniometer}
                >
                  Resetar Goniômetro
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-bold"
                  onClick={() => setPlumbX(400)}
                >
                  Resetar Linha de Prumo
                </Button>
              </div>
            </CardContent>
          </Card>

          <InclinometerPanel />

          <TrajectoryPanel
            trackedTrajs={trackedTrajs}
            aiEnabled={aiEnabled}
            addTrajectory={addTrajectory}
            removeTrajectory={removeTrajectory}
            removeTrajectoryByKeypoint={removeTrajectoryByKeypoint}
            clearTrajectories={clearTrajectories}
          />
        </div>
      </div>
    </div>
  );
};
