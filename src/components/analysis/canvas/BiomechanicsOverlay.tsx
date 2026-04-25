import React, { useEffect, useRef } from "react";
import { UnifiedLandmark, calculateAngle } from "@/utils/geometry";

interface BiomechanicsOverlayProps {
  landmarks: UnifiedLandmark[];
  width: number;
  height: number;
  showGrid?: boolean;
  showSkeleton?: boolean;
  showAngles?: boolean;
  showSilhouette?: boolean;
  silhouetteType?: "front" | "side" | "back";
  showPlumbLine?: boolean;
  highlightPoints?: string[];
  opacity?: number;
}

export const POSE_CONNECTIONS = [
  [11, 12], // Shoulders
  [11, 13],
  [13, 15], // Left arm
  [12, 14],
  [14, 16], // Right arm
  [11, 23],
  [12, 24], // Torso sides
  [23, 24], // Hips
  [23, 25],
  [25, 27], // Left leg
  [24, 26],
  [26, 28], // Right leg
  [27, 29],
  [29, 31],
  [27, 31], // Left foot
  [28, 30],
  [30, 32],
  [28, 32], // Right foot
];

export const BiomechanicsOverlay: React.FC<BiomechanicsOverlayProps> = ({
  landmarks,
  width,
  height,
  showGrid = false,
  showSkeleton = true,
  showAngles = true,
  showSilhouette = false,
  silhouetteType = "front",
  showPlumbLine = true,
  highlightPoints = [],
  opacity = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = opacity;

    // 1. Draw Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 0.5;
      const step = 40;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // 2. Draw Plumb Line
    if (showPlumbLine) {
      ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Silhouette Guide
    if (showSilhouette) {
      drawSilhouette(ctx, width, height, silhouetteType);
    }

    // 4. Draw Skeleton and Landmarks
    if (landmarks && landmarks.length > 0) {
      // Draw Connections
      if (showSkeleton) {
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";

        POSE_CONNECTIONS.forEach(([i1, i2]) => {
          const p1 = landmarks[i1];
          const p2 = landmarks[i2];

          if (p1 && p2 && (p1.confidence || 0) > 0.4 && (p2.confidence || 0) > 0.4) {
            ctx.beginPath();
            ctx.moveTo(p1.x * width, p1.y * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.stroke();
          }
        });
      }

      // Draw Landmarks
      landmarks.forEach((lm, i) => {
        if ((lm.confidence || 0) < 0.3) return;

        const x = lm.x * width;
        const y = lm.y * height;

        const isHighlighted = highlightPoints.includes(i.toString());

        ctx.fillStyle = isHighlighted ? "#FF0000" : "#00FF00";
        ctx.beginPath();
        ctx.arc(x, y, isHighlighted ? 6 : 4, 0, 2 * Math.PI);
        ctx.fill();

        // White outline
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // 5. Draw Angles
      if (showAngles) {
        drawAngleOverlay(ctx, landmarks, width, height, silhouetteType);
      }
    }
  }, [
    landmarks,
    width,
    height,
    showGrid,
    showSkeleton,
    showAngles,
    showSilhouette,
    silhouetteType,
    showPlumbLine,
    highlightPoints,
    opacity,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  );
};

function drawSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number, _type: string) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);

  // Simple SVG-like path for human silhouette guide
  const centerX = w / 2;
  const headRadius = h * 0.05;
  const shoulderWidth = w * 0.25;
  ctx.beginPath();
  // Head
  ctx.arc(centerX, h * 0.15, headRadius, 0, Math.PI * 2);

  // Shoulders
  ctx.moveTo(centerX - shoulderWidth / 2, h * 0.25);
  ctx.lineTo(centerX + shoulderWidth / 2, h * 0.25);

  // Torso
  ctx.moveTo(centerX - shoulderWidth / 2.2, h * 0.25);
  ctx.lineTo(centerX - shoulderWidth / 2.5, h * 0.55);
  ctx.lineTo(centerX + shoulderWidth / 2.5, h * 0.55);
  ctx.lineTo(centerX + shoulderWidth / 2.2, h * 0.25);

  // Legs
  ctx.moveTo(centerX - shoulderWidth / 3, h * 0.55);
  ctx.lineTo(centerX - shoulderWidth / 3, h * 0.95);
  ctx.moveTo(centerX + shoulderWidth / 3, h * 0.55);
  ctx.lineTo(centerX + shoulderWidth / 3, h * 0.95);

  ctx.stroke();
  ctx.restore();
}

function drawAngleOverlay(
  ctx: CanvasRenderingContext2D,
  lms: UnifiedLandmark[],
  w: number,
  h: number,
  type: string,
) {
  ctx.save();
  ctx.fillStyle = "white";
  ctx.font = "bold 14px Inter";
  ctx.textAlign = "center";

  const drawAngle = (p1: number, p2: number, p3: number, label: string) => {
    const a = lms[p1],
      b = lms[p2],
      c = lms[p3];
    if (a && b && c && a.confidence > 0.5 && b.confidence > 0.5 && c.confidence > 0.5) {
      const angle = calculateAngle(a, b, c);
      const x = b.x * w;
      const y = b.y * h;

      // Box background for text
      const text = `${label}: ${angle.toFixed(1)}°`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x - textWidth / 2 - 5, y - 25, textWidth + 10, 20);

      ctx.fillStyle = "white";
      ctx.fillText(text, x, y - 10);
    }
  };

  if (type === "front" || type === "back") {
    drawAngle(11, 13, 15, "Cotovelo E");
    drawAngle(12, 14, 16, "Cotovelo D");
    drawAngle(23, 25, 27, "Joelho E");
    drawAngle(24, 26, 28, "Joelho D");
  } else if (type === "side") {
    // Side view angles
    drawAngle(11, 23, 25, "Tronco");
    drawAngle(23, 25, 27, "Joelho");
  }

  ctx.restore();
}
