import React from "react";
import { Group, Line, Circle } from "react-konva";
type Keypoint = import("@tensorflow-models/pose-detection").Keypoint;

interface MoveNetSkeletonProps {
  poseKeypoints: Keypoint[] | null;
  canvasWidth?: number;
  canvasHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
  opacity?: number;
}

export const MoveNetSkeleton: React.FC<MoveNetSkeletonProps> = ({
  poseKeypoints,
  canvasWidth = 800,
  canvasHeight = 600,
  videoWidth = 640,
  videoHeight = 480,
  opacity = 0.85,
}) => {
  if (!poseKeypoints) return null;

  const conn = [
    [5, 6],
    [5, 7],
    [7, 9],
    [6, 8],
    [8, 10],
    [11, 12],
    [5, 11],
    [6, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [0, 5],
    [0, 6],
  ];

  return (
    <Group opacity={opacity}>
      {conn.map(([a, b], i) => {
        const pa = poseKeypoints[a];
        const pb = poseKeypoints[b];
        if (!pa || !pb || (pa.score ?? 0) < 0.4 || (pb.score ?? 0) < 0.4) return null;
        return (
          <Line
            key={`conn-${i}`}
            points={[
              (pa.x / videoWidth) * canvasWidth,
              (pa.y / videoHeight) * canvasHeight,
              (pb.x / videoWidth) * canvasWidth,
              (pb.y / videoHeight) * canvasHeight,
            ]}
            stroke={b >= 6 ? "#22c55e" : "#3b82f6"} // Right = green, Left = blue
            strokeWidth={3}
            lineCap="round"
          />
        );
      })}
      {poseKeypoints.map((kp, i) => {
        if ((kp?.score ?? 0) < 0.4) return null;
        return (
          <Circle
            key={`kp-${i}`}
            x={(kp.x / videoWidth) * canvasWidth}
            y={(kp.y / videoHeight) * canvasHeight}
            radius={5}
            fill={i >= 6 ? "#22c55e" : "#3b82f6"}
          />
        );
      })}
    </Group>
  );
};
