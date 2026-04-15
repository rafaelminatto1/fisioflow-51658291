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
  referenceLandmarks?: PoseLandmark[];
  jointAngles?: Map<MainJoint, JointAngle>;
  width: number;
  height: number;
  showSkeleton?: boolean;
}

const POSE_CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24], // Torso
  [11, 13], [13, 15], // Braço esquerdo
  [12, 14], [14, 16], // Braço direito
  [23, 25], [25, 27], // Perna esquerda
  [24, 26], [26, 28], // Perna direita
];

export const PoseFeedbackOverlay: React.FC<PoseFeedbackOverlayProps> = ({
  landmarks,
  referenceLandmarks,
  jointAngles,
  width,
  height,
  showSkeleton = true
}) => {
  if (!landmarks || landmarks.length === 0) return null;

  const jointAnglesMap = jointAngles ? Array.from(jointAngles.values()) : [];

  const calculateAccuracy = () => {
    if (!landmarks || !referenceLandmarks || referenceLandmarks.length === 0) return null;
    
    // Main body joints: 11-16 (arms), 23-28 (legs/torso)
    const trackedIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    let totalDist = 0;
    let count = 0;

    trackedIndices.forEach(idx => {
      const lm = landmarks[idx];
      const ref = referenceLandmarks[idx];
      if (lm && ref && lm.visibility > 0.5 && ref.visibility > 0.5) {
        // Euclidean distance in normalized space
        const dist = Math.sqrt(Math.pow(lm.x - ref.x, 2) + Math.pow(lm.y - ref.y, 2));
        totalDist += dist;
        count++;
      }
    });

    if (count === 0) return null;
    const avgDist = totalDist / count;
    // Normalize score: 0.1 average distance is ~80% accuracy, 0.2 is 60%, etc.
    // We use a sensitivity multiplier of 2.0
    return Math.max(0, Math.min(100, Math.round(100 * (1 - avgDist * 2.0))));
  };

  const accuracy = calculateAccuracy();

  const renderSkeleton = (points: PoseLandmark[], color: string, isGhost = false) => {
    const opacity = isGhost ? 0.3 : 1.0;
    const strokeWidth = isGhost ? 2 : 3;
    const circleRadius = isGhost ? 3 : 4;

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`} opacity={opacity}>
          {/* Desenhar Conexões */}
          {POSE_CONNECTIONS.map(([start, end], index) => {
            const p1 = points[start];
            const p2 = points[end];
            
            if (!p1 || !p2 || p1.visibility < 0.5 || p2.visibility < 0.5) return null;

            return (
              <Line
                key={`conn-${isGhost ? 'ghost-' : ''}${index}`}
                x1={p1.x * width}
                y1={p1.y * height}
                x2={p2.x * width}
                y2={p2.y * height}
                stroke={isGhost ? "#94A3B8" : color}
                strokeWidth={strokeWidth}
              />
            );
          })}

          {/* Desenhar Pontos */}
          {points.map((lm, index) => {
            if (!lm || lm.visibility < 0.5) return null;
            // Mostrar apenas articulações principais no fantasma
            if (isGhost && ![11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(index)) return null;
            
            return (
              <Circle
                key={`lm-${isGhost ? 'ghost-' : ''}${index}`}
                cx={lm.x * width}
                cy={lm.y * height}
                r={circleRadius}
                fill={isGhost ? "#94A3B8" : (index < 11 ? "#FF0000" : "#00FF00")} // Vermelho pra face, verde pra corpo
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {/* Primeiro o fantasma (referência) */}
      {referenceLandmarks && referenceLandmarks.length > 0 && renderSkeleton(referenceLandmarks, "#94A3B8", true)}

      {/* Depois o esqueleto real */}
      {showSkeleton && renderSkeleton(landmarks, "#00FF00")}

      {/* Camada de Ângulos e Score */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
          {accuracy !== null && (
            <SvgText
              x="20"
              y="50"
              fill={accuracy > 85 ? "#22C55E" : accuracy > 60 ? "#EAB308" : "#EF4444"}
              fontSize="24"
              fontWeight="bold"
              stroke="#000000"
              strokeWidth="0.5"
            >
              Precisão: {accuracy}%
            </SvgText>
          )}

          {jointAnglesMap.map((angle, index) => {
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
        </Svg>
      </View>
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
