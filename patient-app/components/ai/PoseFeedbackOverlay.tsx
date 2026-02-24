/**
 * PoseFeedbackOverlay - Overlay Visual de Detecção de Pose (Patient App)
 * 
 * Versão SVG para o app do paciente.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { PoseLandmark } from '../../types/ai/pose';

interface PoseFeedbackOverlayProps {
  landmarks: PoseLandmark[];
  width: number;
  height: number;
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
  width,
  height,
}) => {
  if (!landmarks || landmarks.length === 0) return null;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
        {POSE_CONNECTIONS.map(([start, end], index) => {
          const p1 = landmarks[start];
          const p2 = landmarks[end];
          if (!p1 || !p2 || p1.visibility < 0.5 || p2.visibility < 0.5) return null;
          return (
            <Line key={`c-${index}`} x1={p1.x * width} y1={p1.y * height} x2={p2.x * width} y2={p2.y * height} stroke="#00FF00" strokeWidth="3" />
          );
        })}
        {landmarks.map((lm, index) => {
          if (lm.visibility < 0.5) return null;
          return (
            <Circle key={`l-${index}`} cx={lm.x * width} cy={lm.y * height} r="5" fill="#FFF" stroke="#000" strokeWidth="1" />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0 }
});
