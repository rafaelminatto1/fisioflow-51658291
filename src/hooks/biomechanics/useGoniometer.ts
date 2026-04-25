import { useState, useCallback, useEffect } from "react";
import { Point } from "../../types/biomechanics";
import { calcAngle } from "../../utils/biomechanics-formulas";

const defaultPoints: Point[] = [
  { x: 400, y: 300 }, // vertex
  { x: 300, y: 200 }, // p1
  { x: 300, y: 400 }, // p2
];

export const useGoniometer = (
  initialPoints: Point[] = defaultPoints,
  poseKeypoints?: any[] | null,
  canvasDimensions?: { width: number; height: number },
  videoDimensions: { width: number; height: number } = { width: 640, height: 480 },
) => {
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [linkedKP, setLinkedKP] = useState<[number | null, number | null, number | null]>([
    null,
    null,
    null,
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [angleHistory, setAngleHistory] = useState<{ frame: number; angle: number }[]>([]);

  useEffect(() => {
    if (!poseKeypoints || !canvasDimensions) return;

    let changed = false;
    const newPts = [...points];

    for (let i = 0; i < 3; i++) {
      const kpIdx = linkedKP[i];
      if (kpIdx !== null) {
        const kp = poseKeypoints[kpIdx];
        if (kp && (kp.score ?? 0) > 0.3) {
          newPts[i] = {
            x: (kp.x / videoDimensions.width) * canvasDimensions.width,
            y: (kp.y / videoDimensions.height) * canvasDimensions.height,
          };
          changed = true;
        }
      }
    }

    if (changed) {
      setPoints(newPts);
      if (isRecording) {
        const ang = Number(calcAngle(newPts[0], newPts[1], newPts[2]));
        setAngleHistory((prev) => [...prev.slice(-300), { frame: prev.length, angle: ang }]);
      }
    }
  }, [poseKeypoints, linkedKP, isRecording, canvasDimensions, videoDimensions]);

  const updatePoint = useCallback((index: number, newPos: Point) => {
    setPoints((prev) => {
      const arr = [...prev];
      arr[index] = newPos;
      return arr;
    });
  }, []);

  const linkKeypoint = useCallback((index: number, kpIdx: number | null) => {
    setLinkedKP((prev) => {
      const arr: [number | null, number | null, number | null] = [...prev] as any;
      arr[index] = kpIdx;
      return arr;
    });
  }, []);

  const toggleRecording = useCallback(() => setIsRecording((prev) => !prev), []);

  const clearGoniometer = useCallback(() => {
    setPoints(initialPoints);
    setLinkedKP([null, null, null]);
    setAngleHistory([]);
    setIsRecording(false);
  }, [initialPoints]);

  const currentAngle = Number(calcAngle(points[0], points[1], points[2]));

  return {
    points,
    updatePoint,
    currentAngle,
    clearGoniometer,
    linkedKP,
    linkKeypoint,
    isRecording,
    toggleRecording,
    angleHistory,
  };
};
