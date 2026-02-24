/**
 * ExerciseExecutionScreen - Tela de Execução de Exercício com IA
 *
 * Esta tela combina o vídeo do exercício, a câmera do usuário,
 * o overlay de pose e o painel de métricas em tempo real.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Play,
  Pause,
  Square,
  Camera,
  CameraOff,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import { useExerciseExecution } from '@/hooks/useExerciseExecution';
import { PoseFeedbackOverlay } from './PoseFeedbackOverlay';
import { RealTimeMetricsPanel } from './RealTimeMetricsPanel';
import { CalibrationOverlay } from './CalibrationOverlay';
import {
  ExerciseType,
  SessionState,
  ExerciseSession,
  PoseDetection,
  AnalysisType,
} from '@/types/pose';
import { useMediaPipeVision } from '@/hooks/performance';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface ExerciseExecutionScreenProps {
  exerciseId: string;
  patientId: string;
  exerciseType: ExerciseType;
  exerciseName: string;
  onBack?: () => void;
  onComplete?: (session: ExerciseSession) => void;
}

export const ExerciseExecutionScreen: React.FC<ExerciseExecutionScreenProps> = ({
  exerciseId,
  patientId,
  exerciseType,
  exerciseName,
  onBack,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const requestRef = useRef<number>();

  // MediaPipe modules (lazy loading)
  const [landmarker, setLandmarker] = useState<any>(null);
  const { load: loadMediaPipe, isLoaded: mediaPipeLoaded } = useMediaPipeVision();
  const { playSuccess, playWarning, announceRepetition } = useAudioFeedback();

  // Hook de execução
  const {
    state,
    session,
    analysisResult,
    repCount,
    fps,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    onPoseFrame,
    finishCalibration,
  } = useExerciseExecution({
    exerciseId,
    patientId,
    exerciseType,
    onSessionComplete: onComplete,
  });

  /**
   * Efeitos de Audio
   */
  useEffect(() => {
    if (repCount > 0) {
      announceRepetition(repCount);
      if (repCount % 5 === 0) playSuccess();
    }
  }, [repCount, announceRepetition, playSuccess]);

  useEffect(() => {
    if (state === SessionState.EXERCISING && analysisResult.postureIssues.length > 0) {
      playWarning();
    }
  }, [analysisResult.postureIssues, state, playWarning]);

  /**
   * Inicializar MediaPipe Landmarker
   */
  useEffect(() => {
    const initLandmarker = async () => {
      if (mediaPipeLoaded && !landmarker) {
        try {
          const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
          );
          const instance = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numPoses: 1,
          });
          setLandmarker(instance);
        } catch (err) {
          logger.error('Failed to init landmarker', err, 'ExerciseExecutionScreen');
          setCameraError("Falha ao carregar motor de IA.");
        }
      }
    };

    if (mediaPipeLoaded) {
      initLandmarker();
    }
  }, [mediaPipeLoaded, landmarker]);

  /**
   * Ciclo de detecção de pose
   */
  const detectPose = useCallback(() => {
    if (!landmarker || !videoRef.current || videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(detectPose);
      return;
    }

    const video = videoRef.current;
    const startTimeMs = performance.now();

    try {
      const results = landmarker.detectForVideo(video, startTimeMs);

      if (results.landmarks && results.landmarks.length > 0) {
        const pose: PoseDetection = {
          landmarks: results.landmarks[0],
          confidence: results.landmarks[0][0]?.visibility || 0,
          timestamp: startTimeMs,
          analysisType: AnalysisType.FORM,
        };

        // Enviar para o hook de execução
        onPoseFrame(pose);
      }
    } catch (err) {
      // Ignorar erros ocasionais de frame
    }

    requestRef.current = requestAnimationFrame(detectPose);
  }, [landmarker, onPoseFrame]);

  /**
   * Iniciar/Parar Câmera
   */
  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!mediaPipeLoaded) {
      await loadMediaPipe();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setIsCameraActive(true);
          requestRef.current = requestAnimationFrame(detectPose);
        };
      }
    } catch (err) {
      logger.error('Camera access denied', err, 'ExerciseExecutionScreen');
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      if (landmarker) landmarker.close();
    };
  }, [landmarker]);

  return (
    <div className="flex flex-col h-full bg-background space-y-4 p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <h1 className="text-2xl font-bold">{exerciseName}</h1>
        </div>
        <div className="flex items-center space-x-2">
          {state === SessionState.EXERCISING && (
            <Badge variant="destructive" className="animate-pulse">
              EM EXECUÇÃO
            </Badge>
          )}
          <Badge variant="outline">
            FPS: {fps}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Lado Esquerdo: Câmera e Overlay */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <Card className="relative overflow-hidden aspect-video bg-black flex items-center justify-center">
            {/* Elemento de Vídeo (Oculto ou Background) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />

            {/* Overlay de Pose */}
            {isCameraActive && (
              <div className="absolute inset-0 z-10">
                <PoseFeedbackOverlay
                  landmarks={analysisResult.pose.landmarks}
                  jointAngles={Object.fromEntries(analysisResult.jointAngles)}
                  width={640}
                  height={480}
                  showSkeleton={true}
                  showAngles={true}
                />
              </div>
            )}

            {/* Overlay de Calibração */}
            <CalibrationOverlay
              isVisible={state === SessionState.CALIBRATING && isCameraActive}
              landmarks={analysisResult.pose.landmarks}
              width={640}
              height={480}
              onComplete={finishCalibration}
              onCancel={() => {
                stopCamera();
                if(onBack) onBack();
              }}
            />

            {!isCameraActive && !cameraError && (
              <div className="text-center p-6 space-y-4">
                <CameraOff className="h-16 w-16 mx-auto text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">Câmera desativada</p>
                <Button onClick={toggleCamera}>
                  <Camera className="mr-2 h-4 w-4" />
                  Ativar Câmera para Biofeedback
                </Button>
              </div>
            )}

            {cameraError && (
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro na Câmera</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
                <Button variant="outline" size="sm" onClick={startCamera} className="mt-2">
                  Tentar Novamente
                </Button>
              </Alert>
            )}

            {/* Guia de Posicionamento (Opcional) */}
            {state === SessionState.IDLE && isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-dashed border-white/30 rounded-full w-48 h-48 flex items-center justify-center">
                  <span className="text-white/50 text-xs text-center p-2">
                    Posicione-se para<br />ver seu esqueleto
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Controles Principais */}
          <div className="flex justify-center space-x-4">
            {state === SessionState.IDLE ? (
              <Button size="lg" className="px-8" onClick={startSession} disabled={!isCameraActive}>
                <Play className="mr-2 h-5 w-5" />
                Começar Exercício
              </Button>
            ) : state === SessionState.EXERCISING ? (
              <>
                <Button size="lg" variant="outline" onClick={pauseSession}>
                  <Pause className="mr-2 h-5 w-5" />
                  Pausar
                </Button>
                <Button size="lg" variant="destructive" onClick={completeSession}>
                  <Square className="mr-2 h-5 w-5" />
                  Finalizar
                </Button>
              </>
            ) : state === SessionState.PAUSED ? (
              <>
                <Button size="lg" className="px-8" onClick={resumeSession}>
                  <Play className="mr-2 h-5 w-5" />
                  Continuar
                </Button>
                <Button size="lg" variant="destructive" onClick={completeSession}>
                  <Square className="mr-2 h-5 w-5" />
                  Finalizar
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Lado Direito: Métricas e Progresso */}
        <div className="flex flex-col space-y-4 overflow-y-auto">
          <RealTimeMetricsPanel
            metrics={analysisResult.metrics}
            repetitions={repCount}
            duration={session.duration}
            onPause={state === SessionState.EXERCISING ? pauseSession : undefined}
            onResume={state === SessionState.PAUSED ? resumeSession : undefined}
            onStop={state !== SessionState.IDLE ? completeSession : undefined}
          />

          {/* Instruções Dinâmicas */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                Dicas de Execução
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                {analysisResult.postureIssues.length > 0 ? (
                  analysisResult.postureIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-amber-500 mr-2">•</span>
                      {issue.suggestion}
                    </li>
                  ))
                ) : (
                  <>
                    <li>• Mantenha a coluna ereta e o core ativado.</li>
                    <li>• Execute o movimento de forma controlada.</li>
                    <li>• Respire durante as fases do exercício.</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
