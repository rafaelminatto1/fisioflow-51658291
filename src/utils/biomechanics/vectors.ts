/**
 * Biomechanical Vector Math Utilities
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates a vector between two points
 */
export function createVector(from: Point3D, to: Point3D): Point3D {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z,
  };
}

/**
 * Calculates the dot product of two vectors
 */
export function dotProduct(v1: Point3D, v2: Point3D): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * Calculates the magnitude (length) of a vector
 */
export function magnitude(v: Point3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Normalizes a vector to have a magnitude of 1
 */
export function normalize(v: Point3D): Point3D {
  const m = magnitude(v);
  if (m === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: v.x / m,
    y: v.y / m,
    z: v.z / m,
  };
}
