import React, { useEffect, useRef } from "react";
import { Point2D, calculateAngle, POSE_LANDMARKS } from "@/utils/geometry";

interface BioVisionOverlayProps {
  landmarks: any[];
  width: number;
  height: number;
  activeJoint?: string;
  onPeakAngle?: (angle: number) => void;
  showSkeleton?: boolean;
}

export const CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

export const BioVisionOverlay: React.FC<BioVisionOverlayProps> = ({
  landmarks,
  width,
  height,
  activeJoint,
  onPeakAngle,
  showSkeleton = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peakRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    if (!landmarks || landmarks.length === 0) return;

    // 1. Draw Skeleton
    if (showSkeleton) {
      ctx.strokeStyle = "rgba(139, 92, 246, 0.4)"; // Violet transparent
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";

      CONNECTIONS.forEach(([i1, i2]) => {
        const p1 = landmarks[i1];
        const p2 = landmarks[i2];
        if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
          ctx.stroke();
        }
      });

      // 2. Draw Points
      landmarks.forEach((lm, i) => {
        if (lm.visibility < 0.5 || i < 11) return;
        ctx.fillStyle = "#8b5cf6";
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // 3. Draw Active Angle with Geometric Precision
    if (activeJoint) {
      let p1Idx, p2Idx, p3Idx, label;

      switch (activeJoint) {
        case "knee_l":
          p1Idx = POSE_LANDMARKS.LEFT_HIP;
          p2Idx = POSE_LANDMARKS.LEFT_KNEE;
          p3Idx = POSE_LANDMARKS.LEFT_ANKLE;
          label = "Joelho E";
          break;
        case "knee_r":
          p1Idx = POSE_LANDMARKS.RIGHT_HIP;
          p2Idx = POSE_LANDMARKS.RIGHT_KNEE;
          p3Idx = POSE_LANDMARKS.RIGHT_ANKLE;
          label = "Joelho D";
          break;
        case "elbow_l":
          p1Idx = POSE_LANDMARKS.LEFT_SHOULDER;
          p2Idx = POSE_LANDMARKS.LEFT_ELBOW;
          p3Idx = POSE_LANDMARKS.LEFT_WRIST;
          label = "Cotovelo E";
          break;
        case "elbow_r":
          p1Idx = POSE_LANDMARKS.RIGHT_SHOULDER;
          p2Idx = POSE_LANDMARKS.RIGHT_ELBOW;
          p3Idx = POSE_LANDMARKS.RIGHT_WRIST;
          label = "Cotovelo D";
          break;
        case "shoulder_l":
          p1Idx = POSE_LANDMARKS.LEFT_HIP;
          p2Idx = POSE_LANDMARKS.LEFT_SHOULDER;
          p3Idx = POSE_LANDMARKS.LEFT_ELBOW;
          label = "Ombro E";
          break;
        case "shoulder_r":
          p1Idx = POSE_LANDMARKS.RIGHT_HIP;
          p2Idx = POSE_LANDMARKS.RIGHT_SHOULDER;
          p3Idx = POSE_LANDMARKS.RIGHT_ELBOW;
          label = "Ombro D";
          break;
      }

      if (p1Idx !== undefined && p2Idx !== undefined && p3Idx !== undefined) {
        const a = landmarks[p1Idx],
          b = landmarks[p2Idx],
          c = landmarks[p3Idx];
        if (a && b && c && a.visibility > 0.5 && b.visibility > 0.5 && c.visibility > 0.5) {
          const angle = calculateAngle(a, b, c);

          // Peak tracking
          if (angle > peakRef.current) {
            peakRef.current = angle;
            onPeakAngle?.(angle);
          }

          const bx = b.x * width;
          const by = b.y * height;
          const ax = a.x * width;
          const ay = a.y * height;
          const cx = c.x * width;
          const cy = c.y * height;

          // Calculate start and end angles for the arc
          const startAngle = Math.atan2(ay - by, ax - bx);
          const endAngle = Math.atan2(cy - by, cx - bx);

          // Draw Highlighted Bones
          ctx.strokeStyle = "#06b6d4"; // Cyan
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.lineTo(cx, cy);
          ctx.stroke();

          // Draw Arc
          ctx.beginPath();
          ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
          ctx.lineWidth = 15;
          ctx.arc(bx, by, 40, startAngle, endAngle);
          ctx.stroke();

          // Draw Vertex Point
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(bx, by, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = "#06b6d4";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw Label Dashboard Style
          ctx.save();
          ctx.translate(bx + 50, by - 20);

          // Background Label
          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.beginPath();
          ctx.roundRect(0, 0, 140, 40, 8);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.1)";
          ctx.stroke();

          // Text
          ctx.fillStyle = "#fff";
          ctx.font = "9px Inter black";
          ctx.fillText(label.toUpperCase(), 10, 15);
          ctx.fillStyle = "#06b6d4";
          ctx.font = "bold 18px Inter";
          ctx.fillText(`${angle.toFixed(1)}°`, 10, 34);

          ctx.restore();
        }
      }
    }
  }, [landmarks, width, height, activeJoint, onPeakAngle, showSkeleton]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-20"
    />
  );
};
