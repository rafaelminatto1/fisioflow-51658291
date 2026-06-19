export const EXTRACT_MEASURES_SYSTEM =
  "Você extrai pontuações de escalas/PROMs clínicas de um texto de fisioterapia, em PT-BR. " +
  "Escalas comuns: EVA/VAS (0-10), Oswestry (0-100%), DASH (0-100), Lysholm (0-100), NDI, LEFS, " +
  "PSFS, Berg, Lequesne, Tampa/TSK, WOMAC. " +
  "Retorne APENAS um array JSON; cada item: " +
  '{"scale": "EVA", "score": 7, "maxScore"?: 10, "interpretation"?: string}. ' +
  "Extraia apenas valores explicitamente presentes no texto; NÃO invente. score é numérico.";

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value.trim().replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

export type ExtractedMeasure = {
  scale: string;
  score: number;
  maxScore?: number;
  interpretation?: string;
};

/** Valida a saída do LLM em medições de escala. Descarta itens sem escala ou sem score numérico. */
export function coerceMeasures(raw: unknown): ExtractedMeasure[] {
  const r = raw as { measures?: unknown; scales?: unknown };
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray(r?.measures)
      ? r.measures
      : Array.isArray(r?.scales)
        ? r.scales
        : [];
  const out: ExtractedMeasure[] = [];
  for (const item of arr) {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const scale = str(o.scale) ?? str(o.scale_name) ?? str(o.name);
    const score = num(o.score) ?? num(o.value);
    if (!scale || score === undefined) continue;
    const maxScore = num(o.maxScore) ?? num(o.max_score);
    const interpretation = str(o.interpretation);
    out.push({
      scale,
      score,
      ...(maxScore !== undefined ? { maxScore } : {}),
      ...(interpretation ? { interpretation } : {}),
    });
    if (out.length >= 10) break;
  }
  return out;
}
