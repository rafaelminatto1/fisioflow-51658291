export const SUGGEST_CID_SYSTEM =
  "Você é um codificador clínico. A partir de um diagnóstico/queixa em português, sugira de 1 a 5 " +
  "códigos CID-10 plausíveis, priorizando os de fisioterapia (capítulos M, S, G). " +
  "Retorne APENAS um array JSON; cada item: " +
  '{"code": "M75.1", "label": "Síndrome do manguito rotador", "confidence": 0-1}. ' +
  "code no formato CID-10 (letra + 2 dígitos, opcional ponto + 1-2 dígitos); label em PT-BR; " +
  "ordene do mais provável ao menos provável. Não invente códigos fora do padrão CID-10.";

// Letra (exceto U) + 2 dígitos + opcional .1-2 dígitos. Ex.: M54.5, S83.5, G56.0, M62.
const CID10_RE = /^[A-TV-Z][0-9]{2}(\.[0-9]{1,2})?$/;

export type CidSuggestion = { code: string; label: string; confidence?: number };

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Valida a saída do LLM em sugestões de CID-10. Descarta códigos fora do padrão. Aceita array ou {suggestions|codes:[...]}. */
export function coerceCidSuggestions(raw: unknown): CidSuggestion[] {
  const r = raw as { suggestions?: unknown; codes?: unknown };
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray(r?.suggestions)
      ? r.suggestions
      : Array.isArray(r?.codes)
        ? r.codes
        : [];
  const seen = new Set<string>();
  const out: CidSuggestion[] = [];
  for (const item of arr) {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const code = str(o.code)?.toUpperCase();
    const label = str(o.label) ?? str(o.name) ?? str(o.description);
    if (!code || !CID10_RE.test(code) || !label || seen.has(code)) continue;
    seen.add(code);
    const conf = typeof o.confidence === "number" && Number.isFinite(o.confidence) ? o.confidence : undefined;
    out.push({ code, label, ...(conf !== undefined ? { confidence: Math.max(0, Math.min(1, conf)) } : {}) });
    if (out.length >= 5) break;
  }
  return out;
}
