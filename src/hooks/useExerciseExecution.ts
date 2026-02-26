/**
 * useExerciseExecution - Hook principal para execução de exercícios
 *
 * Este hook coordena a detecção de pose, contagem de repetições e
 * análise de forma durante uma sessão de exercício.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ExerciseType,
  SessionState,
  ExerciseSession,
  createExerciseSession,
  PoseDetection,
  calculateSessionDuration,
} from '@/types/pose';
import { useRepCounter } from './useRepCounter';
import { useFormAnalysis } from './useFormAnalysis';
import { logExerciseStarted, logExerciseCompleted, logRepetitionCompleted } from '@/services/ai/poseAnalytics';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useAudioFeedback } from './useAudioFeedback';
import { SessionService } from '@/services/exercises/sessionService';

interface UseExerciseExecutionProps {
  exerciseId: string;
  patientId: string;
  exerciseType: ExerciseType;
  onSessionComplete?: (session: ExerciseSession) => void;
  enableAudio?: boolean;
}

export function useExerciseExecution({
  exerciseId,
  patientId,
  exerciseType,
  onSessionComplete,
  enableAudio = true,
}: UseExerciseExecutionProps) {
  // Estados da sessão
  const [state, setState] = useState<SessionState>(SessionState.CALIBRATING); // Começar com calibração
  const [session, setSession] = useState<ExerciseSession>(
    createExerciseSession(exerciseId, patientId, exerciseType)
  );

  // Estados de métricas em tempo real
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);

  // Referências para medição de performance
  const lastFrameTime = useRef<number>(Date.now());
  const frameCount = useRef<number>(0);
  const fpsTimer = useRef<NodeJS.Timeout | null>(null);

  // Hook de áudio (Feedback sonoro)
  const { speak, announceCount, announceCorrection, playSound } = useAudioFeedback({ enabled: enableAudio });

  // Hook de contagem de repetições
  const {
    count: repCount,
    phase: currentPhase,
    processFrame: processRepFrame,
    reset: resetRepCounter,
  } = useRepCounter({
    exerciseType,
    enabled: state === SessionState.EXERCISING,
    onRepCompleted: (rep) => {
      // Registrar no Analytics
      logRepetitionCompleted(exerciseId, repCount + 1, rep.quality);

      // Feedback Sonoro
      announceCount(repCount + 1);

      // Atualizar lista de repetições na sessão
      setSession(prev => ({
        ...prev,
        repetitions: prev.repetitions + 1,
        repetitionsList: [...prev.repetitionsList, rep],
      }));
    },
  });

  // Hook de análise de forma
  const {
    result: analysisResult,
    processFrame: processFormFrame,
    reset: resetFormAnalysis,
  } = useFormAnalysis({
    exerciseType,
    enabled: state === SessionState.EXERCISING || state === SessionState.CALIBRATING,
    onAnalysisResult: (result) => {
      // Verificar problemas posturais críticos e falar
      if (state === SessionState.EXERCISING && result.postureIssues.length > 0) {
        const criticalIssue = result.postureIssues.find(i => i.severity === 'severe' || i.severity === 'moderate');
        if (criticalIssue) {
          announceCorrection(criticalIssue.suggestion);
        }
      }
    }
  });

  /**
   * Finalizar calibração e iniciar
   */
  const finishCalibration = useCallback(() => {
    setState(SessionState.IDLE);
    speak('Posição ajustada. Preparar para iniciar.');
  }, [speak]);

  /**
   * Iniciar a sessão de exercício
   */
  const startSession = useCallback(() => {
    logger.info('[ExerciseExecution] Iniciando sessão', { exerciseId, exerciseType }, 'ExerciseExecution');

    setState(SessionState.EXERCISING);
    setSession(createExerciseSession(exerciseId, patientId, exerciseType));
    
    playSound('success');
    speak('Iniciando exercício. Valendo!');

    // Registrar no Analytics
    logExerciseStarted(exerciseId, exerciseType, 'patient');

    // Iniciar timer de FPS
    fpsTimer.current = setInterval(() => {
      setFps(frameCount.current);
      frameCount.current = 0;
    }, 1000);
  }, [exerciseId, patientId, exerciseType, speak, playSound]);

  /**
   * Pausar a sessão
   */
  const pauseSession = useCallback(() => {
    setState(SessionState.PAUSED);
    speak('Exercício pausado.');
  }, [speak]);

  /**
   * Retomar a sessão
   */
  const resumeSession = useCallback(() => {
    setState(SessionState.EXERCISING);
    speak('Retomando.');
  }, [speak]);

  /**
   * Finalizar a sessão
   */
  const completeSession = useCallback(async () => {
    const finalSession: ExerciseSession = {
      ...session,
      endTime: new Date(),
      duration: calculateSessionDuration(session),
      completed: true,
      metrics: {
        ...session.metrics,
        formScore: analysisResult.metrics.formScore,
        stabilityScore: analysisResult.metrics.stabilityScore,
        rangeOfMotion: analysisResult.metrics.rangeOfMotion,
        romPercentage: analysisResult.metrics.romPercentage,
        repetitions: repCount,
        avgFps: fps,
      },
    };

    logger.info('[ExerciseExecution] Sessão completada', {
      reps: repCount,
      score: finalSession.metrics.formScore
    }, 'ExerciseExecution');

    setState(SessionState.COMPLETED);
    setSession(finalSession);
    
    playSound('success');
    speak(`Treino finalizado. Você completou ${repCount} repetições.`);

    // Persistir no Firestore (Assíncrono)
    try {
      await SessionService.saveSession(finalSession);
    } catch (err) {
      logger.error('Falha ao salvar sessão automaticamente', err, 'ExerciseExecution');
    }

    // Registrar no Analytics
    logExerciseCompleted(exerciseId, repCount, finalSession.metrics.formScore, finalSession.duration);

    // Notificar callback
    if (onSessionComplete) {
      onSessionComplete(finalSession);
    }

    // Limpar recursos
    if (fpsTimer.current) clearInterval(fpsTimer.current);
  }, [session, analysisResult, repCount, fps, exerciseId, onSessionComplete, speak, playSound]);

  /**
   * Resetar tudo
   */
  const reset = useCallback(() => {
    setState(SessionState.CALIBRATING); // Voltar para calibração ao resetar
    setSession(createExerciseSession(exerciseId, patientId, exerciseType));
    resetRepCounter();
    resetFormAnalysis();
    setFps(0);
    setLatency(0);
    if (fpsTimer.current) clearInterval(fpsTimer.current);
  }, [exerciseId, patientId, exerciseType, resetRepCounter, resetFormAnalysis]);

  /**
   * Processar um novo frame de pose
   */
  const onPoseFrame = useCallback((pose: PoseDetection) => {
    if (state !== SessionState.EXERCISING && state !== SessionState.CALIBRATING) return;

    const startTime = Date.now();

    // 1. Analisar forma (sempre que ativo ou calibrando)
    const analysis = processFormFrame(pose);

    // 2. Contar repetições (apenas se em execução)
    if (state === SessionState.EXERCISING && analysis) {
      // Extrair ângulo principal para o contador
      const primaryAngleData = Array.from(analysis.jointAngles.values())[0];
      const primaryAngle = primaryAngleData?.current || 0;

      processRepFrame(pose.landmarks, primaryAngle);
    }

    // Calcular performance
    const endTime = Date.now();
    setLatency(endTime - startTime);
    frameCount.current++;
    lastFrameTime.current = endTime;
  }, [state, processFormFrame, processRepFrame]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (fpsTimer.current) clearInterval(fpsTimer.current);
    };
  }, []);

  return {
    state,
    session,
    analysisResult,
    repCount,
    currentPhase,
    fps,
    latency,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    reset,
    finishCalibration,
    onPoseFrame,
  };
}
