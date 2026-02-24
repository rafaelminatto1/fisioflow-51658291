/**
 * useFormAnalysis - Hook para análise de forma e biomecânica
 *
 * Este hook encapsula o AnalysisEngine para fornecer análise reativa de pose.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExerciseType,
  AnalysisResult,
  PoseDetection,
  createEmptyAnalysisResult,
} from '@/types/pose';
import { AnalysisEngine } from '@/services/ai/analysisEngine';

interface UseFormAnalysisProps {
  exerciseType: ExerciseType;
  enabled?: boolean;
  onAnalysisResult?: (result: AnalysisResult) => void;
}

export function useFormAnalysis({
  exerciseType,
  enabled = true,
  onAnalysisResult,
}: UseFormAnalysisProps) {
  const [result, setResult] = useState<AnalysisResult>(createEmptyAnalysisResult());
  const [formScore, setFormScore] = useState(100);
  const [stabilityScore, setStabilityScore] = useState(100);

  // Referência para o motor de análise
  const engineRef = useRef<AnalysisEngine | null>(null);

  // Inicializar motor
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new AnalysisEngine(exerciseType);
    } else {
      engineRef.current.setExerciseType(exerciseType);
    }

    if (enabled) {
      engineRef.current.start();
    } else {
      engineRef.current.stop();
    }
  }, [exerciseType, enabled]);

  /**
   * Processar um novo frame de detecção de pose
   */
  const processFrame = useCallback((pose: PoseDetection) => {
    if (!enabled || !engineRef.current) return null;

    const analysis = engineRef.current.processFrame(pose);

    // Atualizar estados locais
    setResult(analysis);
    setFormScore(analysis.metrics.formScore);
    setStabilityScore(analysis.metrics.stabilityScore);

    // Notificar callback se fornecido
    if (onAnalysisResult) {
      onAnalysisResult(analysis);
    }

    return analysis;
  }, [enabled, onAnalysisResult]);

  /**
   * Resetar a análise
   */
  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start(); // O start() faz reset interno
      setResult(createEmptyAnalysisResult());
      setFormScore(100);
      setStabilityScore(100);
    }
  }, []);

  return {
    result,
    formScore,
    stabilityScore,
    processFrame,
    reset,
    engine: engineRef.current,
  };
}
