import { Point3D, createVector, dotProduct, magnitude } from "./vectors";

/**
 * Calculates the angle (in degrees) between three points (A-B-C)
 * where B is the vertex.
 */
export function calculateAngle(a: Point3D, b: Point3D, c: Point3D): number {
  const v1 = createVector(b, a);
  const v2 = createVector(b, c);

  const dot = dotProduct(v1, v2);
  const mag1 = magnitude(v1);
  const mag2 = magnitude(v2);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosTheta = dot / (mag1 * mag2);
  // Clamp to avoid floating point errors out of range [-1, 1]
  const clampedCos = Math.max(-1, Math.min(1, cosTheta));

  const radians = Math.acos(clampedCos);
  return (radians * 180) / Math.PI;
}

/**
 * Specialized joint angle calculators
 */
export const JointAngles = {
  /** Knee flexion/extension */
  knee: (hip: Point3D, knee: Point3D, ankle: Point3D) => calculateAngle(hip, knee, ankle),

  /** Hip flexion/extension (against vertical) */
  hipFlexion: (shoulder: Point3D, hip: Point3D, knee: Point3D) =>
    calculateAngle(shoulder, hip, knee),

  /** Elbow flexion/extension */
  elbow: (shoulder: Point3D, elbow: Point3D, wrist: Point3D) =>
    calculateAngle(shoulder, elbow, wrist),
};
