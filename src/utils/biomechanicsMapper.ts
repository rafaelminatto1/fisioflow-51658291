/**
 * Biomechanics Mapper - Unifies landmarks from different providers (MediaPipe, Vision Framework)
 */

export interface UnifiedLandmark {
  name: string;
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export const CLINICAL_LANDMARKS = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
] as const;

export type ClinicalLandmarkName = typeof CLINICAL_LANDMARKS[number];

/**
 * Maps MediaPipe (33 points) to Clinical Unified points
 */
export function mapMediaPipeToClinical(landmarks: any[]): Record<ClinicalLandmarkName, UnifiedLandmark> {
  const mapping: Partial<Record<ClinicalLandmarkName, UnifiedLandmark>> = {};
  
  const mpIndices: Record<string, number> = {
    nose: 0, left_eye: 2, right_eye: 5, left_ear: 7, right_ear: 8,
    left_shoulder: 11, right_shoulder: 12, left_elbow: 13, right_elbow: 14,
    left_wrist: 15, right_wrist: 16, left_hip: 23, right_hip: 24,
    left_knee: 25, right_knee: 26, left_ankle: 27, right_ankle: 28
  };

  for (const [name, index] of Object.entries(mpIndices)) {
    const lm = landmarks[index];
    if (lm) {
      mapping[name as ClinicalLandmarkName] = {
        name,
        x: lm.x,
        y: lm.y,
        z: lm.z,
        confidence: lm.visibility || lm.presence || 1.0
      };
    }
  }

  return mapping as Record<ClinicalLandmarkName, UnifiedLandmark>;
}

/**
 * Maps Apple Vision Framework (19 points) to Clinical Unified points
 */
export function mapVisionToClinical(landmarks: Record<string, any>): Record<ClinicalLandmarkName, UnifiedLandmark> {
  const mapping: Partial<Record<ClinicalLandmarkName, UnifiedLandmark>> = {};
  
  // Vision names (VNHumanBodyPoseObservation.JointName)
  const visionMapping: Record<string, ClinicalLandmarkName> = {
    'nose': 'nose',
    'left_eye': 'left_eye',
    'right_eye': 'right_eye',
    'left_ear': 'left_ear',
    'right_ear': 'right_ear',
    'left_shoulder_joint': 'left_shoulder',
    'right_shoulder_joint': 'right_shoulder',
    'left_elbow_joint': 'left_elbow',
    'right_elbow_joint': 'right_elbow',
    'left_wrist_joint': 'left_wrist',
    'right_wrist_joint': 'right_wrist',
    'left_hip_joint': 'left_hip',
    'right_hip_joint': 'right_hip',
    'left_knee_joint': 'left_knee',
    'right_knee_joint': 'right_knee',
    'left_ankle_joint': 'left_ankle',
    'right_ankle_joint': 'right_ankle'
  };

  for (const [visionKey, clinicalName] of Object.entries(visionMapping)) {
    const lm = landmarks[visionKey];
    if (lm) {
      mapping[clinicalName] = {
        name: clinicalName,
        x: lm.x,
        y: lm.y,
        confidence: lm.confidence
      };
    }
  }

  return mapping as Record<ClinicalLandmarkName, UnifiedLandmark>;
}
