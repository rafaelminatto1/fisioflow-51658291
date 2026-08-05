/**
 * Primitivas numéricas da cinemática.
 *
 * Todas puras e determinísticas: sem `Date.now()`, sem `Math.random()`, sem
 * I/O. É o que permite testá-las contra valores analiticamente conhecidos, e é
 * por isso que o mesmo ângulo pode ser calculado no aparelho e no Worker.
 *
 * Convenção de falha: retornam `null`, nunca `NaN`. Um `NaN` que escapa vira
 * "0°" em algum lugar do laudo; um `null` obriga quem chama a decidir.
 */

import type { Landmark } from "./types";

export interface Vec2 {
  x: number;
  y: number;
}

const EPSILON = 1e-9;

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function magnitude(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

/**
 * Ângulo interno em `b`, formado por a–b–c, em graus [0, 180].
 *
 * Segmentos colineares apontando em sentidos opostos (perna estendida) dão
 * 180°. Vetor de comprimento zero devolve `null`.
 */
export function angle2D(a: Vec2, b: Vec2, c: Vec2): number | null {
  const ba = subtract(a, b);
  const bc = subtract(c, b);
  const magBa = magnitude(ba);
  const magBc = magnitude(bc);

  if (magBa < EPSILON || magBc < EPSILON) return null;

  const cosine = dot(ba, bc) / (magBa * magBc);
  // Erro de ponto flutuante pode passar de ±1 e fazer acos devolver NaN.
  const clamped = Math.min(1, Math.max(-1, cosine));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/** Ângulo 3D em `b`. Coplanar deve coincidir com `angle2D`. */
export function angle3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number },
): number | null {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const magBa = Math.hypot(ba.x, ba.y, ba.z);
  const magBc = Math.hypot(bc.x, bc.y, bc.z);

  if (magBa < EPSILON || magBc < EPSILON) return null;

  const cosine = (ba.x * bc.x + ba.y * bc.y + ba.z * bc.z) / (magBa * magBc);
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}

/**
 * Inclinação de um segmento em relação à vertical, em graus.
 *
 * Positivo = inclinado para a direita da imagem. `y` cresce para baixo (origem
 * top-left), então a vertical "para cima" é (0, -1).
 */
export function signedAngleToVertical(from: Vec2, to: Vec2): number | null {
  const seg = subtract(to, from);
  if (magnitude(seg) < EPSILON) return null;
  // atan2(x, -y) dá 0 quando o segmento aponta para cima.
  return (Math.atan2(seg.x, -seg.y) * 180) / Math.PI;
}

/** Distância perpendicular de `p` à reta a–b. Sinal indica o lado. */
export function signedDistanceToLine(p: Vec2, a: Vec2, b: Vec2): number | null {
  const ab = subtract(b, a);
  const len = magnitude(ab);
  if (len < EPSILON) return null;
  return cross(ab, subtract(p, a)) / len;
}

/** Mediana móvel — tira spike de landmark sem borrar o pico como a média faria. */
export function movingMedian(series: number[], window: number): number[] {
  if (window <= 1 || series.length === 0) return [...series];
  const half = Math.floor(window / 2);
  return series.map((_, i) => {
    const slice = series.slice(Math.max(0, i - half), Math.min(series.length, i + half + 1));
    const sorted = [...slice].sort((x, y) => x - y);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  });
}

/**
 * Butterworth de 2ª ordem passa-baixa, aplicado ida e volta (filtfilt).
 *
 * Duas passadas cancelam o atraso de fase. Isso importa: um filtro que desloca
 * a série no tempo move o instante do pico de flexão, e o laudo passa a marcar
 * o evento no frame errado.
 */
export function butterworthLowPass(series: number[], cutoffHz: number, fps: number): number[] {
  if (series.length < 4 || cutoffHz <= 0 || fps <= 0) return [...series];
  if (cutoffHz >= fps / 2) return [...series];

  const wc = Math.tan((Math.PI * cutoffHz) / fps);
  const k1 = Math.SQRT2 * wc;
  const k2 = wc * wc;
  const a0 = k2 / (1 + k1 + k2);
  const a1 = 2 * a0;
  const a2 = a0;
  const b1 = (2 * (k2 - 1)) / (1 + k1 + k2);
  const b2 = (1 - k1 + k2) / (1 + k1 + k2);

  const pass = (input: number[]): number[] => {
    const out = new Array<number>(input.length);
    out[0] = input[0];
    out[1] = input[1];
    for (let i = 2; i < input.length; i++) {
      out[i] =
        a0 * input[i] + a1 * input[i - 1] + a2 * input[i - 2] - b1 * out[i - 1] - b2 * out[i - 2];
    }
    return out;
  };

  const forward = pass(series);
  const backward = pass([...forward].reverse());
  return backward.reverse();
}

/** Derivada por diferença central, em unidades por segundo. */
export function velocity(series: number[], fps: number): number[] {
  if (series.length < 2 || fps <= 0) return series.map(() => 0);
  return series.map((_, i) => {
    if (i === 0) return (series[1] - series[0]) * fps;
    if (i === series.length - 1) return (series[i] - series[i - 1]) * fps;
    return ((series[i + 1] - series[i - 1]) * fps) / 2;
  });
}

/** Índices onde a série cruza zero, com o sentido do cruzamento. */
export function zeroCrossings(series: number[]): Array<{ index: number; rising: boolean }> {
  const out: Array<{ index: number; rising: boolean }> = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const curr = series[i];
    if (prev === 0) continue;
    if (prev < 0 && curr >= 0) out.push({ index: i, rising: true });
    else if (prev > 0 && curr <= 0) out.push({ index: i, rising: false });
  }
  return out;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Arredonda para 2 casas — `metric_value` é numeric(10,2). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toVec2(landmark: Landmark): Vec2 {
  return { x: landmark.x, y: landmark.y };
}
