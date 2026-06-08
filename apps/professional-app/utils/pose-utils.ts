import { Pose } from "expo-vision-pose-detector";

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  score?: number;
}

/**
 * Mapeia os landmarks da Vision Camera para o formato esperado pela UI de Biomecânica
 */
export const mapVisionToPoseLandmarks = (results: Pose): Pose | null => {
  if (!results) return null;

  return {
    nose: results.nose,
    leftEye: results.leftEye,
    rightEye: results.rightEye,
    leftEar: results.leftEar,
    rightEar: results.rightEar,
    leftShoulder: results.leftShoulder,
    rightShoulder: results.rightShoulder,
    leftElbow: results.leftElbow,
    rightElbow: results.rightElbow,
    leftWrist: results.leftWrist,
    rightWrist: results.rightWrist,
    leftHip: results.leftHip,
    rightHip: results.rightHip,
    leftKnee: results.leftKnee,
    rightKnee: results.rightKnee,
    leftAnkle: results.leftAnkle,
    rightAnkle: results.rightAnkle,
    leftHeel: results.leftHeel,
    rightHeel: results.rightHeel,
    leftFootIndex: results.leftFootIndex,
    rightFootIndex: results.rightFootIndex,
  };
};

/**
 * Calcula o ângulo entre três pontos (A, B, C), onde B é o vértice
 */
export const calculateAngle = (p1: Landmark, p2: Landmark, p3: Landmark): number => {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return Math.round(angle * 10) / 10;
};

/**
 * Calcula o ângulo de um segmento em relação à vertical (Plano de Prumo)
 */
export const calculateVerticalAngle = (p1: Landmark, p2: Landmark): number => {
  const radians = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  let angle = (radians * 180.0) / Math.PI;

  // Normaliza para o desvio da vertical (90 graus)
  angle = Math.abs(angle - 90);

  return Math.round(angle * 10) / 10;
};

/**
 * Calcula o ângulo de um segmento em relação à horizontal (Nível)
 */
export const calculateHorizontalAngle = (p1: Landmark, p2: Landmark): number => {
  const radians = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  let angle = (radians * 180.0) / Math.PI;

  // Normaliza para o desvio da horizontal (0 graus)
  angle = Math.abs(angle);

  return Math.round(angle * 10) / 10;
};

/**
 * Verifica o status de um ângulo comparado à referência
 */
export const getAngleStatus = (
  angle: number,
  reference: number,
  tolerance: number,
): "ok" | "warning" | "alert" => {
  const diff = Math.abs(angle - reference);
  if (diff <= tolerance) return "ok";
  if (diff <= tolerance * 2) return "warning";
  return "alert";
};

/**
 * Calcula a simetria entre dois valores (Esquerdo vs Direito)
 * Retorna a diferença percentual
 */
export const calculateSymmetry = (left: number, right: number): number => {
  if (left === 0 && right === 0) return 0;
  const max = Math.max(left, right);
  const min = Math.min(left, right);
  return Math.round(((max - min) / max) * 100);
};

/**
 * Formata um ângulo para exibição
 */
export const formatAngle = (angle: number) => `${angle.toFixed(1)}°`;
