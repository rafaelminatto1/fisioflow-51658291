/**
 * Cinemática clínica: ângulos articulares, ROM, valgo, simetria, cadência.
 *
 * Regra que atravessa o módulo: quando o dado não sustenta a medida, devolvemos
 * `null` e quem chama emite uma rejeição. Nada aqui degrada para um chute — um
 * número plausível num laudo é pior que um campo vazio, porque ninguém
 * questiona o que parece certo.
 */

import {
  angle2D,
  butterworthLowPass,
  mean,
  movingMedian,
  round2,
  signedAngleToVertical,
  signedDistanceToLine,
  toVec2,
} from "./math";
import { LANDMARK_INDEX, type LandmarkFrame, type RomResult, type Side } from "./types";

/** Score mínimo para um ponto entrar numa medida. Abaixo disso, é ruído. */
export const MIN_LANDMARK_SCORE = 0.5;

export type Joint = "knee" | "hip" | "ankle" | "elbow" | "shoulder";

/** Cadeia proximal–vértice–distal de cada articulação, por lado. */
const JOINT_CHAINS: Record<Joint, Record<Side, [number, number, number]>> = {
  knee: {
    left: [LANDMARK_INDEX.left_hip, LANDMARK_INDEX.left_knee, LANDMARK_INDEX.left_ankle],
    right: [LANDMARK_INDEX.right_hip, LANDMARK_INDEX.right_knee, LANDMARK_INDEX.right_ankle],
  },
  hip: {
    left: [LANDMARK_INDEX.left_shoulder, LANDMARK_INDEX.left_hip, LANDMARK_INDEX.left_knee],
    right: [LANDMARK_INDEX.right_shoulder, LANDMARK_INDEX.right_hip, LANDMARK_INDEX.right_knee],
  },
  ankle: {
    left: [LANDMARK_INDEX.left_knee, LANDMARK_INDEX.left_ankle, LANDMARK_INDEX.left_foot_index],
    right: [LANDMARK_INDEX.right_knee, LANDMARK_INDEX.right_ankle, LANDMARK_INDEX.right_foot_index],
  },
  elbow: {
    left: [LANDMARK_INDEX.left_shoulder, LANDMARK_INDEX.left_elbow, LANDMARK_INDEX.left_wrist],
    right: [LANDMARK_INDEX.right_shoulder, LANDMARK_INDEX.right_elbow, LANDMARK_INDEX.right_wrist],
  },
  shoulder: {
    left: [LANDMARK_INDEX.left_hip, LANDMARK_INDEX.left_shoulder, LANDMARK_INDEX.left_elbow],
    right: [LANDMARK_INDEX.right_hip, LANDMARK_INDEX.right_shoulder, LANDMARK_INDEX.right_elbow],
  },
};

/**
 * Série temporal do ângulo de uma articulação.
 * Frames em que qualquer ponto da cadeia está abaixo do score mínimo entram
 * como `null` — buraco explícito, não interpolação silenciosa.
 */
export function jointAngleSeries(
  frames: ReadonlyArray<LandmarkFrame>,
  joint: Joint,
  side: Side,
  minScore = MIN_LANDMARK_SCORE,
): Array<number | null> {
  const [a, b, c] = JOINT_CHAINS[joint][side];

  return frames.map((frame) => {
    const pa = frame.landmarks[a];
    const pb = frame.landmarks[b];
    const pc = frame.landmarks[c];
    if (!pa || !pb || !pc) return null;
    if (pa.score < minScore || pb.score < minScore || pc.score < minScore) return null;
    return angle2D(toVec2(pa), toVec2(pb), toVec2(pc));
  });
}

/**
 * Suaviza a série preservando os buracos.
 *
 * Filtrar exige amostragem uniforme, então os trechos válidos são filtrados
 * separadamente; os buracos continuam buracos.
 */
export function smoothSeries(
  series: ReadonlyArray<number | null>,
  fps: number,
  cutoffHz = 6,
): Array<number | null> {
  const out: Array<number | null> = [...series];
  let start = 0;

  while (start < series.length) {
    if (series[start] === null) {
      start++;
      continue;
    }
    let end = start;
    while (end < series.length && series[end] !== null) end++;

    const segment = series.slice(start, end) as number[];
    if (segment.length >= 5) {
      const filtered = butterworthLowPass(movingMedian(segment, 3), cutoffHz, fps);
      for (let i = 0; i < filtered.length; i++) out[start + i] = filtered[i];
    }
    start = end;
  }

  return out;
}

/**
 * Amplitude de movimento a partir da série.
 * Exige um mínimo de amostras válidas — ROM tirada de 3 frames é ruído com
 * cara de medida.
 */
export function romFromSeries(
  series: ReadonlyArray<number | null>,
  timesMs: ReadonlyArray<number>,
  minSamples = 10,
): RomResult | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let peakIndex = -1;
  let count = 0;

  for (let i = 0; i < series.length; i++) {
    const value = series[i];
    if (value === null || !Number.isFinite(value)) continue;
    count++;
    if (value < min) min = value;
    if (value > max) {
      max = value;
      peakIndex = i;
    }
  }

  if (count < minSamples || peakIndex < 0) return null;

  return {
    min: round2(min),
    max: round2(max),
    rom: round2(max - min),
    peakTimeMs: timesMs[peakIndex] ?? 0,
    sampleCount: count,
  };
}

/**
 * Valgo dinâmico pelo FPPA (frontal plane projection angle).
 *
 * SÓ tem sentido no plano frontal — no sagital o joelho projeta sobre a linha
 * quadril–tornozelo por construção, e o número resultante seria vazio de
 * significado. Quem chama é responsável por conferir o plano; ver `pipeline.ts`.
 *
 * Positivo = joelho medial à linha quadril–tornozelo (valgo).
 */
export function dynamicValgusFPPA(
  frame: LandmarkFrame,
  side: Side,
  minScore = MIN_LANDMARK_SCORE,
): number | null {
  const hipIdx = side === "left" ? LANDMARK_INDEX.left_hip : LANDMARK_INDEX.right_hip;
  const kneeIdx = side === "left" ? LANDMARK_INDEX.left_knee : LANDMARK_INDEX.right_knee;
  const ankleIdx = side === "left" ? LANDMARK_INDEX.left_ankle : LANDMARK_INDEX.right_ankle;

  const hip = frame.landmarks[hipIdx];
  const knee = frame.landmarks[kneeIdx];
  const ankle = frame.landmarks[ankleIdx];
  if (!hip || !knee || !ankle) return null;
  if (hip.score < minScore || knee.score < minScore || ankle.score < minScore) return null;

  const angle = angle2D(toVec2(hip), toVec2(knee), toVec2(ankle));
  if (angle === null) return null;

  // Desvio em relação ao alinhamento perfeito (180°).
  const deviation = 180 - angle;

  // Sinal: de que lado da linha quadril–tornozelo o joelho está.
  const offset = signedDistanceToLine(toVec2(knee), toVec2(hip), toVec2(ankle));
  if (offset === null) return null;

  // Medial depende do lado: para a perna esquerda (à direita da imagem quando
  // o paciente está de frente), medial é o sentido oposto ao da direita.
  const medialSign = side === "left" ? -1 : 1;
  return round2(deviation * Math.sign(offset) * medialSign || 0);
}

/** Inclinação anterior do tronco em graus. Positivo = inclinado à frente. */
export function trunkInclination(
  frame: LandmarkFrame,
  minScore = MIN_LANDMARK_SCORE,
): number | null {
  const ls = frame.landmarks[LANDMARK_INDEX.left_shoulder];
  const rs = frame.landmarks[LANDMARK_INDEX.right_shoulder];
  const lh = frame.landmarks[LANDMARK_INDEX.left_hip];
  const rh = frame.landmarks[LANDMARK_INDEX.right_hip];
  if (!ls || !rs || !lh || !rh) return null;
  if (ls.score < minScore || rs.score < minScore || lh.score < minScore || rh.score < minScore) {
    return null;
  }

  const midShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const midHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };

  const angle = signedAngleToVertical(midHip, midShoulder);
  return angle === null ? null : round2(Math.abs(angle));
}

/**
 * Queda pélvica (sinal de Trendelenburg), em graus.
 * Plano frontal apenas. Positivo = pelve direita mais baixa.
 */
export function pelvicDrop(frame: LandmarkFrame, minScore = MIN_LANDMARK_SCORE): number | null {
  const lh = frame.landmarks[LANDMARK_INDEX.left_hip];
  const rh = frame.landmarks[LANDMARK_INDEX.right_hip];
  if (!lh || !rh) return null;
  if (lh.score < minScore || rh.score < minScore) return null;

  const dx = rh.x - lh.x;
  const dy = rh.y - lh.y;
  if (Math.abs(dx) < 1e-9) return null;

  return round2((Math.atan2(dy, dx) * 180) / Math.PI);
}

/**
 * Índice de simetria, 0–100 (100 = simétrico).
 *
 * Fórmula fixada em teste de propósito: mudá-la sem avisar altera a leitura de
 * progresso de todo paciente em acompanhamento.
 *   (1 - |L-R| / max(L,R)) * 100
 */
export function symmetryIndex(left: number, right: number): number | null {
  const larger = Math.max(Math.abs(left), Math.abs(right));
  if (larger < 1e-9) return null;
  return round2((1 - Math.abs(left - right) / larger) * 100);
}

/** Cadência em passos por minuto, a partir dos contatos iniciais. */
export function cadenceSpm(contactTimesMs: ReadonlyArray<number>): number | null {
  if (contactTimesMs.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < contactTimesMs.length; i++) {
    const delta = contactTimesMs[i] - contactTimesMs[i - 1];
    if (delta > 0) intervals.push(delta);
  }
  if (intervals.length === 0) return null;

  return round2(60000 / mean(intervals));
}

/** Assimetria entre tempos de passo consecutivos, em %. */
export function stepTimeAsymmetry(contactTimesMs: ReadonlyArray<number>): number | null {
  if (contactTimesMs.length < 3) return null;

  const odd: number[] = [];
  const even: number[] = [];
  for (let i = 1; i < contactTimesMs.length; i++) {
    const delta = contactTimesMs[i] - contactTimesMs[i - 1];
    if (delta <= 0) continue;
    (i % 2 === 1 ? odd : even).push(delta);
  }
  if (odd.length === 0 || even.length === 0) return null;

  const a = mean(odd);
  const b = mean(even);
  const larger = Math.max(a, b);
  if (larger < 1e-9) return null;

  return round2((Math.abs(a - b) / larger) * 100);
}
