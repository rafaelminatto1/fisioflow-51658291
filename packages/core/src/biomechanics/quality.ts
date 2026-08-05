/**
 * Qualidade da captura.
 *
 * Serve para uma decisão só: esta captura sustenta uma medida clínica? Se não
 * sustenta, o pipeline rejeita a métrica. É preferível a tela dizer "não
 * mensurável nesta captura" a exibir um número que ninguém vai questionar.
 */

import { MIN_LANDMARK_SCORE } from "./kinematics";
import {
  LANDMARK_NAMES,
  type LandmarkFrame,
  type LandmarkName,
  type QualityReport,
} from "./types";

/** Juntas que sustentam medida de membro inferior. */
export const LOWER_LIMB_JOINTS: LandmarkName[] = [
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_shoulder",
  "right_shoulder",
];

/** Abaixo disso a captura não vira laudo. */
export const MIN_USABLE_FRAME_RATIO = 0.6;

export function frameIsUsable(
  frame: LandmarkFrame,
  joints: LandmarkName[] = LOWER_LIMB_JOINTS,
  minScore = MIN_LANDMARK_SCORE,
): boolean {
  return joints.every((name) => {
    const index = LANDMARK_NAMES.indexOf(name);
    const lm = frame.landmarks[index];
    return !!lm && lm.score >= minScore;
  });
}

export function assessCaptureQuality(
  frames: ReadonlyArray<LandmarkFrame>,
  joints: LandmarkName[] = LOWER_LIMB_JOINTS,
  minScore = MIN_LANDMARK_SCORE,
): QualityReport {
  if (frames.length === 0) {
    return {
      usableFrameRatio: 0,
      meanConfidence: 0,
      occludedJoints: [...joints],
      score: 0,
      verdict: "unusable",
    };
  }

  let usable = 0;
  let confidenceSum = 0;
  const jointHits = new Map<LandmarkName, number>(joints.map((j) => [j, 0]));

  for (const frame of frames) {
    if (frameIsUsable(frame, joints, minScore)) usable++;
    confidenceSum += frame.confidence;

    for (const name of joints) {
      const lm = frame.landmarks[LANDMARK_NAMES.indexOf(name)];
      if (lm && lm.score >= minScore) {
        jointHits.set(name, (jointHits.get(name) ?? 0) + 1);
      }
    }
  }

  const usableFrameRatio = usable / frames.length;
  const meanConfidence = confidenceSum / frames.length;

  // Junta visível em menos de metade dos frames é considerada ocluída — o
  // laudo precisa dizer qual, senão o fisio não sabe reposicionar a câmera.
  const occludedJoints = joints.filter((name) => (jointHits.get(name) ?? 0) / frames.length < 0.5);

  const score = Math.round(usableFrameRatio * 70 + meanConfidence * 30);

  const verdict: QualityReport["verdict"] =
    usableFrameRatio < MIN_USABLE_FRAME_RATIO
      ? "unusable"
      : usableFrameRatio < 0.85 || occludedJoints.length > 0
        ? "marginal"
        : "good";

  return { usableFrameRatio, meanConfidence, occludedJoints, score, verdict };
}
