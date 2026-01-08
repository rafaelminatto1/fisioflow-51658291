import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/lib/errors/logger';

// Interfaces para Computer Vision
interface PoseKeypoint {
  x: number;
  y: number;
  confidence: number;
  name: string;
}

interface PoseDetection {
  keypoints: PoseKeypoint[];
  confidence: number;
  timestamp: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ExerciseAnalysis {
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

interface ExerciseSession {
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

interface CalibrationData {
  userHeight: number; // em cm
  armSpan: number; // em cm
  referencePoints: PoseKeypoint[];
  cameraDistance: number; // em metros
  cameraAngle: number; // em graus
}

interface ExerciseTemplate {
  id: string;
  name: string;
  description: string;
  targetMuscles: string[];
  keyAngles: {
    joint: string;
    minAngle: number;
    maxAngle: number;
    optimalRange: { min: number; max: number };
  }[];
  phases: {
    name: string;
    duration: number; // em segundos
    keyPositions: string[];
    commonMistakes: string[];
  }[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
}

interface RealTimeFeedback {
  type: 'form' | 'timing' | 'range' | 'safety';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion: string;
  timestamp: number;
  autoCorrect?: boolean;
}

interface VisionSettings {
  modelAccuracy: 'fast' | 'balanced' | 'accurate';
  detectionThreshold: number;
  trackingSmoothing: number;
  feedbackSensitivity: 'low' | 'medium' | 'high';
  recordSession: boolean;
  showSkeleton: boolean;
  showAngles: boolean;
  showFeedback: boolean;
  mirrorMode: boolean;
}

// Templates de exercícios
const exerciseTemplates: Record<string, ExerciseTemplate> = {
  squat: {
    id: 'squat',
    name: 'Agachamento',
    description: 'Exercício fundamental para fortalecimento de pernas e glúteos',
    targetMuscles: ['Quadríceps', 'Glúteos', 'Isquiotibiais'],
    keyAngles: [
      {
        joint: 'knee',
        minAngle: 70,
        maxAngle: 180,
        optimalRange: { min: 90, max: 160 }
      },
      {
        joint: 'hip',
        minAngle: 60,
        maxAngle: 180,
        optimalRange: { min: 80, max: 160 }
      }
    ],
    phases: [
      {
        name: 'Descida',
        duration: 2,
        keyPositions: ['Pés paralelos', 'Joelhos alinhados', 'Quadril para trás'],
        commonMistakes: ['Joelhos para dentro', 'Inclinação excessiva']
      },
      {
        name: 'Subida',
        duration: 2,
        keyPositions: ['Empurrar pelos calcanhares', 'Extensão completa'],
        commonMistakes: ['Subida muito rápida', 'Não estender completamente']
      }
    ],
    difficulty: 'beginner'
  },
  pushup: {
    id: 'pushup',
    name: 'Flexão de Braço',
    description: 'Exercício para fortalecimento do peitoral, ombros e tríceps',
    targetMuscles: ['Peitoral', 'Deltoides', 'Tríceps'],
    keyAngles: [
      {
        joint: 'elbow',
        minAngle: 45,
        maxAngle: 180,
        optimalRange: { min: 60, max: 170 }
      },
      {
        joint: 'shoulder',
        minAngle: 30,
        maxAngle: 180,
        optimalRange: { min: 45, max: 160 }
      }
    ],
    phases: [
      {
        name: 'Descida',
        duration: 2,
        keyPositions: ['Corpo alinhado', 'Cotovelos próximos ao corpo'],
        commonMistakes: ['Quadril elevado', 'Cotovelos muito abertos']
      },
      {
        name: 'Subida',
        duration: 1.5,
        keyPositions: ['Extensão completa', 'Manter alinhamento'],
        commonMistakes: ['Extensão parcial', 'Perda de alinhamento']
      }
    ],
    difficulty: 'intermediate'
  },
  plank: {
    id: 'plank',
    name: 'Prancha',
    description: 'Exercício isométrico para fortalecimento do core',
    targetMuscles: ['Core', 'Deltoides', 'Glúteos'],
    keyAngles: [
      {
        joint: 'hip',
        minAngle: 170,
        maxAngle: 190,
        optimalRange: { min: 175, max: 185 }
      },
      {
        joint: 'shoulder',
        minAngle: 80,
        maxAngle: 100,
        optimalRange: { min: 85, max: 95 }
      }
    ],
    phases: [
      {
        name: 'Manutenção',
        duration: 30,
        keyPositions: ['Corpo reto', 'Core contraído', 'Respiração controlada'],
        commonMistakes: ['Quadril elevado', 'Quadril baixo', 'Tensão no pescoço']
      }
    ],
    difficulty: 'beginner'
  }
};

export const useComputerVision = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ExerciseSession | null>(null);
  const [poseDetections, setPoseDetections] = useState<PoseDetection[]>([]);
  const [realTimeFeedback, setRealTimeFeedback] = useState<RealTimeFeedback[]>([]);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
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
  const [isCalibrated, setIsCalibrated] = useState(false);
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
  const animationFrameRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Inicializar câmera
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraPermission('granted');

        return new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              resolve();
            };
          }
        });
      }
    } catch (error) {
      logger.error('Erro ao acessar câmera', error, 'useComputerVision');
      setCameraPermission('denied');
      throw error;
    }
  }, []);

  // Carregar modelo de pose detection (mock)
  const loadPoseModel = useCallback(async () => {
    try {
      // Em produção, carregar modelo real (TensorFlow.js, MediaPipe, etc.)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular carregamento

      modelRef.current = {
        detect: (_imageData: ImageData) => {
          // Mock de detecção de pose
          return mockPoseDetection();
        }
      };

      setModelLoaded(true);
    } catch (error) {
      logger.error('Erro ao carregar modelo de pose detection', error, 'useComputerVision');
      throw error;
    }
  }, []);

  // Mock de detecção de pose
  const mockPoseDetection = (): PoseDetection => {
    const keypoints: PoseKeypoint[] = [
      { x: 320, y: 100, confidence: 0.9, name: 'nose' },
      { x: 300, y: 150, confidence: 0.8, name: 'left_shoulder' },
      { x: 340, y: 150, confidence: 0.8, name: 'right_shoulder' },
      { x: 280, y: 200, confidence: 0.7, name: 'left_elbow' },
      { x: 360, y: 200, confidence: 0.7, name: 'right_elbow' },
      { x: 260, y: 250, confidence: 0.6, name: 'left_wrist' },
      { x: 380, y: 250, confidence: 0.6, name: 'right_wrist' },
      { x: 300, y: 300, confidence: 0.8, name: 'left_hip' },
      { x: 340, y: 300, confidence: 0.8, name: 'right_hip' },
      { x: 290, y: 400, confidence: 0.7, name: 'left_knee' },
      { x: 350, y: 400, confidence: 0.7, name: 'right_knee' },
      { x: 285, y: 500, confidence: 0.6, name: 'left_ankle' },
      { x: 355, y: 500, confidence: 0.6, name: 'right_ankle' }
    ];

    return {
      keypoints,
      confidence: 0.8,
      timestamp: Date.now(),
      boundingBox: {
        x: 250,
        y: 80,
        width: 150,
        height: 450
      }
    };
  };

  // Calcular ângulo entre três pontos
  const calculateAngle = useCallback((p1: PoseKeypoint, p2: PoseKeypoint, p3: PoseKeypoint): number => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);

    if (angle > 180.0) {
      angle = 360 - angle;
    }

    return angle;
  }, []);

  // Analisar exercício
  const analyzeExercise = useCallback((detection: PoseDetection, exerciseType: string): ExerciseAnalysis => {
    const template = exerciseTemplates[exerciseType];
    if (!template) {
      throw new Error(`Template não encontrado para exercício: ${exerciseType}`);
    }

    const keypoints = detection.keypoints;
    const analysis: ExerciseAnalysis = {
      exerciseType,
      repetitions: 0, // Será calculado ao longo do tempo
      form: {
        score: 85, // Mock score
        feedback: ['Boa postura geral', 'Manter alinhamento'],
        corrections: []
      },
      timing: {
        duration: 0,
        tempo: 'optimal',
        restTime: 0
      },
      range: {
        score: 78,
        maxAngle: 160,
        minAngle: 90,
        targetRange: { min: 90, max: 160 }
      },
      stability: {
        score: 82,
        tremor: 0.1,
        balance: 0.9
      }
    };

    // Análise específica por exercício
    if (exerciseType === 'squat') {
      const leftKnee = keypoints.find(kp => kp.name === 'left_knee');
      const leftHip = keypoints.find(kp => kp.name === 'left_hip');
      const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle');

      if (leftKnee && leftHip && leftAnkle) {
        const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        analysis.range.maxAngle = kneeAngle;

        if (kneeAngle < 90) {
          analysis.form.corrections.push('Desça mais para atingir 90 graus no joelho');
          analysis.form.score -= 10;
        }

        if (kneeAngle > 160) {
          analysis.form.feedback.push('Boa amplitude de movimento');
        }
      }
    }

    return analysis;
  }, [calculateAngle]);

  // Gerar feedback em tempo real
  const generateRealTimeFeedback = useCallback((analysis: ExerciseAnalysis): RealTimeFeedback[] => {
    const feedback: RealTimeFeedback[] = [];

    // Feedback de forma
    if (analysis.form.score < 70) {
      feedback.push({
        type: 'form',
        severity: 'warning',
        message: 'Atenção à postura',
        suggestion: analysis.form.corrections[0] || 'Mantenha o alinhamento corporal',
        timestamp: Date.now()
      });
    }

    // Feedback de amplitude
    if (analysis.range.score < 60) {
      feedback.push({
        type: 'range',
        severity: 'info',
        message: 'Amplitude limitada',
        suggestion: 'Tente aumentar a amplitude do movimento',
        timestamp: Date.now()
      });
    }

    // Feedback de estabilidade
    if (analysis.stability.score < 70) {
      feedback.push({
        type: 'safety',
        severity: 'warning',
        message: 'Movimento instável',
        suggestion: 'Reduza a velocidade e foque na estabilidade',
        timestamp: Date.now()
      });
    }

    return feedback;
  }, []);

  // Desenhar skeleton
  const drawSkeleton = useCallback((ctx: CanvasRenderingContext2D, keypoints: PoseKeypoint[]) => {
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];

    // Desenhar conexões
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const startPoint = keypoints.find(kp => kp.name === start);
      const endPoint = keypoints.find(kp => kp.name === end);

      if (startPoint && endPoint && startPoint.confidence > 0.5 && endPoint.confidence > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });

    // Desenhar keypoints
    keypoints.forEach(kp => {
      if (kp.confidence > 0.5) {
        ctx.fillStyle = kp.confidence > 0.8 ? '#00ff00' : '#ffff00';
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, []);

  // Desenhar ângulos
  const drawAngles = useCallback((ctx: CanvasRenderingContext2D, keypoints: PoseKeypoint[], exerciseType: string) => {
    const template = exerciseTemplates[exerciseType];
    if (!template) return;

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    // Exemplo: desenhar ângulo do joelho para agachamento
    if (exerciseType === 'squat') {
      const leftHip = keypoints.find(kp => kp.name === 'left_hip');
      const leftKnee = keypoints.find(kp => kp.name === 'left_knee');
      const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle');

      if (leftHip && leftKnee && leftAnkle) {
        const angle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const text = `${Math.round(angle)}°`;

        ctx.strokeText(text, leftKnee.x + 10, leftKnee.y - 10);
        ctx.fillText(text, leftKnee.x + 10, leftKnee.y - 10);
      }
    }
  }, [calculateAngle]);

  // Processar frame
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelRef.current || !isActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Ajustar tamanho do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenhar frame do vídeo
    if (settings.mirrorMode) {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.scale(-1, 1);
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Detectar pose
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const detection = modelRef.current.detect(imageData);

    // Atualizar detecções
    setPoseDetections(prev => {
      const updated = [...prev, detection].slice(-30); // Manter últimas 30 detecções
      return updated;
    });

    // Analisar exercício se ativo
    if (currentExercise) {
      const analysis = analyzeExercise(detection, currentExercise);
      const feedback = generateRealTimeFeedback(analysis);

      setRealTimeFeedback(prev => {
        const updated = [...prev, ...feedback].slice(-10); // Manter últimos 10 feedbacks
        return updated;
      });
    }

    // Desenhar skeleton se habilitado
    if (settings.showSkeleton) {
      drawSkeleton(ctx, detection.keypoints);
    }

    // Desenhar ângulos se habilitado
    if (settings.showAngles && currentExercise) {
      drawAngles(ctx, detection.keypoints, currentExercise);
    }

    // Atualizar stats
    setProcessingStats(prev => ({
      fps: Math.round(1000 / (Date.now() - prev.fps || 16)),
      latency: Date.now() - detection.timestamp,
      accuracy: detection.confidence
    }));

    // Continuar processamento
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive, currentExercise, settings, analyzeExercise, generateRealTimeFeedback, drawSkeleton, drawAngles]);


  // Iniciar sessão de exercício
  const startExerciseSession = useCallback(async (exerciseType: string) => {
    if (!isCalibrated) {
      throw new Error('Sistema não calibrado');
    }

    const session: ExerciseSession = {
      id: `session-${Date.now()}`,
      exerciseType,
      startTime: new Date(),
      totalRepetitions: 0,
      averageForm: 0,
      caloriesBurned: 0,
      analyses: [],
      screenshots: []
    };

    setCurrentSession(session);
    setCurrentExercise(exerciseType);
    setIsActive(true);

    // Iniciar gravação se habilitado
    if (settings.recordSession && streamRef.current) {
      const recorder = new MediaRecorder(streamRef.current);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      recordingRef.current = recorder;
    }

    // Iniciar processamento
    processFrame();
  }, [isCalibrated, settings.recordSession, processFrame]);

  // Parar sessão de exercício
  const stopExerciseSession = useCallback(() => {
    setIsActive(false);
    setCurrentExercise(null);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Parar gravação
    if (recordingRef.current && recordingRef.current.state === 'recording') {
      recordingRef.current.stop();

      recordingRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        if (currentSession) {
          setCurrentSession(prev => prev ? { ...prev, videoRecording: blob, endTime: new Date() } : null);
        }
      };
    }

    // Finalizar sessão
    if (currentSession) {
      setCurrentSession(prev => prev ? { ...prev, endTime: new Date() } : null);
    }
  }, [currentSession]);

  // Calibrar sistema
  const calibrateSystem = useCallback(async (userHeight: number, armSpan: number) => {
    if (!videoRef.current || !modelRef.current) {
      throw new Error('Câmera ou modelo não inicializados');
    }

    // Capturar pose de referência
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Erro ao criar canvas');

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const detection = modelRef.current.detect(imageData);

    const calibration: CalibrationData = {
      userHeight,
      armSpan,
      referencePoints: detection.keypoints,
      cameraDistance: 2.0, // Estimativa
      cameraAngle: 0
    };

    setCalibrationData(calibration);
    setIsCalibrated(true);
  }, []);

  // Tirar screenshot
  const takeScreenshot = useCallback((): string | null => {
    if (!canvasRef.current) return null;

    return canvasRef.current.toDataURL('image/png');
  }, []);

  // Limpar recursos
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (recordingRef.current && recordingRef.current.state === 'recording') {
      recordingRef.current.stop();
    }
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Inicializar sistema
  const initializeSystem = useCallback(async () => {
    try {
      await initializeCamera();
      await loadPoseModel();
    } catch (error) {
      logger.error('Erro ao inicializar sistema de computer vision', error, 'useComputerVision');
      throw error;
    }
  }, [initializeCamera, loadPoseModel]);

  return {
    // Estado
    isActive,
    currentExercise,
    currentSession,
    poseDetections,
    realTimeFeedback,
    calibrationData,
    settings,
    isCalibrated,
    cameraPermission,
    modelLoaded,
    processingStats,

    // Refs
    videoRef,
    canvasRef,

    // Ações
    initializeSystem,
    startExerciseSession,
    stopExerciseSession,
    calibrateSystem,
    takeScreenshot,

    // Configurações
    setSettings,

    // Utilitários
    exerciseTemplates,
    cleanup
  };
};

// Utility functions
export const getExerciseInstructions = (exerciseType: string): string[] => {
  const template = exerciseTemplates[exerciseType];
  if (!template) return [];

  return template.phases.flatMap(phase => phase.keyPositions);
};

export const getExerciseDifficulty = (exerciseType: string): string => {
  const template = exerciseTemplates[exerciseType];
  return template?.difficulty || 'unknown';
};

export const formatAngle = (angle: number): string => {
  return `${Math.round(angle)}°`;
};

export const getFormScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
};

export const getFeedbackIcon = (type: RealTimeFeedback['type']): string => {
  switch (type) {
    case 'form': return '🏃‍♂️';
    case 'timing': return '⏱️';
    case 'range': return '📐';
    case 'safety': return '⚠️';
    default: return 'ℹ️';
  }
};

export const calculateCaloriesBurned = (exerciseType: string, repetitions: number, userWeight: number = 70): number => {
  const caloriesPerRep = {
    squat: 0.5,
    pushup: 0.3,
    plank: 0.2 // por segundo
  };

  const baseCalories = caloriesPerRep[exerciseType as keyof typeof caloriesPerRep] || 0.3;
  return Math.round(baseCalories * repetitions * (userWeight / 70));
};