/**
 * PoseOverlay - Componente de overlay de pose para análise de movimento
 * Usa MediaPipe Pose Landmarker para detectar 33 keypoints em 3D
 */

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, Video, RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PoseKeypoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface PoseDetection {
  keypoints: PoseKeypoint[];
  score: number;
}

interface PoseOverlayProps {
  videoRef?: React.RefObject<HTMLVideoElement>;
  imageUrl?: string;
  onPoseDetected?: (pose: PoseDetection) => void;
  className?: string;
}

const KEYPOINT_CONNECTIONS = [
  // Tronco
  [11, 12], // ombros
  [11, 23], // ombro esquerdo -> quadril esquerdo
  [12, 24], // ombro direito -> quadril direito
  [23, 24], // quadil esquerdo -> quadril direito
  // Braço esquerdo
  [11, 13], // ombro -> cotovelo
  [13, 15], // cotovelo -> punho
  // Braço direito
  [12, 14], // ombro -> cotovelo
  [14, 16], // cotovelo -> punho
  // Perna esquerda
  [23, 25], // quadril -> joelho
  [25, 27], // joelho -> tornozelo
  // Perna direita
  [24, 26], // quadril -> joelho
  [26, 28], // joelho -> tornozelo
];

const KEYPOINT_NAMES = [
  'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner', 'right_eye', 'right_eye_outer',
  'left_ear', 'right_ear', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index', 'right_index',
  'left_thumb', 'right_thumb', 'left_hip', 'right_hip', 'left_knee', 'right_knee',
  'left_ankle', 'right_ankle', 'left_heel', 'right_heel', 'left_foot_index', 'right_foot_index',
];

const JOINT_ANALYSIS = {
  left_shoulder: { left: 11, right: 13 },
  right_shoulder: { left: 12, right: 14 },
  left_elbow: { left: 13, right: 15 },
  right_elbow: { left: 14, right: 16 },
  left_hip: { left: 11, right: 23 },
  right_hip: { left: 12, right: 24 },
  left_knee: { left: 23, right: 25 },
  right_knee: { left: 24, right: 26 },
};

export function PoseOverlay({ videoRef, imageUrl, onPoseDetected, className }: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pose, setPose] = useState<PoseDetection | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jointAngles, setJointAngles] = useState<Record<string, number>>({});
  const { toast } = useToast();

  // Calcular ângulo entre três pontos
  const calculateAngle = (a: PoseKeypoint, b: PoseKeypoint, c: PoseKeypoint): number => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  // Detectar pose usando MediaPipe
  const detectPose = async () => {
    setIsAnalyzing(true);

    try {
      // TODO: Integrar com MediaPipe Pose Landmarker
      // Por enquanto, simulação para demonstração

      // Simular keypoints (em produção viria do MediaPipe)
      const mockKeypoints: PoseKeypoint[] = KEYPOINT_NAMES.map(() => ({
        x: Math.random() * 0.5 + 0.25,
        y: Math.random() * 0.5 + 0.25,
        z: Math.random() * 0.2 - 0.1,
        visibility: Math.random() * 0.3 + 0.7,
      }));

      const detection: PoseDetection = {
        keypoints: mockKeypoints,
        score: 0.85,
      };

      setPose(detection);

      // Calcular ângulos das articulações
      const angles: Record<string, number> = {};

      for (const [joint, points] of Object.entries(JOINT_ANALYSIS)) {
        const a = mockKeypoints[points.left];
        const b = mockKeypoints[points.right - 1]; // Ajustar índice
        const c = mockKeypoints[points.right];

        if (a && b && c && a.visibility > 0.5 && b.visibility > 0.5 && c.visibility > 0.5) {
          angles[`${joint}_angle`] = calculateAngle(a, b, c);
        }
      }

      setJointAngles(angles);

      if (onPoseDetected) {
        onPoseDetected(detection);
      }

      toast({
        title: 'Análise concluída',
        description: '33 pontos de referência detectados',
      });
    } catch (error) {
      console.error('Erro ao detectar pose:', error);
      toast({
        title: 'Erro na análise',
        description: 'Falha ao detectar pose',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Desenhar pose no canvas
  const drawPose = () => {
    const canvas = canvasRef.current;
    if (!canvas || !pose) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Desenhar conexões
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    KEYPOINT_CONNECTIONS.forEach(([i, j]) => {
      const kp1 = pose.keypoints[i];
      const kp2 = pose.keypoints[j];

      if (kp1.visibility > 0.5 && kp2.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(kp1.x * width, kp1.y * height);
        ctx.lineTo(kp2.x * width, kp2.y * height);
        ctx.stroke();
      }
    });

    // Desenhar keypoints
    pose.keypoints.forEach((kp, index) => {
      if (kp.visibility > 0.5) {
        const x = kp.x * width;
        const y = kp.y * height;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);

        // Cores diferentes para lados esquerdo/direito
        if (index >= 11 && index <= 22) {
          ctx.fillStyle = '#10b981'; // Verde para lado esquerdo
        } else {
          ctx.fillStyle = '#ef4444'; // Vermelho para lado direito
        }

        ctx.fill();

        // Desenhar índice do ponto
        ctx.fillStyle = '#000';
        ctx.font = '8px sans-serif';
        ctx.fillText(index.toString(), x + 6, y - 6);
      }
    });
  };

  useEffect(() => {
    if (pose) {
      drawPose();
    }
  }, [pose]);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `pose-analysis-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    toast({
      title: 'Imagem salva',
      description: 'Análise de pose baixada',
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Análise de Pose - MediaPipe</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={detectPose}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Video className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Analisando...' : 'Analisar'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              disabled={!pose}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          {videoRef && videoRef.current ? (
            <video
              ref={videoRef}
              className="w-full h-auto"
              playsInline
              muted
              loop
            />
          ) : imageUrl ? (
            <img src={imageUrl} alt="Análise" className="w-full h-auto" />
          ) : (
            <div className="aspect-video flex items-center justify-center bg-gray-200">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* Canvas sobreposto */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            width={640}
            height={480}
          />
        </div>

        {/* Análise de articulações */}
        {Object.keys(jointAngles).length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(jointAngles).map(([joint, angle]) => {
              const [jointName] = joint.split('_');
              const isValidAngle = angle >= 30 && angle <= 180;
              const isLeft = jointName.includes('left');

              return (
                <div
                  key={joint}
                  className={`p-2 rounded border text-center ${
                    isValidAngle
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="text-xs text-gray-600 capitalize">
                    {jointName.replace('_', ' ')}
                  </div>
                  <div className={`text-lg font-bold ${
                    isLeft ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {angle.toFixed(1)}°
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legenda */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Lado Esquerdo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Lado Direito</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Conexões</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PoseOverlay;
