import React, { useEffect, useRef } from "react";
import { Point2D, calculateAngle, POSE_LANDMARKS } from "@/utils/geometry";

interface BioVisionOverlayProps {
  landmarks: any[];
  width: number;
  height: number;
  activeJoint?: string;
  onPeakAngle?: (angle: number) => void;
}

export const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28]
];

export const BioVisionOverlay: React.FC<BioVisionOverlayProps> = ({
  landmarks,
  width,
  height,
  activeJoint,
  onPeakAngle
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peakRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks || landmarks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Skeleton
    ctx.strokeStyle = "rgba(139, 92, 246, 0.6)"; // Violet
    ctx.lineWidth = 3;
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
      if (lm.visibility < 0.5) return;
      ctx.fillStyle = i >= 11 ? "#8b5cf6" : "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 3. Draw Active Angle
    if (activeJoint) {
      let p1, p2, p3, label;
      
      switch(activeJoint) {
        case 'knee_l':
          p1 = POSE_LANDMARKS.LEFT_HIP; p2 = POSE_LANDMARKS.LEFT_KNEE; p3 = POSE_LANDMARKS.LEFT_ANKLE;
          label = "Joelho E";
          break;
        case 'knee_r':
          p1 = POSE_LANDMARKS.RIGHT_HIP; p2 = POSE_LANDMARKS.RIGHT_KNEE; p3 = POSE_LANDMARKS.RIGHT_ANKLE;
          label = "Joelho D";
          break;
        case 'elbow_l':
          p1 = POSE_LANDMARKS.LEFT_SHOULDER; p2 = POSE_LANDMARKS.LEFT_ELBOW; p3 = POSE_LANDMARKS.LEFT_WRIST;
          label = "Cotovelo E";
          break;
        case 'elbow_r':
          p1 = POSE_LANDMARKS.RIGHT_SHOULDER; p2 = POSE_LANDMARKS.RIGHT_ELBOW; p3 = POSE_LANDMARKS.RIGHT_WRIST;
          label = "Cotovelo D";
          break;
        case 'shoulder_l':
          p1 = POSE_LANDMARKS.LEFT_HIP; p2 = POSE_LANDMARKS.LEFT_SHOULDER; p3 = POSE_LANDMARKS.LEFT_ELBOW;
          label = "Ombro E";
          break;
        case 'shoulder_r':
          p1 = POSE_LANDMARKS.RIGHT_HIP; p2 = POSE_LANDMARKS.RIGHT_SHOULDER; p3 = POSE_LANDMARKS.RIGHT_ELBOW;
          label = "Ombro D";
          break;
      }

      if (p1 !== undefined && p2 !== undefined && p3 !== undefined) {
        const a = landmarks[p1], b = landmarks[p2], c = landmarks[p3];
        if (a && b && c && a.visibility > 0.5 && b.visibility > 0.5 && c.visibility > 0.5) {
          const angle = calculateAngle(a, b, c);
          
          // Peak tracking
          if (angle > peakRef.current) {
            peakRef.current = angle;
            onPeakAngle?.(angle);
          }

          const x = b.x * width;
          const y = b.y * height;

          // Draw Arc
          ctx.beginPath();
          ctx.strokeStyle = "#06b6d4"; // Cyan
          ctx.lineWidth = 5;
          ctx.arc(x, y, 40, 0, (angle * Math.PI) / 180);
          ctx.stroke();

          // Draw Label
          ctx.fillStyle = "#06b6d4";
          ctx.font = "bold 20px Inter";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "black";
          ctx.fillText(`${label}: ${angle.toFixed(1)}°`, x + 50, y);
          ctx.shadowBlur = 0;
        }
      }
    }
  }, [landmarks, width, height, activeJoint, onPeakAngle]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-20"
    />
  );
};
