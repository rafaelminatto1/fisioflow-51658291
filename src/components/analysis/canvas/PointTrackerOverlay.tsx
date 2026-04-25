import React from "react";
import { Circle, Text, Group } from "react-konva";
import { Point } from "../../../types/biomechanics";

interface PointTrackerOverlayProps {
  trackedPoints: { id: string; pos: Point; active: boolean }[];
  onTogglePoint?: (id: string) => void;
}

export const PointTrackerOverlay: React.FC<PointTrackerOverlayProps> = ({
  trackedPoints,
  onTogglePoint,
}) => {
  return (
    <>
      {trackedPoints.map((point) => (
        <Group key={point.id} x={point.pos.x} y={point.pos.y}>
          <Circle
            radius={6}
            fill={point.active ? "#F59E0B" : "#94A3B8"} // Amber-500 or Slate-400
            stroke="white"
            strokeWidth={2}
            shadowBlur={5}
            onClick={() => onTogglePoint?.(point.id)}
          />
          <Text
            text="TRACKING"
            fontSize={8}
            fontStyle="bold"
            fill="white"
            y={8}
            x={-20}
            align="center"
            width={40}
          />
        </Group>
      ))}
    </>
  );
};
