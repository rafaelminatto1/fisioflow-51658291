import { requireNativeModule } from "expo-modules-core";

// Native module backed by Vision Framework (Apple) — no VisionCamera dependency
const ExpoVisionPoseDetector = requireNativeModule("ExpoVisionPoseDetector");

/** Um landmark de pose normalizado (0–1) com confiança. */
export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  score: number;
}

/**
 * Conjunto de landmarks corporais detectados em um frame/imagem.
 * Chaves seguem a convenção do Vision Framework (nose, leftShoulder, etc).
 */
export interface Pose {
  nose?: PoseLandmark;
  leftEye?: PoseLandmark;
  rightEye?: PoseLandmark;
  leftEar?: PoseLandmark;
  rightEar?: PoseLandmark;
  leftShoulder?: PoseLandmark;
  rightShoulder?: PoseLandmark;
  leftElbow?: PoseLandmark;
  rightElbow?: PoseLandmark;
  leftWrist?: PoseLandmark;
  rightWrist?: PoseLandmark;
  leftHip?: PoseLandmark;
  rightHip?: PoseLandmark;
  leftKnee?: PoseLandmark;
  rightKnee?: PoseLandmark;
  leftAnkle?: PoseLandmark;
  rightAnkle?: PoseLandmark;
  leftHeel?: PoseLandmark;
  rightHeel?: PoseLandmark;
  leftFootIndex?: PoseLandmark;
  rightFootIndex?: PoseLandmark;
  [key: string]: PoseLandmark | undefined;
}

/** Detect 2D human body pose landmarks from an image URL */
export async function detectPoseAsync(imageUrl: string): Promise<any[]> {
  return await ExpoVisionPoseDetector.detectPoseAsync(imageUrl);
}

/** Detect 3D human body pose landmarks from an image URL (iOS 17+) */
export async function detectPose3DAsync(imageUrl: string): Promise<any[]> {
  return await ExpoVisionPoseDetector.detectPose3DAsync(imageUrl);
}

/**
 * Frame processor (worklet) para detecção de pose em tempo real.
 *
 * PLACEHOLDER: o plugin nativo de frame processor ainda NÃO foi implementado
 * (o módulo nativo só expõe `detectPoseAsync`/`detectPose3DAsync` por URL).
 * Mantido para a tipagem das telas de câmera ao vivo (BiomechanicsCameraView,
 * ClinicalTestVerifierCamera); retorna `null` até o plugin nativo existir.
 */
export function detectPose(_frame: unknown): Pose | null {
  "worklet";
  return null;
}

export default ExpoVisionPoseDetector;
