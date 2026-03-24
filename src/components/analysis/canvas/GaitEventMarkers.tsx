import React from 'react';
import { Circle, Group } from 'react-konva';
import { GaitEvent } from '@/types/biomechanics';

interface GaitEventMarkersProps {
	events: GaitEvent[];
	timelineBaseX?: number;
	contactY?: number;
	toeOffY?: number;
	cycleFrames?: number;
}

export const GaitEventMarkers: React.FC<GaitEventMarkersProps> = ({
	events,
	timelineBaseX = 100,
	contactY = 560,
	toeOffY = 540,
	cycleFrames = 600
}) => {
	return (
		<Group>
			{events.map((ev, i) => (
				<Circle
					key={`gait-ev-${i}`}
					x={timelineBaseX + (ev.frame % cycleFrames)}
					y={ev.type === "contact" ? contactY : toeOffY}
					radius={6}
					opacity={0.9}
					fill={ev.side === "R" ? "#22c55e" : "#3b82f6"} // Right = green, Left = blue
				/>
			))}
		</Group>
	);
};
