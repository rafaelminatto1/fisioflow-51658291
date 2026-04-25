import { useMemo } from "react";
import { Point, JointAngle } from "../../types/biomechanics";

/**
 * Hook to automatically calculate joint angles based on MoveNet keypoints
 */
export const useAutoAngles = (poseKeypoints: (Point & { score: number })[]) => {
  const calcAngle = (p1: Point, center: Point, p2: Point) => {
    const a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
    const a2 = Math.atan2(p2.y - center.y, p2.x - center.x);
    let angle = (a1 - a2) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    if (angle > 180) angle = 360 - angle;
    return Math.abs(angle);
  };

  const angles = useMemo(() => {
    if (!poseKeypoints || poseKeypoints.length < 17) return [];

    const results: JointAngle[] = [];
    const minScore = 0.3; // Minimum confidence to calculate angle

    // Indices based on MoveNet / KP_NAMES
    // 5: Ombro E, 6: Ombro D
    // 11: Quadril E, 12: Quadril D
    // 13: Joelho E, 14: Joelho D
    // 15: Tornozelo E, 16: Tornozelo D

    // 1. Left Knee Flexion
    if (
      poseKeypoints[11].score > minScore &&
      poseKeypoints[13].score > minScore &&
      poseKeypoints[15].score > minScore
    ) {
      const val = calcAngle(poseKeypoints[11], poseKeypoints[13], poseKeypoints[15]);
      results.push({
        name: "left_knee",
        label: "Joelho E",
        value: Number(val.toFixed(1)),
        color: "#00ff88",
        p1: poseKeypoints[11],
        center: poseKeypoints[13],
        p2: poseKeypoints[15],
      });
    }

    // 2. Right Knee Flexion
    if (
      poseKeypoints[12].score > minScore &&
      poseKeypoints[14].score > minScore &&
      poseKeypoints[16].score > minScore
    ) {
      const val = calcAngle(poseKeypoints[12], poseKeypoints[14], poseKeypoints[16]);
      results.push({
        name: "right_knee",
        label: "Joelho D",
        value: Number(val.toFixed(1)),
        color: "#00ff88",
        p1: poseKeypoints[12],
        center: poseKeypoints[14],
        p2: poseKeypoints[16],
      });
    }

    // 3. Left Hip Flexion
    if (
      poseKeypoints[5].score > minScore &&
      poseKeypoints[11].score > minScore &&
      poseKeypoints[13].score > minScore
    ) {
      const val = calcAngle(poseKeypoints[5], poseKeypoints[11], poseKeypoints[13]);
      results.push({
        name: "left_hip",
        label: "Quadril E",
        value: Number(val.toFixed(1)),
        color: "#ffd700",
        p1: poseKeypoints[5],
        center: poseKeypoints[11],
        p2: poseKeypoints[13],
      });
    }

    // 4. Right Hip Flexion
    if (
      poseKeypoints[6].score > minScore &&
      poseKeypoints[12].score > minScore &&
      poseKeypoints[14].score > minScore
    ) {
      const val = calcAngle(poseKeypoints[6], poseKeypoints[12], poseKeypoints[14]);
      results.push({
        name: "right_hip",
        label: "Quadril D",
        value: Number(val.toFixed(1)),
        color: "#ffd700",
        p1: poseKeypoints[6],
        center: poseKeypoints[12],
        p2: poseKeypoints[14],
      });
    }

    // 5. Trunk Lean (Relative to Vertical)
    // We use a virtual point above the hip to calculate lean
    if (poseKeypoints[11].score > minScore && poseKeypoints[5].score > minScore) {
      const hip = poseKeypoints[11];
      const shoulder = poseKeypoints[5];
      const verticalPoint = { x: hip.x, y: hip.y - 100 };
      const val = calcAngle(verticalPoint, hip, shoulder);
      results.push({
        name: "trunk_lean",
        label: "Inclinação Tronco",
        value: Number(val.toFixed(1)),
        color: "#ff69b4",
        p1: verticalPoint,
        center: hip,
        p2: shoulder,
      });
    }

    return results;
  }, [poseKeypoints]);

  return { angles };
};
