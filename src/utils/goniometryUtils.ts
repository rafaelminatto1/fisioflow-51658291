/**
 * Utilitários para Goniometria Digital
 */

export interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Calcula o ângulo entre três pontos (em graus)
 * O ponto B é o vértice do ângulo (ex: o cotovelo)
 */
export const calculateAngle = (a: Point, b: Point, c: Point): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return Math.round(angle);
};

/**
 * Mapeamento amigável de articulações do MediaPipe Pose
 */
export const JOINT_INDICES = {
  shoulder_l: 11,
  shoulder_r: 12,
  elbow_l: 13,
  elbow_r: 14,
  wrist_l: 15,
  wrist_r: 16,
  hip_l: 23,
  hip_r: 24,
  knee_l: 25,
  knee_r: 26,
  ankle_l: 27,
  ankle_r: 28,
};
