import type { Point3D } from "./vectors";

/**
 * Cálculo de ângulos articulares a partir de landmarks de pose.
 * O vértice é sempre o ponto central (a articulação medida).
 */
const angleAtVertex = (a: Point3D, vertex: Point3D, c: Point3D): number => {
  const radians =
    Math.atan2(c.y - vertex.y, c.x - vertex.x) - Math.atan2(a.y - vertex.y, a.x - vertex.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return Math.round(angle * 10) / 10;
};

export const JointAngles = {
  /** Ângulo do joelho (quadril → joelho → tornozelo). */
  knee: (hip: Point3D, knee: Point3D, ankle: Point3D) => angleAtVertex(hip, knee, ankle),
  /** Ângulo do cotovelo (ombro → cotovelo → punho). */
  elbow: (shoulder: Point3D, elbow: Point3D, wrist: Point3D) =>
    angleAtVertex(shoulder, elbow, wrist),
  /** Ângulo do quadril (ombro → quadril → joelho). */
  hip: (shoulder: Point3D, hip: Point3D, knee: Point3D) => angleAtVertex(shoulder, hip, knee),
};
