
// Interfaces para Computer Vision

import { useState, useRef, useCallback, useEffect } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useMediaPipeVision } from '@/hooks/performance';

export interface PoseKeypoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
  name?: string;
}

export interface PoseDetection {
  keypoints: PoseKeypoint[];
  confidence: number;
  timestamp: number;
}

export interface ExerciseAnalysis {
  exerciseType: string;
  repetitions: number;
  form: {
    score: number; // 0-100
    feedback: string[];
    corrections: string[];
  };
  timing: {
    duration: number;
    tempo: 'too_fast' | 'optimal' | 'too_slow';
    restTime: number;
  };
  range: {
    score: number; // 0-100
    maxAngle: number;
    minAngle: number;
    targetRange: { min: number; max: number };
  };
  stability: {
    score: number; // 0-100
    tremor: number;
    balance: number;
  };
}

export interface ExerciseSession {
  id: string;
  exerciseType: string;
  startTime: Date;
  endTime?: Date;
  totalRepetitions: number;
  averageForm: number;
  caloriesBurned: number;
  analyses: ExerciseAnalysis[];
  videoRecording?: Blob;
  screenshots: string[];
}

export interface RealTimeFeedback {
  type: 'form' | 'timing' | 'range' | 'safety';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion: string;
  timestamp: number;
  autoCorrect?: boolean;
}

export interface VisionSettings {
  modelAccuracy: 'fast' | 'balanced' | 'accurate';
  detectionThreshold: number;
  trackingSmoothing: number;
  feedbackSensitivity: 'low' | 'medium' | 'high';
  recordSession: boolean;
  showSkeleton: boolean;
  showAngles: boolean;
  showFeedback: boolean;
  mirrorMode: boolean;
  recordSession_placeholder?: boolean;
  showAngles_placeholder?: boolean;
  showFeedback_placeholder?: boolean;
  mirrorMode_placeholder?: boolean;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  description: string;
  targetMuscles: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  phases: { keyPositions: string[] }[];
}

// Templates de exercícios
export const exerciseTemplates: Record<string, ExerciseTemplate> = {
  squat: {
    id: 'squat',
    name: 'Agachamento',
    description: 'Fortalecimento de pernas e glúteos',
    targetMuscles: ['Quadríceps', 'Glúteos'],
    difficulty: 'beginner',
    phases: [{ keyPositions: ['Costas retas', 'Joelhos alinhados', 'Descer até 90°'] }]
  },
  pushup: {
    id: 'pushup',
    name: 'Flexão de Braço',
    description: 'Fortalecimento de peito e tríceps',
    targetMuscles: ['Peitoral', 'Tríceps'],
    difficulty: 'intermediate',
    phases: [{ keyPositions: ['Corpo alinhado', 'Cotovelos a 45°', 'Peito próximo ao chão'] }]
  }
};

export const useComputerVision = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ExerciseSession | null>(null);
  const [realTimeFeedback, _setRealTimeFeedback] = useState<RealTimeFeedback[]>([]);
  const [settings, setSettings] = useState<VisionSettings>({
    modelAccuracy: 'balanced',
    detectionThreshold: 0.5,
    trackingSmoothing: 0.7,
    feedbackSensitivity: 'medium',
    recordSession: false,
    showSkeleton: true,
    showAngles: true,
    showFeedback: true,
    mirrorMode: true
  });
  
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    fps: 0,
    latency: 0,
    accuracy: 0
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<unknown>(null);
  const requestRef = useRef<number>();
  
  // Exercise Logic State
  const exerciseStateRef = useRef<{
    stage: 'up' | 'down';
    lastRepTime: number;
    reps: number;
    minAngle: number;
  }>({ stage: 'up', lastRepTime: 0, reps: 0, minAngle: 180 });

  const { load: loadMediaPipe, isLoaded: mediaPipeLoaded } = useMediaPipeVision();

  const initializeSystem = useCallback(async () => {
    try {
      if (!mediaPipeLoaded) await loadMediaPipe();

      const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
      );
      
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraPermission('granted');
      }

      setModelLoaded(true);
    } catch (err) {
      logger.error('Failed to initialize CV system', err, 'useComputerVision');
      setCameraPermission('denied');
    }
  }, [mediaPipeLoaded, loadMediaPipe]);

  const processFrame = useCallback(() => {
    if (!landmarkerRef.current || !videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTimeMs = performance.now();
    let result: any; 
    
    try {
        result = landmarkerRef.current.detectForVideo(video, startTimeMs);
    } catch (e) {
        // Ignore frame errors
        requestRef.current = requestAnimationFrame(processFrame);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      
      // Draw Skeleton
      if (settings.showSkeleton) {
        // Feedback Color based on form
        const feedbackColor = getBiomechanicalFeedbackColor(landmarks, currentExercise || '');
        drawSkeleton(ctx, landmarks, canvas.width, canvas.height, feedbackColor);
      }
      
      // Multi-Exercise Logic
      const state = exerciseStateRef.current;

      if (currentExercise === 'squat') {
        const hip = landmarks[24]; const knee = landmarks[26]; const ankle = landmarks[28];
        if (hip && knee && ankle) {
           const angle = calculateAngle(hip, knee, ankle);
           handleRepetition(angle, 160, 100, state);
           if (settings.showAngles) drawAngle(ctx, knee, angle, canvas.width, canvas.height);
        }
      } else if (currentExercise === 'pushup') {
        const shoulder = landmarks[12]; const elbow = landmarks[14]; const wrist = landmarks[16];
        if (shoulder && elbow && wrist) {
           const angle = calculateAngle(shoulder, elbow, wrist);
           handleRepetition(angle, 150, 70, state);
           if (settings.showAngles) drawAngle(ctx, elbow, angle, canvas.width, canvas.height);
        }
      } else if (currentExercise === 'lateral_raise') {
        const hip = landmarks[24]; const shoulder = landmarks[12]; const elbow = landmarks[14];
        if (hip && shoulder && elbow) {
           const angle = calculateAngle(hip, shoulder, elbow);
           handleRepetition(angle, 30, 85, state, 'inverse'); // Starts low, goes high
           if (settings.showAngles) drawAngle(ctx, shoulder, angle, canvas.width, canvas.height);
        }
      }

      // Sync Reps to Session
      if (state.reps !== currentSession?.totalRepetitions) {
         setCurrentSession(prev => prev ? ({ ...prev, totalRepetitions: state.reps }) : null);
      }

      // Basic FPS calculation
      setProcessingStats({
        fps: Math.round(1000 / (performance.now() - startTimeMs + 1)),
        latency: Math.round(performance.now() - startTimeMs),
        accuracy: landmarks[0].visibility || 0
      });
    }

    requestRef.current = requestAnimationFrame(processFrame);
  }, [isActive, currentExercise, settings]);

  // Helper: Calculate Angle
  const calculateAngle = (a: PoseKeypoint, b: PoseKeypoint, c: PoseKeypoint) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  };

  // Helper: Repetition Handler
  const handleRepetition = (angle: number, thresholdUp: number, thresholdDown: number, state: any, mode: 'normal' | 'inverse' = 'normal') => {
    if (mode === 'normal') {
      if (angle > thresholdUp) {
        if (state.stage === 'down' && state.minAngle < thresholdDown) {
          state.reps += 1;
          state.minAngle = 180;
        }
        state.stage = 'up';
      }
      if (angle < thresholdDown + 20) {
        state.stage = 'down';
        if (angle < state.minAngle) state.minAngle = angle;
      }
    } else {
      // Inverse (for raises, where "down" is small angle and "up" is large)
      if (angle < thresholdUp) {
        if (state.stage === 'up' && state.maxAngle > thresholdDown) {
          state.reps += 1;
          state.maxAngle = 0;
        }
        state.stage = 'down';
      }
      if (angle > thresholdDown - 20) {
        state.stage = 'up';
        if (angle > (state.maxAngle || 0)) state.maxAngle = angle;
      }
    }
  };

  const getBiomechanicalFeedbackColor = (landmarks: any, exercise: string): string => {
    // Logic to detect compensations
    // Example: If hip drops too much in pushup (arch back)
    if (exercise === 'pushup') {
      const shoulder = landmarks[12];
      const hip = landmarks[24];
      const ankle = landmarks[28];
      if (shoulder && hip && ankle) {
        const alignment = calculateAngle(shoulder, hip, ankle);
        return alignment < 160 ? '#ef4444' : '#22c55e'; // Red if back is arched
      }
    }
    return '#22c55e'; // Default Green
  };

  // Helper: Draw Skeleton
  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: PoseKeypoint[], w: number, h: number, color = '#00ff00') => {
     ctx.lineWidth = 3;
     ctx.strokeStyle = color;
     
     // Connect keypoints (Simplified connection list for legs/arms/torso)
     const connections = [
       [11, 12], [11, 13], [13, 15], // Arms L
       [12, 14], [14, 16], // Arms R
       [11, 23], [12, 24], // Torso
       [23, 24],
       [23, 25], [25, 27], // Legs L
       [24, 26], [26, 28]  // Legs R
     ];

     connections.forEach(([i, j]) => {
        if (landmarks[i] && landmarks[j]) {
           ctx.beginPath();
           ctx.moveTo(landmarks[i].x * w, landmarks[i].y * h);
           ctx.lineTo(landmarks[j].x * w, landmarks[j].y * h);
           ctx.stroke();
        }
     });
     
     // Draw points
     ctx.fillStyle = '#ff0000';
     [11,12,13,14,15,16,23,24,25,26,27,28].forEach(idx => {
        if(landmarks[idx]) {
           ctx.beginPath();
           ctx.arc(landmarks[idx].x * w, landmarks[idx].y * h, 4, 0, 2 * Math.PI);
           ctx.fill();
        }
     });
  };

  const drawAngle = (ctx: CanvasRenderingContext2D, point: PoseKeypoint, angle: number, w: number, h: number) => {
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText(`${Math.round(angle)}°`, point.x * w + 10, point.y * h);
  };

  const startExerciseSession = (type: string) => {
    setCurrentExercise(type);
    setIsActive(true);
    
    const session: ExerciseSession = {
      id: `session-${Date.now()}`,
      exerciseType: type,
      startTime: new Date(),
      totalRepetitions: 0,
      averageForm: 0,
      caloriesBurned: 0,
      analyses: [],
      screenshots: []
    };
    setCurrentSession(session);
    processFrame();
  };

  const stopExerciseSession = () => {
    setIsActive(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    isActive,
    currentExercise,
    currentSession,
    realTimeFeedback,
    settings,
    isCalibrated: true,
    cameraPermission,
    modelLoaded,
    processingStats,
    videoRef,
    canvasRef,
    initializeSystem,
    startExerciseSession,
    stopExerciseSession,
    calibrateSystem: async () => {},
    takeScreenshot: () => canvasRef.current?.toDataURL(),
    setSettings,
    exerciseTemplates
  };
};

export const getExerciseInstructions = (exerciseType: string): string[] => {
  return exerciseTemplates[exerciseType]?.phases[0].keyPositions || [];
};

export const getFormScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

export const getFeedbackIcon = (type: string): string => {
  switch (type) {
    case 'form': return '🏃';
    case 'safety': return '⚠️';
    default: return 'ℹ️';
  }
};
