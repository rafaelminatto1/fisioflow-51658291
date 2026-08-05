/**
 * Tipos do núcleo de cinemática.
 *
 * Este módulo é compartilhado entre `apps/api` (que grava a métrica no laudo) e
 * `apps/professional-app` (que desenha o ângulo sobre o vídeo). Os dois números
 * saem da mesma função de propósito: se divergirem, o fisioterapeuta vê uma
 * coisa na tela e assina outra no PDF.
 */

/** Ordem canônica BlazePose/MediaPipe de 33 pontos. */
export const LANDMARK_NAMES = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
] as const;

export type LandmarkName = (typeof LANDMARK_NAMES)[number];

export const LANDMARK_INDEX = LANDMARK_NAMES.reduce<Record<string, number>>((acc, name, i) => {
  acc[name] = i;
  return acc;
}, {}) as Record<LandmarkName, number>;

export const LANDMARK_COUNT = LANDMARK_NAMES.length;

export interface Landmark {
  x: number;
  y: number;
  z: number;
  /** 0–1. Zero significa ausente — nunca omitimos o ponto, para manter stride fixo. */
  score: number;
}

export interface LandmarkFrame {
  frameIndex: number;
  /** ms desde o início da captura. */
  timeMs: number;
  landmarks: Landmark[];
  /** Média dos scores do frame. */
  confidence: number;
}

export type CaptureView = "frontal" | "sagittal" | "posterior";

export type Side = "left" | "right";

/**
 * Como o buffer de imagem estava orientado quando a pose foi estimada.
 * Sem isto a câmera frontal (espelhada) inverte esquerda/direita em todo o
 * laudo, silenciosamente — e uma tabela de goniometria com Esq/Dir trocados é
 * pior que nenhuma tabela.
 */
export interface CoordinateSpace {
  origin: "top-left";
  normalized: boolean;
  mirrored: boolean;
  rotationDegrees: 0 | 90 | 180 | 270;
  sourceWidth: number;
  sourceHeight: number;
}

export interface PoseEngineInfo {
  name: string;
  version?: string;
  platform?: string;
  mode?: string;
  modelVariant?: string;
}

export interface BundleHeader {
  schema: "ff-pose-33-v1";
  landmarkCount: number;
  order: "blazepose33";
  fps: number;
  frameCount: number;
  durationMs: number;
  view: CaptureView;
  attempt: number;
  attemptsTotal?: number;
  capturedAt: string;
  coordinateSpace: CoordinateSpace;
  poseEngine: PoseEngineInfo;
  device?: Record<string, unknown>;
  calibration?: Record<string, unknown>;
  protocolSlug?: string;
  truncated?: boolean;
}

export type MetricProvenance =
  | "device_pose"
  | "container_pose"
  | "manual"
  | "patient_reported"
  | "derived"
  | "synthetic_demo";

export interface ComputedMetric {
  metricKey: string;
  metricValue: number;
  unit: "deg" | "%" | "spm" | "ms" | "/10" | "m/s";
  side?: Side | "bilateral";
  phase?: string;
  view: CaptureView;
  confidence: number;
  /** Frames utilizáveis por trás do valor. Entra no laudo. */
  sampleCount: number;
  provenance: MetricProvenance;
  severity?: "normal" | "attention" | "critical";
  normalRange?: { min?: number; max?: number };
}

export interface DetectedEvent {
  eventType: string;
  timeMs: number;
  frameIndex: number;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface KeyframeRecord {
  frameIndex: number;
  timeMs: number;
  landmarks: Landmark[];
  confidence: number;
  view: CaptureView;
  attempt: number;
}

/**
 * Por que uma métrica NÃO foi emitida.
 *
 * Existir é o ponto: quando o plano da captura não permite medir valgo, a
 * resposta certa é "não mensurável nesta captura", não um número plausível.
 */
export interface RejectionReason {
  metricKey: string;
  reason: "plane_mismatch" | "low_confidence" | "insufficient_frames" | "missing_landmarks";
  detail: string;
}

export interface QualityReport {
  usableFrameRatio: number;
  meanConfidence: number;
  occludedJoints: LandmarkName[];
  /** 0–100, para `biomechanics_assessments.quality_score`. */
  score: number;
  verdict: "good" | "marginal" | "unusable";
}

export interface RomResult {
  min: number;
  max: number;
  rom: number;
  peakTimeMs: number;
  sampleCount: number;
}
