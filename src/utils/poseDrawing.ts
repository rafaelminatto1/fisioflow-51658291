/**
 * Custom pose drawing utilities
 *
 * This module provides canvas drawing functions for pose landmarks,
 * replacing @mediapipe/drawing_utils which is web-only.
 *
 * For web: Uses HTML Canvas API
 * For iOS: Could be adapted to use react-native-svg or similar
 */

import type { PoseLandmark } from '@/services/ai/pose/types';

// MediaPipe BlazePose landmark connections (33 landmarks)
export const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
];

// Color scheme for different body parts
const LANDMARK_COLORS = {
  face: '#FF9696',
  leftArm: '#FF4D4D',
  rightArm: '#FF4D4D',
  leftLeg: '#4DFF4D',
  rightLeg: '#4DFF4D',
  torso: '#4D4DFF',
};

// Connection colors based on landmark indices
const getConnectionColor = (index1: number, index2: number): string => {
  // Face connections (0-10)
  if (index1 <= 10 && index2 <= 10) return LANDMARK_COLORS.face;
  // Left arm (11, 13, 15)
  if ([11, 13, 15].includes(index1) || [11, 13, 15].includes(index2)) return LANDMARK_COLORS.leftArm;
  // Right arm (12, 14, 16)
  if ([12, 14, 16].includes(index1) || [12, 14, 16].includes(index2)) return LANDMARK_COLORS.rightArm;
  // Left leg (23, 25, 27)
  if ([23, 25, 27].includes(index1) || [23, 25, 27].includes(index2)) return LANDMARK_COLORS.leftLeg;
  // Right leg (24, 26, 28)
  if ([24, 26, 28].includes(index1) || [24, 26, 28].includes(index2)) return LANDMARK_COLORS.rightLeg;
  // Torso
  return LANDMARK_COLORS.torso;
};

/**
 * Draw landmark connections (lines between landmarks)
 *
 * @param ctx - Canvas 2D context
 * @param landmarks - Array of pose landmarks (33 landmarks)
 * @param options - Drawing options
 */
export function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  options: {
    color?: string;
    lineWidth?: number;
    width?: number;
    height?: number;
  } = {}
): void {
  const { color, lineWidth = 2, width = 1, height = 1 } = options;

  ctx.save();
  ctx.lineWidth = lineWidth;

  for (const [index1, index2] of POSE_CONNECTIONS) {
    const landmark1 = landmarks[index1];
    const landmark2 = landmarks[index2];

    // Check if both landmarks are visible enough
    if (landmark1 && landmark2 &&
        landmark1.visibility > 0.3 &&
        landmark2.visibility > 0.3) {
      ctx.beginPath();
      ctx.strokeStyle = color || getConnectionColor(index1, index2);
      ctx.moveTo(landmark1.x * width, landmark1.y * height);
      ctx.lineTo(landmark2.x * width, landmark2.y * height);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw individual landmarks (points)
 *
 * @param ctx - Canvas 2D context
 * @param landmarks - Array of pose landmarks (33 landmarks)
 * @param options - Drawing options
 */
export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  options: {
    color?: string;
    fillColor?: string;
    radius?: number | ((data: { from?: { z: number } }) => number);
    lineWidth?: number;
    width?: number;
    height?: number;
  } = {}
): void {
  const {
    color = '#FF0000',
    fillColor = '#00FF00',
    radius = 3,
    lineWidth = 1,
    width = 1,
    height = 1
  } = options;

  ctx.save();
  ctx.lineWidth = lineWidth;

  for (let i = 0; i < landmarks.length; i++) {
    const landmark = landmarks[i];

    // Only draw visible landmarks
    if (landmark && landmark.visibility > 0.3) {
      const x = landmark.x * width;
      const y = landmark.y * height;

      // Calculate radius based on Z depth if function provided
      const r = typeof radius === 'function'
        ? radius({ from: { z: landmark.z } })
        : radius;

      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, r), 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw pose skeleton with both connections and landmarks
 *
 * @param ctx - Canvas 2D context
 * @param landmarks - Array of pose landmarks (33 landmarks)
 * @param options - Drawing options
 */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  options: {
    connectionColor?: string;
    connectionWidth?: number;
    landmarkColor?: string;
    landmarkFillColor?: string;
    landmarkRadius?: number;
    width?: number;
    height?: number;
  } = {}
): void {
  const { width, height } = options;

  drawConnectors(ctx, landmarks, {
    color: options.connectionColor,
    lineWidth: options.connectionWidth,
    width,
    height,
  });

  drawLandmarks(ctx, landmarks, {
    color: options.landmarkColor,
    fillColor: options.landmarkFillColor,
    radius: options.landmarkRadius,
    width,
    height,
  });
}

/**
 * Linear interpolation for calculating landmark size based on depth
 *
 * @param x - Value to interpolate
 * @param min - Minimum value
 * @param max - Maximum value
 * @param newMin - New minimum
 * @param newMax - New maximum
 * @returns Interpolated value
 */
export function lerp(
  x: number,
  min: number,
  max: number,
  newMin: number,
  newMax: number
): number {
  return ((x - min) * (newMax - newMin)) / (max - min) + newMin;
}

/**
 * Calculate landmark radius based on Z depth (for 3D effect)
 *
 * @param z - Z coordinate (depth)
 * @returns Calculated radius
 */
export function calculateRadiusFromDepth(z: number): number {
  return Math.max(1, lerp(z, -0.15, 0.1, 5, 1));
}

/**
 * Get landmark name by index
 */
export const LANDMARK_NAMES: string[] = [
  'nose',
  'left_eye_inner', 'left_eye', 'left_eye_outer',
  'right_eye_inner', 'right_eye', 'right_eye_outer',
  'left_ear', 'right_ear',
  'mouth_left', 'mouth_right',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_pinky', 'right_pinky',
  'left_index', 'right_index',
  'left_thumb', 'right_thumb',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle',
  'left_heel', 'right_heel',
  'left_foot_index', 'right_foot_index',
];
