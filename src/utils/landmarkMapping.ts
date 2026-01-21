/**
 * Landmark Mapping Utilities
 *
 * This module handles conversion between different pose detection landmark formats:
 * - MoveNet (17 keypoints) → MediaPipe (33 landmarks)
 * - MediaPipe (33 landmarks) → MoveNet (17 keypoints)
 *
 * MoveNet provides 17 keypoints while MediaPipe BlazePose provides 33 landmarks.
 * This module interpolates the additional landmarks needed for full compatibility.
 */

import type { PoseLandmark } from '../services/ai/pose/types';

/**
 * Raw landmark format from TFLite/MoveNet
 */
export interface MoveNetKeypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
}

/**
 * MediaPipe landmark with name
 */
export interface NamedLandmark extends PoseLandmark {
  name: string;
}

/**
 * Map MoveNet's 17 keypoints to MediaPipe's 33 landmarks
 *
 * MoveNet Lightning provides these 17 keypoints:
 * 0: nose, 1: left_eye, 2: right_eye, 3: left_shoulder, 4: right_shoulder,
 * 5: left_elbow, 6: right_elbow, 7: left_wrist, 8: right_wrist,
 * 9: left_hip, 10: right_hip, 11: left_knee, 12: right_knee,
 * 13: left_ankle, 14: right_ankle
 *
 * MediaPipe BlazePose provides 33 landmarks including:
 * - Face landmarks (eyes, ears, mouth)
 * - Hand landmarks (5 per hand)
 * - Full body keypoints
 *
 * @param moveNetLandmarks - Array of 17 MoveNet keypoints
 * @returns Array of 33 MediaPipe-compatible landmarks
 */
export function mapMoveNetToMediaPipe(
  moveNetLandmarks: MoveNetKeypoint[]
): PoseLandmark[] {
  if (moveNetLandmarks.length !== 17) {
    console.warn(
      `Expected 17 MoveNet landmarks, got ${moveNetLandmarks.length}. Mapping may be inaccurate.`
    );
  }

  const mapped: PoseLandmark[] = Array(33).fill(null).map(() => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0,
  }));

  // Direct mappings (indices match between MoveNet and MediaPipe for these)
  const directMappings: Array<{ from: number; to: number }> = [
    { from: 0, to: 0 }, // nose → nose
    { from: 1, to: 2 }, // left_eye → left_eye
    { from: 2, to: 5 }, // right_eye → right_eye
    { from: 3, to: 11 }, // left_shoulder → left_shoulder
    { from: 4, to: 12 }, // right_shoulder → right_shoulder
    { from: 5, to: 13 }, // left_elbow → left_elbow
    { from: 6, to: 14 }, // right_elbow → right_elbow
    { from: 7, to: 15 }, // left_wrist → left_wrist
    { from: 8, to: 16 }, // right_wrist → right_wrist
    { from: 9, to: 23 }, // left_hip → left_hip
    { from: 10, to: 24 }, // right_hip → right_hip
    { from: 11, to: 25 }, // left_knee → left_knee
    { from: 12, to: 26 }, // right_knee → right_knee
    { from: 13, to: 27 }, // left_ankle → left_ankle
    { from: 14, to: 28 }, // right_ankle → right_ankle
  ];

  for (const mapping of directMappings) {
    const from = moveNetLandmarks[mapping.from];
    if (from) {
      mapped[mapping.to] = {
        x: from.x,
        y: from.y,
        z: from.z ?? 0,
        visibility: from.score ?? 0.5,
      };
    }
  }

  // Interpolate face landmarks (1-10) from nose and eyes
  interpolateFaceLandmarks(mapped, moveNetLandmarks);

  // Interpolate hand landmarks (17-22, 19-30) from arm keypoints
  interpolateHandLandmarks(mapped, moveNetLandmarks);

  // Interpolate foot landmarks (29-32) from ankles
  interpolateFootLandmarks(mapped, moveNetLandmarks);

  return mapped;
}

/**
 * Interpolate face landmarks from nose and eyes
 *
 * Generates: left_eye_inner, left_eye_outer, right_eye_inner, right_eye_outer,
 * left_ear, right_ear, mouth_left, mouth_right
 */
function interpolateFaceLandmarks(
  mapped: PoseLandmark[],
  moveNet: MoveNetKeypoint[]
): void {
  const nose = moveNet[0];
  const leftEye = moveNet[1];
  const rightEye = moveNet[2];

  if (!nose || !leftEye || !rightEye) return;

  // Left eye inner/outer (based on left eye position)
  mapped[1] = offsetLandmark(leftEye, -0.02, 0, leftEye.score ?? 0.5);
  mapped[3] = offsetLandmark(leftEye, 0.02, 0, leftEye.score ?? 0.5);

  // Right eye inner/outer
  mapped[4] = offsetLandmark(rightEye, -0.02, 0, rightEye.score ?? 0.5);
  mapped[6] = offsetLandmark(rightEye, 0.02, 0, rightEye.score ?? 0.5);

  // Ears (estimated from eye position)
  mapped[7] = offsetLandmark(leftEye, -0.08, 0, (leftEye.score ?? 0.5) * 0.7);
  mapped[8] = offsetLandmark(rightEye, 0.08, 0, (rightEye.score ?? 0.5) * 0.7);

  // Mouth corners (estimated from nose position)
  const mouthWidth = 0.03;
  mapped[9] = offsetLandmark(nose, -mouthWidth, 0.08, nose.score ?? 0.4);
  mapped[10] = offsetLandmark(nose, mouthWidth, 0.08, nose.score ?? 0.4);
}

/**
 * Interpolate hand landmarks from arm keypoints
 *
 * Generates: pinky, index, thumb for each hand
 */
function interpolateHandLandmarks(
  mapped: PoseLandmark[],
  moveNet: MoveNetKeypoint[]
): void {
  // Left hand (landmarks 17-22)
  const leftShoulder = moveNet[3];
  const leftElbow = moveNet[5];
  const leftWrist = moveNet[7];

  if (leftWrist && leftElbow && leftShoulder) {
    const handDirection = getDirection(leftElbow, leftWrist);
    const wristScore = leftWrist.score ?? 0.5;

    // Left pinky (17)
    mapped[17] = offsetLandmark(
      leftWrist,
      -handDirection.x * 0.03,
      -handDirection.y * 0.03,
      wristScore * 0.8
    );

    // Left index (19)
    mapped[19] = offsetLandmark(
      leftWrist,
      handDirection.x * 0.04,
      -handDirection.y * 0.04,
      wristScore * 0.8
    );

    // Left thumb (21)
    mapped[21] = offsetLandmark(
      leftWrist,
      -handDirection.x * 0.02,
      handDirection.y * 0.02,
      wristScore * 0.7
    );
  }

  // Right hand (landmarks 18, 20, 22)
  const rightShoulder = moveNet[4];
  const rightElbow = moveNet[6];
  const rightWrist = moveNet[8];

  if (rightWrist && rightElbow && rightShoulder) {
    const handDirection = getDirection(rightElbow, rightWrist);
    const wristScore = rightWrist.score ?? 0.5;

    // Right pinky (18)
    mapped[18] = offsetLandmark(
      rightWrist,
      handDirection.x * 0.03,
      -handDirection.y * 0.03,
      wristScore * 0.8
    );

    // Right index (20)
    mapped[20] = offsetLandmark(
      rightWrist,
      -handDirection.x * 0.04,
      -handDirection.y * 0.04,
      wristScore * 0.8
    );

    // Right thumb (22)
    mapped[22] = offsetLandmark(
      rightWrist,
      handDirection.x * 0.02,
      handDirection.y * 0.02,
      wristScore * 0.7
    );
  }
}

/**
 * Interpolate foot landmarks from ankles
 *
 * Generates: heel and foot_index for each foot
 */
function interpolateFootLandmarks(
  mapped: PoseLandmark[],
  moveNet: MoveNetKeypoint[]
): void {
  const leftAnkle = moveNet[13];
  const rightAnkle = moveNet[14];
  const leftKnee = moveNet[11];
  const rightKnee = moveNet[12];

  // Left foot (29-31)
  if (leftAnkle && leftKnee) {
    const legDirection = getDirection(leftKnee, leftAnkle);
    const ankleScore = leftAnkle.score ?? 0.5;

    // Left heel (29)
    mapped[29] = offsetLandmark(
      leftAnkle,
      legDirection.x * 0.05,
      0,
      ankleScore * 0.7
    );

    // Left foot index (31)
    mapped[31] = offsetLandmark(
      leftAnkle,
      -legDirection.x * 0.05,
      legDirection.y * 0.03,
      ankleScore * 0.7
    );
  }

  // Right foot (30, 32)
  if (rightAnkle && rightKnee) {
    const legDirection = getDirection(rightKnee, rightAnkle);
    const ankleScore = rightAnkle.score ?? 0.5;

    // Right heel (30)
    mapped[30] = offsetLandmark(
      rightAnkle,
      -legDirection.x * 0.05,
      0,
      ankleScore * 0.7
    );

    // Right foot index (32)
    mapped[32] = offsetLandmark(
      rightAnkle,
      legDirection.x * 0.05,
      legDirection.y * 0.03,
      ankleScore * 0.7
    );
  }
}

/**
 * Get direction vector from point A to point B
 */
function getDirection(
  from: MoveNetKeypoint,
  to: MoveNetKeypoint
): { x: number; y: number } {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
  };
}

/**
 * Create a new landmark offset from the original
 */
function offsetLandmark(
  original: MoveNetKeypoint,
  offsetX: number,
  offsetY: number,
  visibility: number
): PoseLandmark {
  return {
    x: Math.max(0, Math.min(1, original.x + offsetX)),
    y: Math.max(0, Math.min(1, original.y + offsetY)),
    z: original.z ?? 0,
    visibility,
  };
}

/**
 * Convert MediaPipe landmarks back to MoveNet format
 *
 * This is useful for saving space or sending data to services
 * that only understand MoveNet format.
 *
 * @param mediaPipeLandmarks - Array of 33 MediaPipe landmarks
 * @returns Array of 17 MoveNet keypoints
 */
export function mapMediaPipeToMoveNet(
  mediaPipeLandmarks: PoseLandmark[]
): MoveNetKeypoint[] {
  const moveNetKeypoints: MoveNetKeypoint[] = [];

  // Mapping from MediaPipe indices to MoveNet indices
  const mapping: number[] = [0, 2, 5, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

  for (const mpIndex of mapping) {
    const landmark = mediaPipeLandmarks[mpIndex];
    if (landmark) {
      moveNetKeypoints.push({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        score: landmark.visibility,
      });
    } else {
      // Insert placeholder if landmark missing
      moveNetKeypoints.push({ x: 0, y: 0, z: 0, score: 0 });
    }
  }

  return moveNetKeypoints;
}

/**
 * Normalize landmarks to a specific image size
 *
 * @param landmarks - Normalized landmarks (0-1)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Landmarks with pixel coordinates
 */
export function normalizeLandmarksToPixels(
  landmarks: PoseLandmark[],
  width: number,
  height: number
): Array<{ x: number; y: number; z: number; visibility: number }> {
  return landmarks.map((lm) => ({
    x: lm.x * width,
    y: lm.y * height,
    z: lm.z,
    visibility: lm.visibility,
  }));
}

/**
 * Denormalize landmarks from pixel coordinates
 *
 * @param landmarks - Landmarks with pixel coordinates
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Normalized landmarks (0-1)
 */
export function denormalizeLandmarks(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
  width: number,
  height: number
): PoseLandmark[] {
  return landmarks.map((lm) => ({
    x: lm.x / width,
    y: lm.y / height,
    z: lm.z ?? 0,
    visibility: lm.visibility ?? 1,
  }));
}

/**
 * Filter landmarks by visibility threshold
 *
 * @param landmarks - Array of landmarks
 * @param threshold - Minimum visibility (0-1)
 * @returns Filtered landmarks
 */
export function filterLandmarksByVisibility(
  landmarks: PoseLandmark[],
  threshold: number = 0.5
): PoseLandmark[] {
  return landmarks.filter((lm) => lm.visibility >= threshold);
}

/**
 * Calculate centroid of landmarks
 *
 * @param landmarks - Array of landmarks
 * @returns Centroid point {x, y}
 */
export function calculateLandmarkCentroid(
  landmarks: PoseLandmark[]
): { x: number; y: number } {
  if (landmarks.length === 0) {
    return { x: 0.5, y: 0.5 };
  }

  const sum = landmarks.reduce(
    (acc, lm) => ({ x: acc.x + lm.x, y: acc.y + lm.y }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / landmarks.length,
    y: sum.y / landmarks.length,
  };
}

/**
 * Scale landmarks relative to a center point
 *
 * @param landmarks - Array of landmarks
 * @param center - Center point to scale from
 * @param scaleX - X scale factor
 * @param scaleY - Y scale factor
 * @returns Scaled landmarks
 */
export function scaleLandmarks(
  landmarks: PoseLandmark[],
  center: { x: number; y: number },
  scaleX: number,
  scaleY: number
): PoseLandmark[] {
  return landmarks.map((lm) => ({
    x: center.x + (lm.x - center.x) * scaleX,
    y: center.y + (lm.y - center.y) * scaleY,
    z: lm.z,
    visibility: lm.visibility,
  }));
}

/**
 * Get landmark names for MediaPipe 33 landmarks
 */
export const MEDIAPIPE_LANDMARK_NAMES: string[] = [
  'nose',
  'left_eye_inner',
  'left_eye',
  'left_eye_outer',
  'right_eye_inner',
  'right_eye',
  'right_eye_outer',
  'left_ear',
  'right_ear',
  'mouth_left',
  'mouth_right',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_pinky',
  'right_pinky',
  'left_index',
  'right_index',
  'left_thumb',
  'right_thumb',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_heel',
  'right_heel',
  'left_foot_index',
  'right_foot_index',
];

/**
 * Get landmark name by index
 */
export function getLandmarkName(index: number): string {
  return MEDIAPIPE_LANDMARK_NAMES[index] ?? `unknown_${index}`;
}

/**
 * Find landmark by name
 */
export function findLandmarkByName(
  landmarks: PoseLandmark[],
  name: string
): PoseLandmark | undefined {
  const index = MEDIAPIPE_LANDMARK_NAMES.indexOf(name);
  if (index === -1) return undefined;
  return landmarks[index];
}
