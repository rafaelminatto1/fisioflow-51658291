import React from "react";
import { Group, Line, Circle, Text as KText } from "react-konva";
import { TrackedTraj } from "@/types/biomechanics";

interface TrajectoryLinesProps {
  trajectories: TrackedTraj[];
}

export const TrajectoryLines: React.FC<TrajectoryLinesProps> = ({ trajectories }) => {
  return (
    <Group>
      {trajectories.map((traj, ti) => {
        if (traj.points.length < 2) return null;
        const last = traj.points[traj.points.length - 1];
        return (
          <Group key={`traj-${ti}`}>
            <Line
              points={traj.points.flatMap((p) => [p.x, p.y])}
              stroke={traj.color}
              strokeWidth={2.5}
              tension={0.4}
              opacity={0.85}
              lineCap="round"
              lineJoin="round"
            />
            <Circle x={last.x} y={last.y} radius={8} fill={traj.color} opacity={0.9} />
            <Circle
              x={last.x}
              y={last.y}
              radius={14}
              stroke={traj.color}
              strokeWidth={1.5}
              opacity={0.4}
            />
            <KText
              x={last.x + 10}
              y={last.y - 18}
              text={traj.label}
              fontSize={11}
              fontStyle="bold"
              fill={traj.color}
              shadowColor="black"
              shadowBlur={4}
              shadowOpacity={0.8}
            />
          </Group>
        );
      })}
    </Group>
  );
};
