import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pose, Results, POSE_CONNECTIONS } from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { calculateAngle, JOINT_INDICES } from '@/utils/goniometryUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, CameraOff, RotateCcw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const GoniometryAnalyzer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [maxAngle, setMaxAngle] = useState<number>(0);
  const [jointType, setJointType] = useState<'elbow_l' | 'elbow_r' | 'knee_l' | 'knee_r'>('elbow_l');

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.poseLandmarks) {
      // Desenhar esqueleto simplificado
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#ffffff', lineWidth: 2 });
      drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#3b82f6', lineWidth: 1, radius: 4 });

      // Calcular ângulo baseado na articulação selecionada
      let a, b, c;
      if (jointType === 'elbow_l') {
        a = results.poseLandmarks[JOINT_INDICES.shoulder_l];
        b = results.poseLandmarks[JOINT_INDICES.elbow_l];
        c = results.poseLandmarks[JOINT_INDICES.wrist_l];
      } else if (jointType === 'elbow_r') {
        a = results.poseLandmarks[JOINT_INDICES.shoulder_r];
        b = results.poseLandmarks[JOINT_INDICES.elbow_r];
        c = results.poseLandmarks[JOINT_INDICES.wrist_r];
      } else if (jointType === 'knee_l') {
        a = results.poseLandmarks[JOINT_INDICES.hip_l];
        b = results.poseLandmarks[JOINT_INDICES.knee_l];
        c = results.poseLandmarks[JOINT_INDICES.ankle_l];
      } else {
        a = results.poseLandmarks[JOINT_INDICES.hip_r];
        b = results.poseLandmarks[JOINT_INDICES.knee_r];
        c = results.poseLandmarks[JOINT_INDICES.ankle_r];
      }

      if (a.visibility > 0.5 && b.visibility > 0.5 && c.visibility > 0.5) {
        const angle = calculateAngle(a, b, c);
        setCurrentAngle(angle);
        if (angle > maxAngle) setMaxAngle(angle);

        // Desenhar indicador de ângulo no Canvas
        const x = b.x * canvasRef.current.width;
        const y = b.y * canvasRef.current.height;
        
        canvasCtx.fillStyle = '#3b82f6';
        canvasCtx.font = 'bold 24px Arial';
        canvasCtx.fillText(`${angle}°`, x + 10, y - 10);
      } else {
        setCurrentAngle(null);
      }
    }
    canvasCtx.restore();
  }, [jointType, maxAngle]);

  useEffect(() => {
    if (!isActive) return;

    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onResults);

    let camera: cam.Camera | null = null;
    if (videoRef.current) {
      camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) await pose.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    return () => {
      camera?.stop();
      pose.close();
    };
  }, [isActive, onResults]);

  return (
    <Card className="overflow-hidden border-blue-100 shadow-lg">
      <CardHeader className="bg-blue-50/50 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Goniometria Digital IA</CardTitle>
          </div>
          <Badge variant="outline" className="bg-white">Protótipo Beta</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-slate-900 overflow-hidden">
          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
              <Camera className="h-12 w-12 opacity-20" />
              <p className="text-sm opacity-60">Câmera desativada</p>
              <Button onClick={() => setIsActive(true)} className="bg-blue-600">
                Ativar Câmera
              </Button>
            </div>
          )}
          
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="w-full h-full object-contain" width={640} height={480} />

          {isActive && (
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 pointer-events-auto">
                <p className="text-[10px] text-blue-300 uppercase font-bold mb-1">Articulação</p>
                <Select value={jointType} onValueChange={(v: any) => setJointType(v)}>
                  <SelectTrigger className="h-8 w-40 bg-white/10 border-none text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elbow_l">Cotovelo Esquerdo</SelectItem>
                    <SelectItem value="elbow_r">Cotovelo Direito</SelectItem>
                    <SelectItem value="knee_l">Joelho Esquerdo</SelectItem>
                    <SelectItem value="knee_r">Joelho Direito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-center min-w-[80px]">
                  <p className="text-[10px] text-blue-300 uppercase font-bold">Atual</p>
                  <p className="text-2xl font-bold text-white">{currentAngle !== null ? `${currentAngle}°` : '--'}</p>
                </div>
                <div className="bg-blue-600/80 backdrop-blur-md p-3 rounded-lg border border-white/10 text-center min-w-[80px]">
                  <p className="text-[10px] text-blue-100 uppercase font-bold">Máximo</p>
                  <p className="text-2xl font-bold text-white">{maxAngle}°</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex gap-2 justify-between bg-slate-50 dark:bg-slate-900 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMaxAngle(0)} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Resetar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsActive(false)} className="gap-2 text-destructive">
              <CameraOff className="h-4 w-4" /> Desativar
            </Button>
          </div>
          <Button size="sm" className="gap-2 bg-blue-600" onClick={() => alert('Ângulo salvo no prontuário!')}>
            <Save className="h-4 w-4" /> Salvar Medição
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
