import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  X,
  Zap,
  Activity,
  RefreshCw,
  ChevronLeft,
  Save,
  Maximize2,
  Target,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BioVisionOverlay } from "./BioVisionOverlay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FisioADMProps {
  isOpen: boolean;
  onClose: () => void;
  onResult?: (data: { joint: string; peak: number }) => void;
}

const JOINTS = [
  { id: "knee_l", label: "Joelho Esquerdo" },
  { id: "knee_r", label: "Joelho Direito" },
  { id: "elbow_l", label: "Cotovelo Esquerdo" },
  { id: "elbow_r", label: "Cotovelo Direito" },
  { id: "shoulder_l", label: "Ombro Esquerdo" },
  { id: "shoulder_r", label: "Ombro Direito" },
];

export const FisioADM: React.FC<FisioADMProps> = ({ isOpen, onClose, onResult }) => {
  const [activeJoint, setActiveJoint] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [peakAngle, setPeakAngle] = useState(0);
  const [isAnalyzing, setIsProcessing] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const poseRef = useRef<any>(null);
  const requestRef = useRef<number>(0);

  const initPose = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Injetar scripts se não existirem
    if (!window.Pose) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
      script.async = true;
      document.head.appendChild(script);

      const canvasUtils = document.createElement("script");
      canvasUtils.src = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";
      canvasUtils.async = true;
      document.head.appendChild(canvasUtils);

      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

    if (!window.Pose) return;

    const pose = new window.Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results: any) => {
      if (results.poseLandmarks) {
        setLandmarks(results.poseLandmarks);
      }
    });

    poseRef.current = pose;
  }, []);

  useEffect(() => {
    if (isOpen) {
      initPose();
    } else {
      if (poseRef.current) poseRef.current.close();
      cancelAnimationFrame(requestRef.current);
    }
  }, [isOpen, initPose]);

  const processFrame = useCallback(async () => {
    if (webcamRef.current && poseRef.current && isAnalyzing) {
      const video = webcamRef.current.video;
      if (video && video.readyState === 4) {
        await poseRef.current.send({ image: video });
      }
      requestRef.current = requestAnimationFrame(processFrame);
    }
  }, [isAnalyzing]);

  useEffect(() => {
    if (isAnalyzing) {
      requestRef.current = requestAnimationFrame(processFrame);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
  }, [isAnalyzing, processFrame]);

  const handleStart = (jointId: string) => {
    setActiveJoint(jointId);
    setPeakAngle(0);
    setIsProcessing(true);
    toast.info(`Iniciando análise de ${JOINTS.find((j) => j.id === jointId)?.label}`);
  };

  const handleReset = () => {
    setPeakAngle(0);
    toast.success("Medição reiniciada.");
  };

  const handleSave = () => {
    if (activeJoint && peakAngle > 0) {
      onResult?.({ joint: activeJoint, peak: peakAngle });
      toast.success("Medição salva com sucesso!");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8"
        >
          {/* Header UI */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="text-white w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight italic">
                  FISIO<span className="text-blue-500">ADM</span>
                </h2>
                <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">
                  Bio-Vision Engine v2.0
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/50 hover:text-white hover:bg-white/10 rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          <div className="w-full h-full max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-8 mt-16">
            {/* Sidebar Controls */}
            <Card className="lg:col-span-1 bg-slate-900/50 border-white/5 backdrop-blur-xl rounded-[40px] overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Selecione a Articulação
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {JOINTS.map((joint) => (
                      <Button
                        key={joint.id}
                        variant={activeJoint === joint.id ? "default" : "ghost"}
                        onClick={() => handleStart(joint.id)}
                        className={cn(
                          "justify-between h-14 rounded-2xl font-bold transition-all px-4",
                          activeJoint === joint.id
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                            : "text-slate-400 hover:bg-white/5",
                        )}
                      >
                        {joint.label}
                        {activeJoint === joint.id ? (
                          <Zap className="w-4 h-4 fill-white" />
                        ) : (
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {activeJoint && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-8 border-t border-white/5 space-y-6"
                  >
                    <div className="text-center space-y-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">
                        Ângulo de Pico
                      </span>
                      <div className="text-6xl font-black text-white tabular-nums tracking-tighter">
                        {peakAngle.toFixed(1)}°
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-white/10 hover:bg-white/5 text-white"
                        onClick={handleReset}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Reset
                      </Button>
                      <Button
                        className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                        onClick={handleSave}
                      >
                        <Save className="w-4 h-4 mr-2" /> Salvar
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Main Camera Area */}
            <div className="lg:col-span-3 relative rounded-[40px] overflow-hidden bg-slate-950 border border-white/5 shadow-2xl">
              {!activeJoint ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-6 z-10">
                  <div className="w-24 h-24 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                    <Camera className="w-10 h-10 text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Pronto para a Captura?</h2>
                    <p className="text-slate-500 max-w-md">
                      Posicione o paciente de forma que a articulação selecionada esteja visível no
                      enquadramento.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Webcam
                    ref={webcamRef}
                    className="w-full h-full object-cover grayscale opacity-50 contrast-125"
                    videoConstraints={{
                      width: 1280,
                      height: 720,
                      facingMode: "environment",
                    }}
                  />
                  <BioVisionOverlay
                    landmarks={landmarks}
                    width={webcamRef.current?.video?.videoWidth || 1280}
                    height={webcamRef.current?.video?.videoHeight || 720}
                    activeJoint={activeJoint}
                    onPeakAngle={setPeakAngle}
                  />

                  {/* Scanning Effect Overlay */}
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-40" />
                  <div className="absolute inset-x-0 top-0 h-1 bg-blue-500/30 animate-[scan_3s_ease-in-out_infinite]" />
                </>
              )}

              {/* HUD Overlay */}
              <div className="absolute bottom-8 left-8 flex items-center gap-4 z-40">
                <Badge
                  variant="outline"
                  className="bg-black/50 backdrop-blur-md border-white/10 text-white/70 py-2 px-4 rounded-full font-bold"
                >
                  <Maximize2 className="w-3 h-3 mr-2" /> 1080P @ 30FPS
                </Badge>
                {isAnalyzing && (
                  <Badge className="bg-blue-600 text-white py-2 px-4 rounded-full font-bold animate-pulse">
                    <Zap className="w-3 h-3 mr-2 fill-white" /> ANALYSIS ACTIVE
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <style>{`
				@keyframes scan {
					0%, 100% { top: 0; opacity: 0; }
					50% { top: 100%; opacity: 1; }
				}
			`}</style>
    </AnimatePresence>
  );
};

export default FisioADM;
