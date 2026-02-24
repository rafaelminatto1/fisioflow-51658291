/**
 * Tipos e interfaces para Pose Detection no FisioFlow
 * Unificado para Web e Mobile
 */

// ============================================================================
// ENUMS
// ============================================================================

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
  SHOULDER_PRESS = 'shoulder_press',
  HIP_ABDUCTION = 'hip_abduction',
  KNEE_FLEXION = 'knee_flexion',
}

export enum MovementPhase {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  FLEXION = 'flexion',
  EXTENSION = 'extension',
  CONCENTRIC = 'concentric',
  ECCENTRIC = 'eccentric',
  HOLD = 'hold',
}

export enum ExecutionQuality {
  PERFECT = 'perfect',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  VERY_POOR = 'very_poor'
}

export enum SessionState {
  IDLE = 'idle',
  CALIBRATING = 'calibrating',
  EXERCISING = 'exercising',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ANALYZING = 'analyzing',
  ERROR = 'error',
}

export enum SeverityLevel {
  NONE = 'none',
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
}

// ============================================================================
// POSE LANDMARKS
// ============================================================================

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
  LEFT_FOOT: 33,
  RIGHT_FOOT: 34,
} as const;

// ============================================================================
// INTERFACES
// ============================================================================

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
  pivotIndex: number;
}

export interface AngleTriad {
  pivot: number;
  a: number;
  b: number;
}

export enum MainJoint {
  LEFT_SHOULDER = 'left_shoulder',
  RIGHT_SHOULDER = 'right_shoulder',
  LEFT_ELBOW = 'left_elbow',
  RIGHT_ELBOW = 'right_elbow',
  LEFT_WRIST = 'left_wrist',
  RIGHT_WRIST = 'right_wrist',
  LEFT_HIP = 'left_hip',
  RIGHT_HIP = 'right_hip',
  LEFT_KNEE = 'left_knee',
  RIGHT_KNEE = 'right_knee',
  LEFT_ANKLE = 'left_ankle',
  RIGHT_ANKLE = 'right_ankle',
}

export enum PostureIssueType {
  HEAD_FORWARD = 'head_forward',
  HEAD_BACKWARD = 'head_backward',
  HEAD_TILTED = 'head_tilted',
  SHOULDERS_ROUNDED = 'shoulders_rounded',
  SHOULDERS_ELEVATED = 'shoulders_elevated',
  SHOULDERS_ASYMMETRICAL = 'shoulders_asymmetric',
  BACK_ROUNDED = 'back_rounded',
  BACK_HYPEREXTENDED = 'back_hyperextended',
  BACK_FLEXED = 'back_flexed',
  HIPS_ASYMMETRIC = 'hips_asymmetric',
  HIPS_SHIFTED = 'hips_shifted',
  KNEES_VALGUS = 'knees_valgus',
  KNEES_CAVED = 'knees_caved',
  FLAT_FEET = 'flat_feet',
  WEAK_CORE = 'weak_core',
  EXCESSIVE_LEAN = 'excessive_lean',
  UNEVEN_PELVIS = 'uneven_pelvis',
}

export interface PostureIssue {
  type: PostureIssueType;
  severity: SeverityLevel;
  description: string;
  suggestion: string;
  scoreImpact: number;
}

export interface ExerciseMetrics {
  formScore: number;
  stabilityScore: number;
  rangeOfMotion: number;
  romPercentage: number;
  repetitions: number;
  avgAngles: Record<string, number>;
  duration: number;
  avgFps: number;
}

export interface RomData {
  joint: MainJoint;
  rom: number;
  normalMin: number;
  normalMax: number;
  percentageOfNormal: number;
}

export interface Repetition {
  startTime: number;
  endTime: number;
  duration: number;
  quality: ExecutionQuality;
  completed: boolean;
}

export interface ExerciseSession {
  id: string;
  exerciseId: string;
  exerciseType: ExerciseType;
  patientId: string;
  startTime: any;
  endTime?: any;
  duration: number;
  repetitions: number;
  totalScore: number;
  metrics: ExerciseMetrics;
  postureIssues: PostureIssue[];
  completed: boolean;
  createdAt: any;
}

export interface ExerciseTemplate {
  type: ExerciseType;
  name: string;
  primaryKeypoints: number[];
  angleTriads: AngleTriad[];
  thresholds: Record<string, { min: number; max: number }>;
  expectedRomMin: number;
  expectedRomMax: number;
}

export interface AnalysisResult {
  pose: PoseDetection;
  jointAngles: Map<MainJoint, JointAngle>;
  postureIssues: PostureIssue[];
  repCount: number;
  repetitions: Repetition[];
  metrics: ExerciseMetrics;
  timestamp: number;
}

export interface PoseProvider {
  initialize(): Promise<void>;
  detect(image: any): Promise<PoseDetection>;
  startStream(video: any, callback: (result: PoseDetection) => void): void;
  stopStream(): void;
  close(): void;
  isInitialized(): boolean;
}

export const EXERCISE_TEMPLATES: Record<ExerciseType, ExerciseTemplate> = {
  [ExerciseType.SQUAT]: {
    type: ExerciseType.SQUAT,
    name: 'Agachamento',
    primaryKeypoints: [11, 12, 23, 24, 25, 26, 27, 28],
    angleTriads: [
      { pivot: 23, a: 11, b: 25 }, // Hip
      { pivot: 25, a: 23, b: 27 }  // Knee
    ],
    thresholds: {
      '23': { min: 60, max: 100 },
      '25': { min: 70, max: 110 }
    },
    expectedRomMin: 70,
    expectedRomMax: 130,
  },
  // Adicionar outros conforme necessário
} as any;

export function getExerciseTemplate(type: ExerciseType): ExerciseTemplate {
  return EXERCISE_TEMPLATES[type] || EXERCISE_TEMPLATES[ExerciseType.SQUAT];
}
