import React from "react";
import { Group, Line, Circle } from "react-konva";
import { Point } from "@/types/biomechanics";

interface GoniometerOverlayProps {
  points: Point[];
  onPointMove?: (index: number, newPos: Point) => void;
  strokeColor?: string;
}

export const GoniometerOverlay: React.FC<GoniometerOverlayProps> = ({
  points,
  onPointMove,
  strokeColor = "#ff00ff",
}) => {
  if (points.length !== 3) return null;

  return (
    <Group>
      <Line
        points={[points[1].x, points[1].y, points[0].x, points[0].y, points[2].x, points[2].y]}
        stroke={strokeColor}
        strokeWidth={3}
      />
      {points.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={8}
          fill={strokeColor}
          draggable={!!onPointMove}
          onDragMove={(e) => {
            if (onPointMove) {
              onPointMove(i, { x: e.target.x(), y: e.target.y() });
            }
          }}
        />
      ))}
    </Group>
  );
};
