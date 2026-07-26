import { useState, useCallback } from "react";

export interface Point2D {
  x: number;
  y: number;
}

export type GoniometerToolType = "pointer" | "view" | "line" | "angle" | "eraser";

export interface AnnotationItem {
  id: string;
  type: "line" | "angle";
  points: Point2D[];
  color: string;
  label?: string;
}

/**
 * Custom hook to manage Kinovea-style goniometer tools and 2D canvas annotations.
 */
export function useGoniometerCanvas(initialAnnotations: AnnotationItem[] = []) {
  const [activeTool, setActiveTool] = useState<GoniometerToolType>("pointer");
  const [annotations, setAnnotations] = useState<AnnotationItem[]>(initialAnnotations);
  const [currentDraftPoints, setCurrentDraftPoints] = useState<Point2D[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("#3B82F6"); // FisioFlow Primary HSL blue

  /**
   * Calculates the 2D angle (in degrees) between three points (P1 -> P2 vertex -> P3).
   */
  const calculateAngleDegrees = useCallback((p1: Point2D, p2: Point2D, p3: Point2D): number => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    let cosAngle = dotProduct / (mag1 * mag2);
    // Clamp to prevent NaN due to floating point inaccuracies
    cosAngle = Math.max(-1, Math.min(1, cosAngle));

    const rad = Math.acos(cosAngle);
    return Number(((rad * 180) / Math.PI).toFixed(1));
  }, []);

  const handleCanvasTap = useCallback(
    (point: Point2D) => {
      if (activeTool === "pointer") return;

      if (activeTool === "line") {
        if (currentDraftPoints.length === 0) {
          setCurrentDraftPoints([point]);
        } else {
          const newAnnotation: AnnotationItem = {
            id: `line-${Date.now()}`,
            type: "line",
            points: [currentDraftPoints[0], point],
            color: selectedColor,
          };
          setAnnotations((prev) => [...prev, newAnnotation]);
          setCurrentDraftPoints([]);
        }
      } else if (activeTool === "angle") {
        const nextPoints = [...currentDraftPoints, point];
        if (nextPoints.length === 3) {
          const angleVal = calculateAngleDegrees(nextPoints[0], nextPoints[1], nextPoints[2]);
          const newAnnotation: AnnotationItem = {
            id: `angle-${Date.now()}`,
            type: "angle",
            points: nextPoints,
            color: selectedColor,
            label: `${angleVal.toFixed(1)}°`,
          };
          setAnnotations((prev) => [...prev, newAnnotation]);
          setCurrentDraftPoints([]);
        } else {
          setCurrentDraftPoints(nextPoints);
        }
      }
    },
    [activeTool, currentDraftPoints, selectedColor, calculateAngleDegrees],
  );

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const undoLastAnnotation = useCallback(() => {
    if (currentDraftPoints.length > 0) {
      setCurrentDraftPoints([]);
      return;
    }
    setAnnotations((prev) => prev.slice(0, -1));
  }, [currentDraftPoints]);

  const clearAllAnnotations = useCallback(() => {
    setAnnotations([]);
    setCurrentDraftPoints([]);
  }, []);

  return {
    activeTool,
    setActiveTool,
    annotations,
    setAnnotations,
    currentDraftPoints,
    setCurrentDraftPoints,
    selectedColor,
    setSelectedColor,
    handleCanvasTap,
    removeAnnotation,
    undoLastAnnotation,
    clearAllAnnotations,
    calculateAngleDegrees,
  };
}
