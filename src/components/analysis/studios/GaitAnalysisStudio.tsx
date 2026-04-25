import React, { useRef, useState, useMemo } from "react";
import { Stage, Layer } from "react-konva";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, ChevronLeft, ChevronRight, Upload, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useMoveNet, useTrajectory } from "@/hooks/biomechanics";
import { calcGaitMetrics } from "@/utils/biomechanics-formulas";
import { GaitEvent } from "@/types/biomechanics";

import { MoveNetSkeleton } from "../canvas/MoveNetSkeleton";
import { GaitEventMarkers } from "../canvas/GaitEventMarkers";
import { TrajectoryLines } from "../canvas/TrajectoryLines";

import { PatientSetupPanel } from "../panels/PatientSetupPanel";
import { GaitMetricsPanel } from "../panels/GaitMetricsPanel";
import { TrajectoryPanel } from "../panels/TrajectoryPanel";

interface GaitAnalysisStudioProps {
  onDataUpdate?: (data: any) => void;
}

export const GaitAnalysisStudio: React.FC<GaitAnalysisStudioProps> = ({ onDataUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [fps] = useState(30);
  const [patientMass, setPatientMass] = useState<number | null>(null);
  const [legLength, setLegLength] = useState<number | null>(null);
  const [runSpeed, setRunSpeed] = useState<number>(3.0);

  const [gaitEvents, setGaitEvents] = useState<GaitEvent[]>([]);

  const { aiEnabled, aiLoading, poseKeypoints, startMoveNet, stopMoveNet } = useMoveNet(
    videoRef as any,
  );

  const {
    trackedTrajs,
    addTrajectory,
    handleCanvasClick,
    removeTrajectory,
    removeTrajectoryByKeypoint,
    clearTrajectories,
  } = useTrajectory(poseKeypoints, aiEnabled, currentFrame, { width: 800, height: 600 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
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
    if (videoRef.current && videoSrc) {
      const v = videoRef.current;
      const update = () => setCurrentFrame(Math.floor(v.currentTime * fps));
      v.addEventListener("timeupdate", update);
      return () => v.removeEventListener("timeupdate", update);
    }
  }, [videoSrc, fps]);

  const gaitMetrics = useMemo(
    () => calcGaitMetrics(gaitEvents, fps, patientMass, legLength, runSpeed),
    [gaitEvents, fps, patientMass, legLength, runSpeed],
  );

  React.useEffect(() => {
    if (gaitMetrics) {
      onDataUpdate?.({ metrics: gaitMetrics, events: gaitEvents });
    }
  }, [gaitMetrics, gaitEvents, onDataUpdate]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Video Canvas ─────────────────────────────────────── */}
        <Card className="lg:col-span-3 relative overflow-hidden bg-slate-950 border-none rounded-[2.5rem] shadow-2xl h-[600px] group/canvas">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              src={videoSrc || ""}
              className="absolute inset-0 h-full w-full object-contain opacity-80"
              playsInline
              muted
            />
            {!videoSrc && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/90 px-6 text-center">
                <Upload className="h-10 w-10 text-blue-400" />
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-white">
                    Envie um vídeo de marcha ou corrida
                  </p>
                  <p className="mt-2 max-w-md text-sm text-white/70">
                    Prefira gravação lateral e frontal feita no celular. A análise web é focada em
                    upload e revisão quadro a quadro.
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
                if (pos) handleCanvasClick(pos.x, pos.y);
              }}
            >
              <Layer>
                {aiEnabled && <MoveNetSkeleton poseKeypoints={poseKeypoints} />}
                <GaitEventMarkers events={gaitEvents} />
                <TrajectoryLines trajectories={trackedTrajs} />
              </Layer>
            </Stage>
          </div>

          {/* Control HUD */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/60 backdrop-blur-3xl p-3 rounded-[2rem] border border-white/10 z-30 shadow-2xl">
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              accept="video/*"
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

            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayback}
              disabled={!videoSrc}
              className="rounded-full h-10 w-10 hover:bg-white/10"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </Button>

            <div className="h-8 w-px bg-white/10 mx-1" />

            <Button
              variant={aiEnabled ? "default" : "ghost"}
              size="sm"
              disabled={aiLoading || !videoSrc}
              onClick={() => (aiEnabled ? stopMoveNet() : startMoveNet())}
              className={`rounded-2xl gap-2 text-[10px] font-black tracking-widest uppercase px-4 h-10 transition-all ${aiEnabled ? "bg-green-600 hover:bg-green-700 shadow-[0_0_20px_rgba(34,197,94,0.4)] border-none" : "hover:bg-white/5"}`}
            >
              <Cpu className={`h-4 w-4 ${aiLoading ? "animate-spin" : ""}`} />
              {aiLoading ? "Loading..." : aiEnabled ? "AI Active" : "Pose Detection"}
            </Button>
            <div className="h-8 w-px bg-white/10 mx-1" />
            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white/60 hover:text-white rounded-xl"
                disabled={!videoSrc}
                onClick={() => seekToFrame(Math.max(0, currentFrame - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col items-center justify-center px-3 min-w-[60px]">
                <span className="text-white text-[10px] font-black tracking-tighter tabular-nums">
                  {currentFrame}
                </span>
                <span className="text-[6px] text-white/40 font-black uppercase">Frame</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white/60 hover:text-white rounded-xl"
                disabled={!videoSrc}
                onClick={() => seekToFrame(currentFrame + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Badge
              variant="outline"
              className="text-[9px] font-black border-white/10 text-white/60 px-3 py-1 rounded-full"
            >
              {fps} FPS
            </Badge>
          </div>
        </Card>

        {/* ── Metrics Sidebar ──────────────────────────────────── */}
        <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
          <PatientSetupPanel
            patientMass={patientMass}
            setPatientMass={setPatientMass}
            legLength={legLength}
            setLegLength={setLegLength}
            runSpeed={runSpeed}
            setRunSpeed={setRunSpeed}
          />
          <GaitMetricsPanel
            gaitEvents={gaitEvents}
            setGaitEvents={setGaitEvents}
            currentFrame={currentFrame}
            gaitMetrics={gaitMetrics}
          />
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
