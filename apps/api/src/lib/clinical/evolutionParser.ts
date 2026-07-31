/**
 * Parser determinístico das evoluções clínicas em texto livre.
 *
 * Why: o dado clínico da clínica está em `sessions.observacao`, não em campos.
 * Um parser é preferível a IA aqui por três razões: é reproduzível (mesma entrada
 * → mesma saída), é auditável (cada extração guarda o trecho de origem) e é
 * descartável (se melhorar, roda de novo e sobrescreve — a camada derivada é
 * sempre reconstruível a partir do texto bruto, que nunca é alterado).
 *
 * O que NÃO faz: inferir. Se o texto diz "muita dor", não vira um número. Só
 * extrai EVA quando o próprio profissional escreveu o valor.
 */

import {
  CONDUTAS,
  EQUIPAMENTOS,
  EXERCICIOS,
  LEXICON_VERSION,
  PLANOS_MOBILIZACAO,
  POSICOES,
  REGIOES,
  entryRegex,
  type LexEntry,
} from "./lexicon";

export interface Extraction {
  category: "conduta" | "equipamento" | "regiao" | "posicao" | "exercicio" | "plano";
  code: string;
  label: string;
  /** Trecho literal do texto original que gerou a extração. */
  sourceText: string;
  /** Offset inicial no texto original — permite destacar o trecho na UI. */
  sourceStart: number;
  sourceEnd: number;
}

export interface DosageItem {
  sets: number;
  reps: number;
  sourceText: string;
  sourceStart: number;
}

export interface LoadItem {
  value: number;
  unit: "kg";
  sourceText: string;
  sourceStart: number;
}

export interface PainReading {
  value: number;
  /** Escala máxima quando explícita ("EVA 6/10"); indefinido quando só "EVA 6". */
  maxScale?: number;
  sourceText: string;
  sourceStart: number;
}

export interface ParsedEvolution {
  lexiconVersion: string;
  extractions: Extraction[];
  dosages: DosageItem[];
  loads: LoadItem[];
  painReadings: PainReading[];
  /** Assinatura `(Nome CREFITO 3/XXXXXX-F)`, quando presente. */
  signature?: { name?: string; crefito: string; sourceText: string };
  /** Falso quando nenhum termo do léxico foi encontrado — sinaliza texto atípico. */
  hasAnyMatch: boolean;
}

const CATEGORIES: Array<{ category: Extraction["category"]; entries: LexEntry[] }> = [
  { category: "conduta", entries: CONDUTAS },
  { category: "equipamento", entries: EQUIPAMENTOS },
  { category: "regiao", entries: REGIOES },
  { category: "posicao", entries: POSICOES },
  { category: "exercicio", entries: EXERCICIOS },
  { category: "plano", entries: PLANOS_MOBILIZACAO },
];

/** Regex globais compilados uma vez — o parser roda sobre 11k+ registros. */
const COMPILED = CATEGORIES.map(({ category, entries }) => ({
  category,
  entries: entries.map((entry) => ({
    entry,
    regex: new RegExp(entryRegex(entry).source, "giu"),
  })),
}));

/**
 * `NxM` = séries × repetições. Presente em 80% das evoluções.
 * Aceita "3x10", "3 x 10rep", "4x30''".
 */
const DOSAGE_RE = /(?<![\d,.])(\d{1,2})\s*[xX]\s*(\d{1,3})(?!\s*[,.]?\d)/g;

const LOAD_RE = /(?<![\d,.])(\d{1,3}(?:[,.]\d{1,2})?)\s*kg\b/gi;

/**
 * EVA escrita no texto. Cobre "EVA 4", "EVA:6", "EVA 6/10".
 *
 * Nota: usar `\b` em regex do POSTGRES seria bug (lá `\b` é backspace, a fronteira
 * é `\y`) — aqui, em JS, `\b` está correto. A contagem original de "zero EVA no
 * texto" veio justamente desse erro no lado SQL.
 */
const PAIN_RE = /\bEVA\b\s*:?\s*(10|0?\d)(?!\d)(?:\s*\/\s*(10|\d{1,3}))?/gi;

const SIGNATURE_RE =
  /([A-ZÀ-Ú][\p{L}]+(?:\s+[A-ZÀ-Ú][\p{L}]+){0,3})?\s*\(?\s*CREFITO[^0-9]{0,4}(?:3[/\s\-–.]+)?(\d{4,7})/iu;

/** Remove extrações contidas dentro de outra maior da mesma categoria. */
function dropOverlapping(items: Extraction[]): Extraction[] {
  const sorted = [...items].sort(
    (a, b) => a.sourceStart - b.sourceStart || b.sourceEnd - a.sourceEnd,
  );
  const kept: Extraction[] = [];
  for (const item of sorted) {
    const covered = kept.some(
      (k) =>
        k.category === item.category &&
        k.sourceStart <= item.sourceStart &&
        k.sourceEnd >= item.sourceEnd,
    );
    if (!covered) kept.push(item);
  }
  return kept;
}

export function parseEvolution(text: string | null | undefined): ParsedEvolution {
  const empty: ParsedEvolution = {
    lexiconVersion: LEXICON_VERSION,
    extractions: [],
    dosages: [],
    loads: [],
    painReadings: [],
    hasAnyMatch: false,
  };
  if (!text || text.trim().length === 0) return empty;

  const raw: Extraction[] = [];
  for (const { category, entries } of COMPILED) {
    for (const { entry, regex } of entries) {
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        raw.push({
          category,
          code: entry.code,
          label: entry.label,
          sourceText: m[0],
          sourceStart: m.index,
          sourceEnd: m.index + m[0].length,
        });
        if (m.index === regex.lastIndex) regex.lastIndex++;
      }
    }
  }

  const extractions = dropOverlapping(raw);

  const dosages: DosageItem[] = [];
  for (const m of text.matchAll(DOSAGE_RE)) {
    const sets = Number(m[1]);
    const reps = Number(m[2]);
    // Descarta o que claramente não é dosagem (ex.: "10x200" de outra natureza).
    if (sets >= 1 && sets <= 20 && reps >= 1 && reps <= 200) {
      dosages.push({ sets, reps, sourceText: m[0], sourceStart: m.index ?? 0 });
    }
  }

  const loads: LoadItem[] = [];
  for (const m of text.matchAll(LOAD_RE)) {
    loads.push({
      value: Number(m[1].replace(",", ".")),
      unit: "kg",
      sourceText: m[0],
      sourceStart: m.index ?? 0,
    });
  }

  const painReadings: PainReading[] = [];
  for (const m of text.matchAll(PAIN_RE)) {
    const value = Number(m[1]);
    const maxScale = m[2] ? Number(m[2]) : undefined;
    // Só aceita valor coerente com a escala declarada.
    if (value >= 0 && value <= (maxScale ?? 10)) {
      painReadings.push({ value, maxScale, sourceText: m[0], sourceStart: m.index ?? 0 });
    }
  }

  const sig = SIGNATURE_RE.exec(text);
  const signature = sig
    ? { name: sig[1]?.replace(/\s+/g, " ").trim() || undefined, crefito: sig[2], sourceText: sig[0].trim() }
    : undefined;

  return {
    lexiconVersion: LEXICON_VERSION,
    extractions,
    dosages,
    loads,
    painReadings,
    signature,
    hasAnyMatch: extractions.length > 0,
  };
}

/** Códigos distintos de uma categoria — atalho para agregações. */
export function codesOf(parsed: ParsedEvolution, category: Extraction["category"]): string[] {
  return [...new Set(parsed.extractions.filter((e) => e.category === category).map((e) => e.code))];
}
