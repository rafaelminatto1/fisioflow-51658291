import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Line, G, Text as SvgText } from "react-native-svg";

export type AnnotationType = 'line' | 'angle' | 'point';

export interface Annotation {
  id: string;
  type: AnnotationType;
  points: { x: number; y: number }[];
  color: string;
}

interface MeasurementLayerProps {
  annotations: Annotation[];
}

function calculateAngle(p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}) {
  const a = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
  const b = Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2);
  const c = Math.pow(p3.x - p1.x, 2) + Math.pow(p3.y - p1.y, 2);
  const angle = Math.acos((a + b - c) / Math.sqrt(4 * a * b)) * (180 / Math.PI);
  return isNaN(angle) ? 0 : angle;
}

export function MeasurementLayer({ annotations }: MeasurementLayerProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="measurement-layer">
      <Svg height="100%" width="100%">
        {annotations.map((annotation) => {
          if (annotation.type === 'line' && annotation.points.length >= 2) {
            const [p1, p2] = annotation.points;
            return (
              <G key={annotation.id}>
                <Line
                  testID={`annotation-line-${annotation.id}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={annotation.color}
                  strokeWidth={3}
                />
              </G>
            );
          }
          if (annotation.type === 'angle' && annotation.points.length >= 3) {
            const [p1, p2, p3] = annotation.points;
            const angle = calculateAngle(p1, p2, p3);
            return (
              <G key={annotation.id}>
                <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={annotation.color} strokeWidth={3} />
                <Line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke={annotation.color} strokeWidth={3} />
                <SvgText
                  testID={`annotation-angle-text-${annotation.id}`}
                  x={p2.x + 10}
                  y={p2.y - 10}
                  fill={annotation.color}
                  fontSize="16"
                  fontWeight="bold"
                >
                  {`${angle.toFixed(1)}°`}
                </SvgText>
              </G>
            );
          }
          return null;
        })}
      </Svg>
    </View>
  );
}
