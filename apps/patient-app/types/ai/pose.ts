/**
 * Tipos e interfaces para Pose Detection (Compartilhado com Profissional e Web)
 */

export enum AnalysisType {
  POSTURE = 'posture',
  REPETITION = 'repetition',
  RANGE = 'range',
  FORM = 'form'
}

export enum ExerciseType {
  SQUAT = 'squat',
  PUSHUP = 'pushup',
  LATERAL_RAISE = 'lateral_raise',
  PLANK = 'plank',
  LUNGE = 'lunge',
}

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility: number;
}

export interface PoseDetection {
  landmarks: PoseLandmark[];
  confidence: number;
  timestamp: number;
  analysisType: AnalysisType;
}

export interface JointAngle {
  joint: string;
  current: number;
  min: number;
  max: number;
  average: number;
  target: { min: number; max: number };
  inRange: boolean;
}

export interface ExerciseMetrics {
  formScore: number;
  stabilityScore: number;
  rangeOfMotion: number;
  repetitions: number;
  duration: number;
}

export interface AnalysisResult {
  pose: PoseDetection;
  jointAngles: Map<string, JointAngle>;
  repCount: number;
  metrics: ExerciseMetrics;
  timestamp: number;
  feedback?: string[];
}
