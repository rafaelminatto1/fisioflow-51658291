/**
 * PoseFeedbackOverlay - Overlay Visual de Detecção de Pose (Mobile)
 * 
 * Versão React Native usando SVG para desenhar o esqueleto sobre a câmera.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { PoseLandmark, JointAngle, MainJoint } from '../../types/pose';

interface PoseFeedbackOverlayProps {
  landmarks: PoseLandmark[];
  jointAngles?: Map<MainJoint, JointAngle>;
  width: number;
  height: number;
  showSkeleton?: boolean;
}

const POSE_CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24], // Torso
  [11, 13], [13, 15], // Braço esquerdo
  [12, 14], [14, 16], // Braço direito
  [23, 25], [25, 27], [27, 29], [27, 31], // Perna esquerda
  [24, 26], [26, 28], [28, 30], [28, 32], // Perna direita
];

export const PoseFeedbackOverlay: React.FC<PoseFeedbackOverlayProps> = ({
  landmarks,
  jointAngles,
  width,
  height,
  showSkeleton = true
}) => {
  if (!landmarks || landmarks.length === 0 || !showSkeleton) return null;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
        {/* Desenhar Conexões */}
        {POSE_CONNECTIONS.map(([start, end], index) => {
          const p1 = landmarks[start];
          const p2 = landmarks[end];
          
          if (!p1 || !p2 || p1.visibility < 0.5 || p2.visibility < 0.5) return null;

          return (
            <Line
              key={`conn-${index}`}
              x1={p1.x * width}
              y1={p1.y * height}
              x2={p2.x * width}
              y2={p2.y * height}
              stroke="#00FF00"
              strokeWidth="2"
            />
          );
        })}

        {/* Desenhar Ângulos */}
        {jointAngles && Array.from(jointAngles.values()).map((angle, index) => {
          const pivot = landmarks[angle.pivotIndex];
          if (!pivot || pivot.visibility < 0.5) return null;

          return (
            <SvgText
              key={`angle-${index}`}
              x={pivot.x * width + 10}
              y={pivot.y * height - 10}
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="bold"
              stroke="#000000"
              strokeWidth="0.5"
            >
              {Math.round(angle.current)}°
            </SvgText>
          );
        })}

        {/* Desenhar Pontos */}
        {landmarks.map((lm, index) => {
          if (lm.visibility < 0.5) return null;
          return (
            <Circle
              key={`lm-${index}`}
              cx={lm.x * width}
              cy={lm.y * height}
              r="4"
              fill="#FF0000"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  }
});
