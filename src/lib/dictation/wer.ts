/**
 * Word Error Rate para o gate F1 do ditado (specs/ditado-evolucao).
 * Normaliza caixa/pontuação (acentos preservados — pt-BR) e mede
 * Levenshtein em nível de palavra contra o roteiro de referência.
 */

export function normalizeForWer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;:!?()"“”'‘’\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordErrorRate(reference: string, hypothesis: string): { wer: number; errors: number; words: number } {
  const ref = normalizeForWer(reference).split(" ").filter(Boolean);
  const hyp = normalizeForWer(hypothesis).split(" ").filter(Boolean);
  if (ref.length === 0) throw new Error("referência vazia");

  const prev: number[] = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  const curr: number[] = Array.from({ length: hyp.length + 1 }, () => 0);
  for (let i = 1; i <= ref.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= hyp.length; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= hyp.length; j++) prev[j] = curr[j];
  }
  const errors = prev[hyp.length];
  return { wer: errors / ref.length, errors, words: ref.length };
}
