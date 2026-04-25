import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Camera, CameraOff, Activity, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fisioLogger as logger } from "@/lib/errors/logger";

interface MovementMetrics {
  angleAccuracy: number;
  rangeOfMotion: number;
  speed: number;
  stability: number;
  posture: "excelente" | "boa" | "atenção" | "ruim";
}

// Rolling window for stability calculation
const STABILITY_WINDOW = 10;

/** Angle between three 2D landmarks using law of cosines */
function angleDeg(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const ab = Math.hypot(a.x - b.x, a.y - b.y);
  const bc = Math.hypot(b.x - c.x, b.y - c.y);
  const ac = Math.hypot(a.x - c.x, a.y - c.y);
  if (ab === 0 || bc === 0) return 0;
  const cos = (ab * ab + bc * bc - ac * ac) / (2 * ab * bc);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/** Standard deviation of a number array */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export const MovementAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [metrics, setMetrics] = useState<MovementMetrics>({
    angleAccuracy: 0,
    rangeOfMotion: 0,
    speed: 0,
    stability: 0,
    posture: "boa",
  });
  const [feedback, setFeedback] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  // Rolling buffers
  const centerXHistory = useRef<number[]>([]);
  const centerYHistory = useRef<number[]>([]);
  const prevLandmarks = useRef<any>(null);
  const frameTimestamps = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      poseLandmarkerRef.current = null;
    };
  }, [stream]);

  const loadModel = async () => {
    setIsLoadingModel(true);
    try {
      // Dynamic import from MediaPipe Tasks Vision CDN
      const vision = await import(
        /* @vite-ignore */
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs"
      );
      const { PoseLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );

      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    } finally {
      setIsLoadingModel(false);
    }
  };

  const processFrame = useCallback((nowMs: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Detect pose
    let result: any;
    try {
      result = poseLandmarker.detectForVideo(video, nowMs);
    } catch {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (!result?.landmarks?.[0]) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const lm = result.landmarks[0]; // Array of {x, y, z, visibility}

    // Draw skeleton on canvas
    if (ctx) drawSkeleton(ctx, lm, canvas.width, canvas.height);

    // ── Symmetry: shoulder width vs hip width ──────────────────────────────
    // Landmarks: 11=left_shoulder, 12=right_shoulder, 23=left_hip, 24=right_hip
    const shoulderWidth = Math.hypot(lm[11].x - lm[12].x, lm[11].y - lm[12].y);
    const hipWidth = Math.hypot(lm[23].x - lm[24].x, lm[23].y - lm[24].y);
    const symmetryRatio =
      hipWidth > 0 ? Math.min(shoulderWidth, hipWidth) / Math.max(shoulderWidth, hipWidth) : 1;
    const symmetryScore = Math.round(symmetryRatio * 100);

    // ── Range of Motion: average of knee + elbow angles ───────────────────
    // Landmarks: 23=left_hip, 25=left_knee, 27=left_ankle, 11=left_shoulder, 13=left_elbow, 15=left_wrist
    const leftKneeAngle = angleDeg(
      { x: lm[23].x, y: lm[23].y },
      { x: lm[25].x, y: lm[25].y },
      { x: lm[27].x, y: lm[27].y },
    );
    const leftElbowAngle = angleDeg(
      { x: lm[11].x, y: lm[11].y },
      { x: lm[13].x, y: lm[13].y },
      { x: lm[15].x, y: lm[15].y },
    );
    // Normalize: straight limb = 180°. Lower angle → more flexion → higher ROM score
    const romScore = Math.round(100 - Math.min(leftKneeAngle, leftElbowAngle) / 1.8);

    // ── Stability: std dev of center-of-mass x/y ──────────────────────────
    // Center of mass ≈ midpoint of hips
    const cx = (lm[23].x + lm[24].x) / 2;
    const cy = (lm[23].y + lm[24].y) / 2;
    centerXHistory.current.push(cx);
    centerYHistory.current.push(cy);
    if (centerXHistory.current.length > STABILITY_WINDOW) {
      centerXHistory.current.shift();
      centerYHistory.current.shift();
    }
    const devX = stdDev(centerXHistory.current);
    const devY = stdDev(centerYHistory.current);
    const totalDev = devX + devY;
    // Map deviation: 0 → 100 (stable), >0.05 → 0 (unstable)
    const stabilityScore = Math.round(Math.max(0, 100 - totalDev * 2000));

    // ── Speed: movement between frames ────────────────────────────────────
    let speedScore = 0;
    frameTimestamps.current.push(nowMs);
    if (frameTimestamps.current.length > 10) frameTimestamps.current.shift();

    if (prevLandmarks.current) {
      const prevLm = prevLandmarks.current;
      let totalMovement = 0;
      for (let i = 0; i < Math.min(lm.length, 33); i++) {
        totalMovement += Math.hypot(lm[i].x - prevLm[i].x, lm[i].y - prevLm[i].y);
      }
      const avgMovement = totalMovement / 33;
      // Map: 0.005 → 50%, 0.01 → 100% (capped)
      speedScore = Math.min(100, Math.round(avgMovement * 10000));
    }
    prevLandmarks.current = lm;

    // ── Posture: based on symmetry + spine alignment ───────────────────────
    // Spine: shoulder midpoint vs hip midpoint should be roughly vertical
    const shoulderMidX = (lm[11].x + lm[12].x) / 2;
    const hipMidX = (lm[23].x + lm[24].x) / 2;
    const lateralLean = Math.abs(shoulderMidX - hipMidX);
    let posture: MovementMetrics["posture"] = "excelente";
    if (lateralLean > 0.08) posture = "ruim";
    else if (lateralLean > 0.05) posture = "atenção";
    else if (lateralLean > 0.02) posture = "boa";

    // ── Update state ───────────────────────────────────────────────────────
    const newMetrics: MovementMetrics = {
      angleAccuracy: symmetryScore,
      rangeOfMotion: romScore,
      speed: speedScore,
      stability: stabilityScore,
      posture,
    };
    setMetrics(newMetrics);

    const newFeedback: string[] = [];
    if (symmetryScore < 70) newFeedback.push("⚠️ Assimetria detectada — verifique alinhamento");
    if (stabilityScore < 60) newFeedback.push("⚠️ Mantenha mais estabilidade no centro de massa");
    if (posture === "ruim") newFeedback.push("⚠️ Inclinação lateral excessiva detectada");
    if (posture === "atenção") newFeedback.push("ℹ️ Leve desvio lateral — corrija a postura");
    if (symmetryScore >= 85 && stabilityScore >= 80 && posture === "excelente") {
      newFeedback.push("✅ Excelente postura e estabilidade!");
    }
    setFeedback(newFeedback);

    rafRef.current = requestAnimationFrame(processFrame);
  }, []);

  const startAnalysis = async () => {
    try {
      if (!poseLandmarkerRef.current) {
        await loadModel();
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) videoRef.current.onloadeddata = () => resolve();
        });
      }

      setIsAnalyzing(true);
      centerXHistory.current = [];
      centerYHistory.current = [];
      prevLandmarks.current = null;
      frameTimestamps.current = [];
      rafRef.current = requestAnimationFrame(processFrame);

      toast({
        title: "Análise iniciada",
        description: "Posicione-se na frente da câmera",
      });
    } catch (error) {
      logger.error("Erro ao iniciar análise", error, "MovementAnalysis");
      toast({
        title: "Erro",
        description: "Não foi possível acessar a câmera ou carregar o modelo",
        variant: "destructive",
      });
    }
  };

  const stopAnalysis = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsAnalyzing(false);
    toast({
      title: "Análise finalizada",
      description: "Relatório salvo com sucesso",
    });
  };

  const getPostureColor = (posture: string) => {
    const colors = {
      excelente: "bg-green-100 text-green-800",
      boa: "bg-blue-100 text-blue-800",
      atenção: "bg-yellow-100 text-yellow-800",
      ruim: "bg-red-100 text-red-800",
    };
    return colors[posture as keyof typeof colors];
  };

  const getProgressColor = (value: number) => {
    if (value >= 85) return "bg-green-500";
    if (value >= 70) return "bg-blue-500";
    if (value >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Análise de Movimento em Tempo Real
          <Badge variant="outline" className="ml-auto text-xs font-normal">
            MediaPipe PoseLandmarker
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Video with overlay canvas */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {!isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {isAnalyzing && (
              <div className="absolute top-4 right-4">
                <Badge className={getPostureColor(metrics.posture)}>
                  Postura: {metrics.posture}
                </Badge>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="space-y-4">
            <h4 className="font-semibold">Métricas em Tempo Real</h4>
            <div className="space-y-3">
              {[
                { label: "Simetria Corporal", value: metrics.angleAccuracy },
                {
                  label: "Amplitude de Movimento",
                  value: metrics.rangeOfMotion,
                },
                { label: "Velocidade de Movimento", value: metrics.speed },
                {
                  label: "Estabilidade do Centro de Massa",
                  value: metrics.stability,
                },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-semibold">{value}%</span>
                  </div>
                  <Progress value={value} className={getProgressColor(value)} />
                </div>
              ))}
            </div>

            {isAnalyzing && feedback.length > 0 && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <h5 className="font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Feedback
                </h5>
                {feedback.map((item, index) => (
                  <p key={index} className="text-sm">
                    {item}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isAnalyzing ? (
            <Button onClick={startAnalysis} className="bg-primary" disabled={isLoadingModel}>
              {isLoadingModel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando Modelo…
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Iniciar Análise
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="destructive" onClick={stopAnalysis}>
                <CameraOff className="w-4 h-4 mr-2" />
                Finalizar Análise
              </Button>
              <Button variant="outline">
                <CheckCircle className="w-4 h-4 mr-2" />
                Salvar Relatório
              </Button>
            </>
          )}
        </div>

        {isAnalyzing && (
          <p className="text-center text-xs text-muted-foreground">
            Análise em andamento via MediaPipe PoseLandmarker (lite) — GPU delegate
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ── Skeleton drawing helper ────────────────────────────────────────────────

const POSE_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
];

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  width: number,
  height: number,
) {
  ctx.strokeStyle = "rgba(34, 197, 94, 0.8)";
  ctx.lineWidth = 2;

  for (const [a, b] of POSE_CONNECTIONS) {
    const lmA = landmarks[a];
    const lmB = landmarks[b];
    if (!lmA || !lmB) continue;
    if ((lmA.visibility ?? 1) < 0.3 || (lmB.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(lmA.x * width, lmA.y * height);
    ctx.lineTo(lmB.x * width, lmB.y * height);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}
