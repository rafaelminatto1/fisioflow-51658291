import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaces para AR
interface ARMarker {
  id: string;
  type: 'exercise' | 'instruction' | 'feedback' | 'target';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  content: string;
  visible: boolean;
  animation?: {
    type: 'pulse' | 'rotate' | 'bounce' | 'fade';
    duration: number;
    loop: boolean;
  };
}

interface ARExercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  instructions: ARInstruction[];
  markers: ARMarker[];
  targetPoses: ARPose[];
  feedback: ARFeedback[];
}

interface ARInstruction {
  id: string;
  step: number;
  title: string;
  description: string;
  duration: number;
  voiceOver?: string;
  markers: string[]; // IDs dos markers relacionados
  triggers: ARTrigger[];
}

interface ARPose {
  id: string;
  name: string;
  keypoints: { [key: string]: { x: number; y: number; z: number } };
  tolerance: number;
  holdTime: number;
}

interface ARFeedback {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  position: { x: number; y: number; z: number };
  duration: number;
  sound?: string;
  vibration?: boolean;
}

interface ARTrigger {
  id: string;
  type: 'pose_match' | 'time_elapsed' | 'gesture' | 'voice_command';
  condition: any;
  action: 'show_marker' | 'hide_marker' | 'play_sound' | 'give_feedback' | 'next_step';
  target: string;
}

interface ARSession {
  id: string;
  exerciseId: string;
  patientId: string;
  startTime: Date;
  endTime?: Date;
  currentStep: number;
  completedSteps: number[];
  score: number;
  accuracy: number;
  feedback: ARFeedback[];
  poses: ARPose[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

interface ARCalibration {
  cameraPosition: { x: number; y: number; z: number };
  cameraRotation: { x: number; y: number; z: number };
  roomScale: number;
  lightingConditions: 'low' | 'medium' | 'high';
  trackingQuality: 'poor' | 'good' | 'excellent';
  floorLevel: number;
}

interface ARSettings {
  enableVoiceInstructions: boolean;
  enableHapticFeedback: boolean;
  markerOpacity: number;
  instructionFontSize: 'small' | 'medium' | 'large';
  feedbackVolume: number;
  autoNextStep: boolean;
  showPerformanceMetrics: boolean;
  recordSession: boolean;
}

// Mock data
const mockExercises: ARExercise[] = [
  {
    id: 'ar-squat',
    name: 'Agachamento com AR',
    description: 'Exercício de agachamento com orientação em realidade aumentada',
    category: 'Fortalecimento',
    difficulty: 'beginner',
    duration: 300,
    instructions: [
      {
        id: 'squat-1',
        step: 1,
        title: 'Posição Inicial',
        description: 'Fique em pé com os pés afastados na largura dos ombros',
        duration: 10,
        voiceOver: 'Posicione-se em pé com os pés afastados na largura dos ombros',
        markers: ['feet-position', 'spine-alignment'],
        triggers: [
          {
            id: 'pose-check-1',
            type: 'pose_match',
            condition: { pose: 'standing-ready' },
            action: 'next_step',
            target: 'squat-2'
          }
        ]
      },
      {
        id: 'squat-2',
        step: 2,
        title: 'Descida',
        description: 'Desça lentamente flexionando os joelhos e quadris',
        duration: 15,
        voiceOver: 'Desça lentamente mantendo as costas retas',
        markers: ['knee-angle', 'hip-position'],
        triggers: [
          {
            id: 'depth-check',
            type: 'pose_match',
            condition: { pose: 'squat-bottom' },
            action: 'next_step',
            target: 'squat-3'
          }
        ]
      },
      {
        id: 'squat-3',
        step: 3,
        title: 'Subida',
        description: 'Retorne à posição inicial empurrando com os calcanhares',
        duration: 10,
        voiceOver: 'Suba empurrando com os calcanhares',
        markers: ['heel-pressure', 'spine-alignment'],
        triggers: [
          {
            id: 'complete-rep',
            type: 'pose_match',
            condition: { pose: 'standing-ready' },
            action: 'give_feedback',
            target: 'rep-complete'
          }
        ]
      }
    ],
    markers: [
      {
        id: 'feet-position',
        type: 'target',
        position: { x: 0, y: -1.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        content: 'Posicione os pés aqui',
        visible: true,
        animation: { type: 'pulse', duration: 2000, loop: true }
      },
      {
        id: 'knee-angle',
        type: 'instruction',
        position: { x: 0.5, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.8, y: 0.8, z: 0.8 },
        content: 'Mantenha os joelhos alinhados',
        visible: false
      }
    ],
    targetPoses: [
      {
        id: 'standing-ready',
        name: 'Posição Inicial',
        keypoints: {
          'left_ankle': { x: -0.3, y: -1.5, z: 0 },
          'right_ankle': { x: 0.3, y: -1.5, z: 0 },
          'left_knee': { x: -0.3, y: -0.8, z: 0 },
          'right_knee': { x: 0.3, y: -0.8, z: 0 },
          'left_hip': { x: -0.2, y: 0, z: 0 },
          'right_hip': { x: 0.2, y: 0, z: 0 },
          'spine': { x: 0, y: 0.5, z: 0 },
          'head': { x: 0, y: 1.2, z: 0 }
        },
        tolerance: 0.1,
        holdTime: 2
      },
      {
        id: 'squat-bottom',
        name: 'Posição Baixa',
        keypoints: {
          'left_ankle': { x: -0.3, y: -1.5, z: 0 },
          'right_ankle': { x: 0.3, y: -1.5, z: 0 },
          'left_knee': { x: -0.4, y: -1.2, z: 0.2 },
          'right_knee': { x: 0.4, y: -1.2, z: 0.2 },
          'left_hip': { x: -0.2, y: -0.8, z: 0 },
          'right_hip': { x: 0.2, y: -0.8, z: 0 },
          'spine': { x: 0, y: -0.2, z: 0 },
          'head': { x: 0, y: 0.4, z: 0 }
        },
        tolerance: 0.15,
        holdTime: 1
      }
    ],
    feedback: [
      {
        id: 'good-form',
        type: 'success',
        message: 'Excelente forma! Continue assim.',
        position: { x: 0, y: 1.5, z: 0 },
        duration: 3000,
        sound: 'success.mp3',
        vibration: true
      },
      {
        id: 'knee-alignment',
        type: 'warning',
        message: 'Mantenha os joelhos alinhados com os pés',
        position: { x: 0, y: 0.5, z: 0 },
        duration: 4000,
        sound: 'warning.mp3'
      }
    ]
  },
  {
    id: 'ar-plank',
    name: 'Prancha com AR',
    description: 'Exercício de prancha com feedback em tempo real',
    category: 'Core',
    difficulty: 'intermediate',
    duration: 180,
    instructions: [
      {
        id: 'plank-1',
        step: 1,
        title: 'Posição de Prancha',
        description: 'Mantenha o corpo reto dos ombros aos calcanhares',
        duration: 60,
        voiceOver: 'Mantenha o corpo reto como uma prancha',
        markers: ['body-line', 'elbow-position'],
        triggers: [
          {
            id: 'time-complete',
            type: 'time_elapsed',
            condition: { seconds: 60 },
            action: 'give_feedback',
            target: 'plank-complete'
          }
        ]
      }
    ],
    markers: [
      {
        id: 'body-line',
        type: 'instruction',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        content: 'Linha do corpo',
        visible: true,
        animation: { type: 'fade', duration: 1000, loop: true }
      }
    ],
    targetPoses: [
      {
        id: 'plank-position',
        name: 'Posição de Prancha',
        keypoints: {
          'left_elbow': { x: -0.3, y: -0.8, z: 0 },
          'right_elbow': { x: 0.3, y: -0.8, z: 0 },
          'left_hip': { x: -0.1, y: 0, z: 0 },
          'right_hip': { x: 0.1, y: 0, z: 0 },
          'left_ankle': { x: -0.1, y: 0.8, z: 0 },
          'right_ankle': { x: 0.1, y: 0.8, z: 0 }
        },
        tolerance: 0.1,
        holdTime: 60
      }
    ],
    feedback: [
      {
        id: 'plank-complete',
        type: 'success',
        message: 'Prancha completada com sucesso!',
        position: { x: 0, y: 1, z: 0 },
        duration: 5000,
        sound: 'complete.mp3',
        vibration: true
      }
    ]
  }
];

const defaultSettings: ARSettings = {
  enableVoiceInstructions: true,
  enableHapticFeedback: true,
  markerOpacity: 0.8,
  instructionFontSize: 'medium',
  feedbackVolume: 0.7,
  autoNextStep: false,
  showPerformanceMetrics: true,
  recordSession: true
};

const defaultCalibration: ARCalibration = {
  cameraPosition: { x: 0, y: 1.6, z: 2 },
  cameraRotation: { x: -10, y: 0, z: 0 },
  roomScale: 1,
  lightingConditions: 'medium',
  trackingQuality: 'good',
  floorLevel: 0
};

// Hook principal
export const useAugmentedReality = () => {
  const [exercises] = useState<ARExercise[]>(mockExercises);
  const [currentExercise, setCurrentExercise] = useState<ARExercise | null>(null);
  const [currentSession, setCurrentSession] = useState<ARSession | null>(null);
  const [isARActive, setIsARActive] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibration, setCalibration] = useState<ARCalibration>(defaultCalibration);
  const [settings, setSettings] = useState<ARSettings>(defaultSettings);
  const [markers, setMarkers] = useState<ARMarker[]>([]);
  const [currentPose, setCurrentPose] = useState<any>(null);
  const [feedback, setFeedback] = useState<ARFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arContextRef = useRef<any>(null);

  // Inicializar AR
  const initializeAR = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar suporte a WebXR
      if (!('xr' in navigator)) {
        throw new Error('WebXR não é suportado neste dispositivo');
      }
      
      // Solicitar permissões de câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      // Inicializar contexto AR (mock)
      arContextRef.current = {
        initialized: true,
        tracking: false,
        markers: [],
        poses: []
      };
      
      setIsARActive(true);
      console.log('AR inicializado com sucesso');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inicializar AR');
      console.error('Erro ao inicializar AR:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Parar AR
  const stopAR = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsARActive(false);
    setCurrentSession(null);
    setMarkers([]);
    setFeedback([]);
    arContextRef.current = null;
    
    console.log('AR parado');
  }, []);

  // Calibrar AR
  const calibrateAR = useCallback(async () => {
    if (!isARActive) {
      throw new Error('AR deve estar ativo para calibrar');
    }
    
    setIsLoading(true);
    
    try {
      // Simular processo de calibração
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Atualizar calibração com valores detectados (mock)
      const newCalibration: ARCalibration = {
        ...calibration,
        trackingQuality: 'excellent',
        lightingConditions: 'good',
        floorLevel: -1.5
      };
      
      setCalibration(newCalibration);
      setIsCalibrated(true);
      
      console.log('Calibração concluída:', newCalibration);
      
    } catch (err) {
      setError('Erro durante calibração');
      console.error('Erro na calibração:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isARActive, calibration]);

  // Iniciar exercício
  const startExercise = useCallback((exerciseId: string, patientId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) {
      setError('Exercício não encontrado');
      return;
    }
    
    if (!isCalibrated) {
      setError('AR deve estar calibrado antes de iniciar exercício');
      return;
    }
    
    const session: ARSession = {
      id: `session-${Date.now()}`,
      exerciseId,
      patientId,
      startTime: new Date(),
      currentStep: 0,
      completedSteps: [],
      score: 0,
      accuracy: 0,
      feedback: [],
      poses: [],
      status: 'active'
    };
    
    setCurrentExercise(exercise);
    setCurrentSession(session);
    setMarkers(exercise.markers.filter(m => m.visible));
    setFeedback([]);
    
    // Iniciar primeira instrução
    if (exercise.instructions.length > 0) {
      const firstInstruction = exercise.instructions[0];
      if (settings.enableVoiceInstructions && firstInstruction.voiceOver) {
        speakInstruction(firstInstruction.voiceOver);
      }
    }
    
    console.log('Exercício iniciado:', exercise.name);
  }, [exercises, isCalibrated, settings.enableVoiceInstructions]);

  // Parar exercício
  const stopExercise = useCallback(() => {
    if (currentSession) {
      const updatedSession: ARSession = {
        ...currentSession,
        endTime: new Date(),
        status: 'completed'
      };
      
      setCurrentSession(updatedSession);
      console.log('Exercício concluído:', updatedSession);
    }
    
    setCurrentExercise(null);
    setMarkers([]);
    setFeedback([]);
  }, [currentSession]);

  // Processar pose detectada
  const processPose = useCallback((detectedPose: any) => {
    if (!currentExercise || !currentSession) return;
    
    setCurrentPose(detectedPose);
    
    // Verificar se pose corresponde aos targets
    const currentInstruction = currentExercise.instructions[currentSession.currentStep];
    if (!currentInstruction) return;
    
    // Simular verificação de pose
    const poseAccuracy = Math.random() * 100;
    
    // Atualizar sessão com nova pose
    setCurrentSession(prev => prev ? {
      ...prev,
      poses: [...prev.poses, {
        id: `pose-${Date.now()}`,
        name: 'detected-pose',
        keypoints: detectedPose.keypoints || {},
        tolerance: 0.1,
        holdTime: 0
      }],
      accuracy: (prev.accuracy + poseAccuracy) / 2
    } : null);
    
    // Dar feedback baseado na precisão
    if (poseAccuracy > 80) {
      giveFeedback({
        id: `feedback-${Date.now()}`,
        type: 'success',
        message: 'Ótima postura!',
        position: { x: 0, y: 1, z: 0 },
        duration: 2000
      });
    } else if (poseAccuracy < 50) {
      giveFeedback({
        id: `feedback-${Date.now()}`,
        type: 'warning',
        message: 'Ajuste sua postura',
        position: { x: 0, y: 1, z: 0 },
        duration: 3000
      });
    }
  }, [currentExercise, currentSession]);

  // Dar feedback
  const giveFeedback = useCallback((newFeedback: ARFeedback) => {
    setFeedback(prev => [...prev, newFeedback]);
    
    // Remover feedback após duração especificada
    setTimeout(() => {
      setFeedback(prev => prev.filter(f => f.id !== newFeedback.id));
    }, newFeedback.duration);
    
    // Reproduzir som se configurado
    if (newFeedback.sound && settings.feedbackVolume > 0) {
      playSound(newFeedback.sound, settings.feedbackVolume);
    }
    
    // Vibração se configurado
    if (newFeedback.vibration && settings.enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
  }, [settings.feedbackVolume, settings.enableHapticFeedback]);

  // Próximo passo
  const nextStep = useCallback(() => {
    if (!currentExercise || !currentSession) return;
    
    const nextStepIndex = currentSession.currentStep + 1;
    
    if (nextStepIndex >= currentExercise.instructions.length) {
      // Exercício concluído
      stopExercise();
      return;
    }
    
    const nextInstruction = currentExercise.instructions[nextStepIndex];
    
    setCurrentSession(prev => prev ? {
      ...prev,
      currentStep: nextStepIndex,
      completedSteps: [...prev.completedSteps, prev.currentStep]
    } : null);
    
    // Atualizar markers visíveis
    const visibleMarkers = currentExercise.markers.filter(marker => 
      nextInstruction.markers.includes(marker.id)
    );
    setMarkers(visibleMarkers);
    
    // Instrução de voz
    if (settings.enableVoiceInstructions && nextInstruction.voiceOver) {
      speakInstruction(nextInstruction.voiceOver);
    }
    
    console.log('Próximo passo:', nextInstruction.title);
  }, [currentExercise, currentSession, settings.enableVoiceInstructions, stopExercise]);

  // Atualizar configurações
  const updateSettings = useCallback((newSettings: Partial<ARSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Atualizar calibração
  const updateCalibration = useCallback((newCalibration: Partial<ARCalibration>) => {
    setCalibration(prev => ({ ...prev, ...newCalibration }));
  }, []);

  // Funções auxiliares
  const speakInstruction = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.volume = settings.feedbackVolume;
      speechSynthesis.speak(utterance);
    }
  };

  const playSound = (soundFile: string, volume: number) => {
    // Em produção, carregar e reproduzir arquivo de som
    console.log(`Reproduzindo som: ${soundFile} (volume: ${volume})`);
  };

  // Obter estatísticas da sessão
  const getSessionStats = useCallback(() => {
    if (!currentSession) return null;
    
    const duration = currentSession.endTime 
      ? currentSession.endTime.getTime() - currentSession.startTime.getTime()
      : Date.now() - currentSession.startTime.getTime();
    
    return {
      duration: Math.floor(duration / 1000),
      completedSteps: currentSession.completedSteps.length,
      totalSteps: currentExercise?.instructions.length || 0,
      accuracy: Math.round(currentSession.accuracy),
      score: currentSession.score,
      poses: currentSession.poses.length
    };
  }, [currentSession, currentExercise]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (isARActive) {
        stopAR();
      }
    };
  }, [isARActive, stopAR]);

  return {
    // Estado
    exercises,
    currentExercise,
    currentSession,
    isARActive,
    isCalibrated,
    calibration,
    settings,
    markers,
    currentPose,
    feedback,
    isLoading,
    error,
    
    // Refs
    videoRef,
    canvasRef,
    
    // Ações
    initializeAR,
    stopAR,
    calibrateAR,
    startExercise,
    stopExercise,
    processPose,
    giveFeedback,
    nextStep,
    updateSettings,
    updateCalibration,
    
    // Utilitários
    getSessionStats
  };
};

// Funções auxiliares para formatação
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'beginner': return 'Iniciante';
    case 'intermediate': return 'Intermediário';
    case 'advanced': return 'Avançado';
    default: return difficulty;
  }
};

export const getFeedbackColor = (type: string): string => {
  switch (type) {
    case 'success': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'error': return 'text-red-600';
    case 'info': return 'text-blue-600';
    default: return 'text-gray-600';
  }
};

export const getTrackingQualityColor = (quality: string): string => {
  switch (quality) {
    case 'excellent': return 'text-green-600';
    case 'good': return 'text-blue-600';
    case 'poor': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export default useAugmentedReality;