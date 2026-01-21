/**
 * useLivePoseAnalysis - Hook otimizado com lazy loading e abstração de plataforma
 *
 * Este hook agora usa a camada de abstração de detecção de pose,
 * permitindo funcionar tanto na web (MediaPipe) quanto no iOS (TFLite/MoveNet).
 *
 * @deprecated Use `createPoseDetectionService().startRealtimeDetection()` para novos códigos.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { UnifiedLandmark, POSE_LANDMARKS, calculateAngle } from '@/utils/geometry';
import { useMediaPipeVision } from '@/hooks/performance';
import { createPoseDetectionService } from '@/services/ai/pose';
import type { PoseDetectionResult } from '@/services/ai/pose/types';
import { Platform } from 'react-native';

export interface BiofeedbackMetrics {
  kneeValgusL: number;
  kneeValgusR: number;
  trunkLean: number;
  pelvicObliquity: number;
  confidence: number;
}

export interface UseLivePoseAnalysisOptions {
  /** Target FPS for pose detection (default: 30) */
  targetFps?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Force web implementation even on mobile */
  forceWebImplementation?: boolean;
}

export const useLivePoseAnalysis = (options: UseLivePoseAnalysisOptions = {}) => {
  const { targetFps = 30, debug = false, forceWebImplementation = false } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<BiofeedbackMetrics | null>(null);
  const [platform, setPlatform] = useState<'web' | 'native'>('web');

  // Service instance
  const serviceRef = useRef<ReturnType<typeof createPoseDetectionService> | null>(null);
  const requestRef = useRef<number>();

  // MediaPipe modules for web implementation (backward compatibility)
  const [mediaPipeModules, setMediaPipeModules] = useState<{
    PoseLandmarker: {
      createFromOptions: (vision: unknown, options: Record<string, unknown>) => Promise<unknown>;
      close: () => void;
      POSE_CONNECTIONS: unknown;
    };
    FilesetResolver: { forVisionTasks: (url: string) => Promise<unknown> };
    DrawingUtils: new (ctx: CanvasRenderingContext2D) => {
      drawLandmarks: (landmarks: unknown, options: Record<string, unknown>) => void;
      drawConnectors: (landmarks: unknown, connections: unknown) => void;
      lerp: (x: number, min: number, max: number, newMin: number, newMax: number) => number;
    };
  } | null>(null);

  const landmarkerRef = useRef<{
    detectForVideo: (video: HTMLVideoElement, timestamp: number) => { landmarks: unknown[][] };
    close?: () => void;
  } | null>(null);

  // Carregar MediaPipe sob demanda (apenas web)
  const { load: loadMediaPipe, isLoaded: mediaPipeLoaded, isLoading: mediaPipeLoading } =
    useMediaPipeVision();

  // Detect platform and initialize service
  useEffect(() => {
    const isWebPlatform = Platform.OS === 'web' || forceWebImplementation;
    setPlatform(isWebPlatform ? 'web' : 'native');

    if (!isWebPlatform) {
      // Initialize native service for iOS
      try {
        const service = createPoseDetectionService({ debug });
        serviceRef.current = service;

        if (debug) {
          console.log('[useLivePoseAnalysis] Using native iOS implementation');
        }
      } catch (err) {
        console.error('[useLivePoseAnalysis] Failed to initialize native service:', err);
        setError('Serviço de detecção de pose nativo não disponível.');
      }
    }

    return () => {
      // Cleanup native service
      if (serviceRef.current) {
        serviceRef.current.stopRealtimeDetection().catch(console.error);
      }
    };
  }, [debug, forceWebImplementation]);

  // Initialize MediaPipe for web implementation
  useEffect(() => {
    if (platform !== 'web') return;

    const initLandmarker = async () => {
      if (mediaPipeLoaded && mediaPipeModules && !landmarkerRef.current) {
        try {
          const { PoseLandmarker, FilesetResolver } = mediaPipeModules;
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
          );
          const landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          landmarkerRef.current = landmarker;

          if (debug) {
            console.log('[useLivePoseAnalysis] MediaPipe initialized');
          }
        } catch (err) {
          console.error('[useLivePoseAnalysis] Failed to init landmarker', err);
          setError('Falha ao carregar modelo de IA.');
        }
      }
    };

    if (mediaPipeLoaded && !mediaPipeModules) {
      // Carregar dependências do MediaPipe
      import('@mediapipe/tasks-vision').then((module) => {
        const { PoseLandmarker: PL, FilesetResolver: FR, DrawingUtils: DU } = module;
        setMediaPipeModules({
          PoseLandmarker: PL,
          FilesetResolver: FR,
          DrawingUtils: DU,
        });
      });
    } else if (mediaPipeLoaded && mediaPipeModules) {
      // Módulos já carregados, inicializar o landmarker
      initLandmarker();
    }

    return () => {
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [mediaPipeLoaded, mediaPipeModules, platform, debug]);

  // Calculate biomechanical metrics from pose landmarks
  const calculateBiofeedbackMetrics = useCallback(
    (landmarks: UnifiedLandmark[]): BiofeedbackMetrics => {
      const hipL = landmarks[POSE_LANDMARKS.LEFT_HIP];
      const hipR = landmarks[POSE_LANDMARKS.RIGHT_HIP];
      const kneeL = landmarks[POSE_LANDMARKS.LEFT_KNEE];
      const kneeR = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
      const ankleL = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
      const ankleR = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
      const shoulderL = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
      const shoulderR = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

      // Knee valgus angles
      const angleL = calculateAngle(hipL, kneeL, ankleL);
      const angleR = calculateAngle(hipR, kneeR, ankleR);

      // Trunk lean
      const midHip = { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2, z: 0 };
      const midShoulder = {
        x: (shoulderL.x + shoulderR.x) / 2,
        y: (shoulderL.y + shoulderR.y) / 2,
        z: 0,
      };
      const trunkVertical = Math.abs(
        calculateAngle({ x: midHip.x, y: midHip.y - 0.5, z: 0 }, midHip, midShoulder)
      );

      // Pelvic obliquity
      const pelvicSlope = Math.abs((Math.atan2(hipR.y - hipL.y, hipR.x - hipL.x) * 180) / Math.PI);

      // Overall confidence
      const confidence =
        landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / landmarks.length;

      return {
        kneeValgusL: angleL,
        kneeValgusR: angleR,
        trunkLean: trunkVertical,
        pelvicObliquity: pelvicSlope,
        confidence: confidence * 100,
      };
    },
    []
  );

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);

    // Carregar MediaPipe se ainda não foi carregado (apenas web)
    if (platform === 'web' && !mediaPipeLoaded) {
      await loadMediaPipe();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setIsAnalyzing(true);
          setIsLoading(false);

          if (platform === 'native' && serviceRef.current) {
            // Start native real-time detection
            serviceRef.current
              .startRealtimeDetection(
                (result: PoseDetectionResult) => {
                  const unified = result.landmarks as unknown as UnifiedLandmark[];
                  const metrics = calculateBiofeedbackMetrics(unified);
                  setMetrics(metrics);

                  if (debug) {
                    console.log('[useLivePoseAnalysis] Native pose result:', metrics);
                  }
                },
                { targetFps }
              )
              .catch((err) => {
                console.error('[useLivePoseAnalysis] Native detection error:', err);
                setError('Erro na detecção de pose nativa.');
              });
          } else {
            // Start web detection loop
            predictWebcam();
          }
        };
      }
    } catch (err) {
      console.error('[useLivePoseAnalysis] Camera access denied', err);
      setError('Acesso à câmera negado ou indisponível.');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    setIsAnalyzing(false);

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    // Stop native detection
    if (serviceRef.current) {
      serviceRef.current.stopRealtimeDetection().catch(console.error);
    }
  };

  const predictWebcam = useCallback(async () => {
    if (
      !landmarkerRef.current ||
      !videoRef.current ||
      !canvasRef.current ||
      !mediaPipeModules
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { DrawingUtils, PoseLandmarker } = mediaPipeModules;
    const drawingUtils = new DrawingUtils(ctx!);

    const startTimeMs = performance.now();

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      const result = landmarkerRef.current.detectForVideo(video, startTimeMs);

      // Clear canvas
      ctx!.clearRect(0, 0, canvas.width, canvas.height);

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];

        // Draw landmarks
        drawingUtils.drawLandmarks(landmarks, {
          radius: (data: { from?: { z: number } }) =>
            DrawingUtils.lerp(data.from?.z ?? 0, -0.15, 0.1, 5, 1),
        });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

        // Convert to UnifiedLandmark format
        const unified = landmarks.map(
          (l: { x: number; y: number; z: number; visibility?: number }) => ({
            x: l.x,
            y: l.y,
            z: l.z,
            visibility: l.visibility ?? 0,
          })
        ) as UnifiedLandmark[];

        // Calculate metrics
        const biofeedbackMetrics = calculateBiofeedbackMetrics(unified);
        setMetrics(biofeedbackMetrics);
      } else {
        setMetrics(null);
      }
    }

    if (isAnalyzing) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  }, [isAnalyzing, mediaPipeModules, calculateBiofeedbackMetrics]);

  // Restart loop if isAnalyzing changes state
  useEffect(() => {
    if (isAnalyzing && platform === 'web') {
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isAnalyzing, predictWebcam, platform]);

  return {
    videoRef,
    canvasRef,
    isAnalyzing,
    isLoading: isLoading || (platform === 'web' && mediaPipeLoading),
    error,
    metrics,
    platform,
    startCamera,
    stopCamera,
  };
};
