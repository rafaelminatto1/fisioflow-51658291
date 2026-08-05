/**
 * Serialização do bundle de landmarks — `ff-pose-33-v1`.
 *
 * NDJSON: linha 0 é o cabeçalho, cada linha seguinte é um frame em
 * structure-of-arrays. Estimativa para 10 s a 30 fps: ~270 KB cru, ~50 KB
 * gzip. Vai bem pela rede; não vai como 9.000 linhas no Postgres via
 * Hyperdrive — por isso o bundle mora no R2 e só keyframes decimados viram
 * linha.
 *
 * Landmark ausente entra como `[0,0,0,0]` em vez de sumir: stride fixo de 4
 * mantém o parsing sem ramificação, e score 0 já sinaliza "não medir".
 */

import { emptyLandmarks } from "./landmarks";
import { LANDMARK_COUNT, type BundleHeader, type Landmark, type LandmarkFrame } from "./types";

export const POSE_SCHEMA = "ff-pose-33-v1";

/** 4 casas: ~0,1 px em 1080p. Mais que isso é ruído do estimador. */
const QUANT = 4;

function quantize(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10 ** QUANT) / 10 ** QUANT;
}

export function encodeFrameLine(frame: LandmarkFrame): string {
  const k: number[] = [];
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const lm = frame.landmarks[i];
    if (!lm || lm.score <= 0) {
      k.push(0, 0, 0, 0);
    } else {
      k.push(quantize(lm.x), quantize(lm.y), quantize(lm.z), quantize(lm.score));
    }
  }
  return JSON.stringify({
    i: frame.frameIndex,
    t: Math.round(frame.timeMs),
    k,
    c: quantize(frame.confidence),
  });
}

export function encodeBundle(header: BundleHeader, frames: ReadonlyArray<LandmarkFrame>): string {
  const lines = [JSON.stringify(header)];
  for (const frame of frames) lines.push(encodeFrameLine(frame));
  return lines.join("\n");
}

export class PoseBundleError extends Error {
  constructor(
    message: string,
    public code:
      | "empty"
      | "bad_header"
      | "bad_frame"
      | "schema_mismatch"
      | "landmark_count_mismatch",
  ) {
    super(message);
    this.name = "PoseBundleError";
  }
}

export function decodeBundleText(text: string): { header: BundleHeader; frames: LandmarkFrame[] } {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new PoseBundleError("Bundle vazio.", "empty");
  }

  let header: BundleHeader;
  try {
    header = JSON.parse(lines[0]) as BundleHeader;
  } catch {
    throw new PoseBundleError("Cabeçalho do bundle ilegível.", "bad_header");
  }

  if (header?.schema !== POSE_SCHEMA) {
    throw new PoseBundleError(
      `Schema não suportado: ${String(header?.schema)} (esperado ${POSE_SCHEMA}).`,
      "schema_mismatch",
    );
  }

  if (header.landmarkCount !== LANDMARK_COUNT) {
    throw new PoseBundleError(
      `Bundle declara ${header.landmarkCount} landmarks; o pipeline espera ${LANDMARK_COUNT}.`,
      "landmark_count_mismatch",
    );
  }

  const frames: LandmarkFrame[] = [];

  for (let n = 1; n < lines.length; n++) {
    let parsed: { i: number; t: number; k: number[]; c?: number };
    try {
      parsed = JSON.parse(lines[n]);
    } catch {
      throw new PoseBundleError(`Frame ilegível na linha ${n}.`, "bad_frame");
    }

    if (!Array.isArray(parsed.k) || parsed.k.length !== LANDMARK_COUNT * 4) {
      throw new PoseBundleError(
        `Frame ${parsed.i ?? n} tem ${parsed.k?.length ?? 0} valores; esperado ${LANDMARK_COUNT * 4}.`,
        "bad_frame",
      );
    }

    const landmarks: Landmark[] = emptyLandmarks();
    for (let j = 0; j < LANDMARK_COUNT; j++) {
      const base = j * 4;
      landmarks[j] = {
        x: parsed.k[base],
        y: parsed.k[base + 1],
        z: parsed.k[base + 2],
        score: parsed.k[base + 3],
      };
    }

    frames.push({
      frameIndex: parsed.i,
      timeMs: parsed.t,
      landmarks,
      confidence: typeof parsed.c === "number" ? parsed.c : 0,
    });
  }

  return { header, frames };
}

function isGzip(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/**
 * Aceita NDJSON cru ou gzip — detecta pelo magic number.
 * Usa `DecompressionStream`, disponível em Workers e em RN moderno; quem não
 * tiver deve descomprimir antes e chamar `decodeBundleText`.
 */
export async function decodePoseBundle(
  bytes: Uint8Array,
): Promise<{ header: BundleHeader; frames: LandmarkFrame[] }> {
  if (!isGzip(bytes)) {
    return decodeBundleText(new TextDecoder().decode(bytes));
  }

  if (typeof DecompressionStream === "undefined") {
    throw new PoseBundleError(
      "Bundle está em gzip mas o runtime não tem DecompressionStream.",
      "bad_header",
    );
  }

  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return decodeBundleText(text);
}
