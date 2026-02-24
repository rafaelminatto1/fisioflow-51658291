/**
 * useRepCounter - Hook para contagem de repetições
 *
 * Este hook encapsula a lógica do RepetitionCounter em um estado reativo do React.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExerciseType,
  Repetition,
  RepCounterState,
  MovementPhase,
  PoseLandmark,
} from '@/types/pose';
import { RepetitionCounter } from '@/services/ai/repCounter';

interface UseRepCounterProps {
  exerciseType: ExerciseType;
  enabled?: boolean;
  onRepCompleted?: (rep: Repetition) => void;
  onPhaseChanged?: (phase: MovementPhase) => void;
}

export function useRepCounter({
  exerciseType,
  enabled = true,
  onRepCompleted,
  onPhaseChanged,
}: UseRepCounterProps) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<MovementPhase | null>(null);
  const [lastRep, setLastRep] = useState<Repetition | null>(null);

  // Referência para o contador (para manter estado entre renders)
  const counterRef = useRef<RepetitionCounter | null>(null);

  // Inicializar contador
  useEffect(() => {
    if (!counterRef.current) {
      counterRef.current = new RepetitionCounter(exerciseType);
    } else {
      counterRef.current.setExerciseType(exerciseType);
    }
  }, [exerciseType]);

  // Resetar quando habilitado/desabilitado
  useEffect(() => {
    if (!enabled && counterRef.current) {
      counterRef.current.reset();
      setCount(0);
      setPhase(null);
      setLastRep(null);
    }
  }, [enabled]);

  /**
   * Processar um novo frame de landmarks
   */
  const processFrame = useCallback((landmarks: PoseLandmark[], currentAngle: number) => {
    if (!enabled || !counterRef.current) return null;

    // Atualizar ângulo no contador
    counterRef.current.updateAngle(currentAngle);

    // Processar frame
    const result = counterRef.current.processFrame(landmarks);

    // Atualizar estados locais se mudarem
    if (result.count !== count) {
      setCount(result.count);
    }

    if (result.phase !== phase) {
      setPhase(result.phase);
      if (onPhaseChanged && result.phase) {
        onPhaseChanged(result.phase);
      }
    }

    if (result.repCompleted) {
      setLastRep(result.repCompleted);
      if (onRepCompleted) {
        onRepCompleted(result.repCompleted);
      }
    }

    return result;
  }, [enabled, count, phase, onRepCompleted, onPhaseChanged]);

  /**
   * Resetar o contador
   */
  const reset = useCallback(() => {
    if (counterRef.current) {
      counterRef.current.reset();
      setCount(0);
      setPhase(null);
      setLastRep(null);
    }
  }, []);

  /**
   * Obter estado atual
   */
  const getState = useCallback((): RepCounterState => {
    if (counterRef.current) {
      return counterRef.current.getState();
    }
    return {
      currentCount: 0,
      currentPhase: null,
      lastPhaseChange: 0,
      repCount: 0,
      repetitions: [],
      thresholds: {
        upThreshold: 0,
        downThreshold: 0,
        minDuration: 0,
        maxDuration: 0,
      },
    };
  }, []);

  return {
    count,
    phase,
    lastRep,
    processFrame,
    reset,
    getState,
    counter: counterRef.current,
  };
}
