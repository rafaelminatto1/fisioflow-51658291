import React from 'react';
import { Group, Arc, Text, Line } from 'react-konva';
import { JointAngle } from '../../../types/biomechanics';

interface AutoAngleOverlayProps {
	angles: JointAngle[];
}

export const AutoAngleOverlay: React.FC<AutoAngleOverlayProps> = ({ angles }) => {
	return (
		<Group>
			{angles.map((angle, i) => {
				const startAngle = Math.atan2(angle.p1.y - angle.center.y, angle.p1.x - angle.center.x) * (180 / Math.PI);
				

				return (
					<Group key={angle.name + i}>
						{/* Visual Arc */}
						<Arc
							x={angle.center.x}
							y={angle.center.y}
							innerRadius={20}
							outerRadius={25}
							angle={angle.value}
							rotation={startAngle}
							fill={angle.color}
							opacity={0.6}
						/>
						
						{/* Label / Value */}
						<Group x={angle.center.x + 30} y={angle.center.y - 30}>
							<Line
								points={[0, 0, -10, 10]}
								stroke={angle.color}
								strokeWidth={1}
								opacity={0.5}
							/>
							<Text
								text={`${angle.label}: ${angle.value.toFixed(1)}°`}
								fontSize={12}
								fontStyle="bold"
								fill="white"
								shadowColor="black"
								shadowBlur={4}
								listening={false}
							/>
						</Group>
					</Group>
				);
			})}
		</Group>
	);
};
