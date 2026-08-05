/**
 * Normalização de landmarks para o espaço canônico.
 *
 * O espaço canônico é: origem no canto superior esquerdo, x/y normalizados em
 * 0–1, imagem NÃO espelhada e NÃO rotacionada, ordem BlazePose de 33 pontos.
 *
 * `applyCoordinateSpace` deve ser chamada UMA única vez, na ingestão. Aplicar
 * duas vezes desfaz o espelhamento e troca esquerda/direita de volta — e uma
 * tabela de goniometria com Esq/Dir invertidos é pior que nenhuma tabela,
 * porque parece certa.
 */

import {
  LANDMARK_COUNT,
  LANDMARK_INDEX,
  type CoordinateSpace,
  type Landmark,
  type LandmarkFrame,
} from "./types";

/** Par esquerda/direita que precisa ser trocado quando a imagem é espelhada. */
const MIRROR_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [LANDMARK_INDEX.left_eye_inner, LANDMARK_INDEX.right_eye_inner],
  [LANDMARK_INDEX.left_eye, LANDMARK_INDEX.right_eye],
  [LANDMARK_INDEX.left_eye_outer, LANDMARK_INDEX.right_eye_outer],
  [LANDMARK_INDEX.left_ear, LANDMARK_INDEX.right_ear],
  [LANDMARK_INDEX.mouth_left, LANDMARK_INDEX.mouth_right],
  [LANDMARK_INDEX.left_shoulder, LANDMARK_INDEX.right_shoulder],
  [LANDMARK_INDEX.left_elbow, LANDMARK_INDEX.right_elbow],
  [LANDMARK_INDEX.left_wrist, LANDMARK_INDEX.right_wrist],
  [LANDMARK_INDEX.left_pinky, LANDMARK_INDEX.right_pinky],
  [LANDMARK_INDEX.left_index, LANDMARK_INDEX.right_index],
  [LANDMARK_INDEX.left_thumb, LANDMARK_INDEX.right_thumb],
  [LANDMARK_INDEX.left_hip, LANDMARK_INDEX.right_hip],
  [LANDMARK_INDEX.left_knee, LANDMARK_INDEX.right_knee],
  [LANDMARK_INDEX.left_ankle, LANDMARK_INDEX.right_ankle],
  [LANDMARK_INDEX.left_heel, LANDMARK_INDEX.right_heel],
  [LANDMARK_INDEX.left_foot_index, LANDMARK_INDEX.right_foot_index],
];

export const EMPTY_LANDMARK: Landmark = { x: 0, y: 0, z: 0, score: 0 };

export function emptyLandmarks(): Landmark[] {
  return Array.from({ length: LANDMARK_COUNT }, () => ({ ...EMPTY_LANDMARK }));
}

function rotatePoint(x: number, y: number, degrees: number): { x: number; y: number } {
  switch (degrees) {
    case 90:
      return { x: 1 - y, y: x };
    case 180:
      return { x: 1 - x, y: 1 - y };
    case 270:
      return { x: y, y: 1 - x };
    default:
      return { x, y };
  }
}

/**
 * Leva um frame do espaço do buffer de câmera para o espaço canônico.
 *
 * Espelhar exige DUAS coisas: refletir x E trocar os pares esquerda/direita.
 * Só refletir x deixa o joelho esquerdo anatômico rotulado como direito.
 */
export function applyCoordinateSpace(frame: LandmarkFrame, space: CoordinateSpace): LandmarkFrame {
  const rotation = space.rotationDegrees ?? 0;
  const scaleX = space.normalized ? 1 : space.sourceWidth || 1;
  const scaleY = space.normalized ? 1 : space.sourceHeight || 1;

  const moved: Landmark[] = frame.landmarks.map((lm) => {
    let x = lm.x / scaleX;
    let y = lm.y / scaleY;

    if (space.mirrored) x = 1 - x;
    if (rotation !== 0) ({ x, y } = rotatePoint(x, y, rotation));

    return { x, y, z: lm.z, score: lm.score };
  });

  if (space.mirrored) {
    for (const [l, r] of MIRROR_PAIRS) {
      const tmp = moved[l];
      moved[l] = moved[r];
      moved[r] = tmp;
    }
  }

  return { ...frame, landmarks: moved };
}

/** Ponto do MLKit Pose (Android/iOS) tal como o plugin entrega. */
export interface MlKitLandmark {
  type?: string | number;
  x: number;
  y: number;
  z?: number;
  inFrameLikelihood?: number;
}

/**
 * MLKit já usa a ordem BlazePose de 33 pontos, então o mapa é posicional.
 * Ponto ausente vira score 0 em vez de sumir — stride fixo mantém o parsing
 * do NDJSON sem ramificação.
 */
export function fromMlKitPose(
  points: ReadonlyArray<MlKitLandmark | null | undefined>,
  opts: { frameIndex: number; timeMs: number },
): LandmarkFrame {
  const landmarks = emptyLandmarks();

  for (let i = 0; i < Math.min(points.length, LANDMARK_COUNT); i++) {
    const p = points[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    landmarks[i] = {
      x: p.x,
      y: p.y,
      z: Number.isFinite(p.z) ? (p.z as number) : 0,
      score: typeof p.inFrameLikelihood === "number" ? p.inFrameLikelihood : 1,
    };
  }

  return {
    frameIndex: opts.frameIndex,
    timeMs: opts.timeMs,
    landmarks,
    confidence: meanScore(landmarks),
  };
}

/**
 * Apple Vision expõe 19 juntas nomeadas — menos que os 33 do BlazePose.
 * Os índices sem correspondência ficam com score 0, e o pipeline os rejeita
 * explicitamente em vez de inventar posição.
 */
const APPLE_VISION_MAP: Record<string, number> = {
  nose: LANDMARK_INDEX.nose,
  left_eye: LANDMARK_INDEX.left_eye,
  right_eye: LANDMARK_INDEX.right_eye,
  left_ear: LANDMARK_INDEX.left_ear,
  right_ear: LANDMARK_INDEX.right_ear,
  left_shoulder: LANDMARK_INDEX.left_shoulder,
  right_shoulder: LANDMARK_INDEX.right_shoulder,
  left_elbow: LANDMARK_INDEX.left_elbow,
  right_elbow: LANDMARK_INDEX.right_elbow,
  left_wrist: LANDMARK_INDEX.left_wrist,
  right_wrist: LANDMARK_INDEX.right_wrist,
  left_hip: LANDMARK_INDEX.left_hip,
  right_hip: LANDMARK_INDEX.right_hip,
  left_knee: LANDMARK_INDEX.left_knee,
  right_knee: LANDMARK_INDEX.right_knee,
  left_ankle: LANDMARK_INDEX.left_ankle,
  right_ankle: LANDMARK_INDEX.right_ankle,
};

export function fromAppleVision(
  joints: Record<string, { x: number; y: number; confidence?: number } | undefined>,
  opts: { frameIndex: number; timeMs: number },
): LandmarkFrame {
  const landmarks = emptyLandmarks();

  for (const [name, index] of Object.entries(APPLE_VISION_MAP)) {
    const joint = joints[name];
    if (!joint || !Number.isFinite(joint.x) || !Number.isFinite(joint.y)) continue;
    landmarks[index] = {
      x: joint.x,
      // Vision usa origem no canto INFERIOR esquerdo; canônico é superior.
      y: 1 - joint.y,
      z: 0,
      score: typeof joint.confidence === "number" ? joint.confidence : 1,
    };
  }

  return {
    frameIndex: opts.frameIndex,
    timeMs: opts.timeMs,
    landmarks,
    confidence: meanScore(landmarks),
  };
}

/** MediaPipe cru: array de [x, y, z, visibility]. */
export function fromMediaPipe(
  rows: ReadonlyArray<ReadonlyArray<number>>,
  opts: { frameIndex: number; timeMs: number },
): LandmarkFrame {
  const landmarks = emptyLandmarks();

  for (let i = 0; i < Math.min(rows.length, LANDMARK_COUNT); i++) {
    const [x, y, z, visibility] = rows[i] ?? [];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    landmarks[i] = {
      x: x as number,
      y: y as number,
      z: Number.isFinite(z) ? (z as number) : 0,
      score: Number.isFinite(visibility) ? (visibility as number) : 1,
    };
  }

  return {
    frameIndex: opts.frameIndex,
    timeMs: opts.timeMs,
    landmarks,
    confidence: meanScore(landmarks),
  };
}

function meanScore(landmarks: Landmark[]): number {
  if (landmarks.length === 0) return 0;
  return landmarks.reduce((acc, l) => acc + l.score, 0) / landmarks.length;
}
