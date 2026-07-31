/**
 * Persistência da camada derivada (`clinical_extractions`).
 *
 * Why: separado do parser de propósito. O parser é puro e testável sem banco;
 * este módulo só traduz o resultado dele em linhas. Assim o léxico pode ser
 * iterado com testes rápidos, sem infraestrutura.
 */

import type { Env } from "../../types/env";
import { getRawSql } from "../db";
import { parseEvolution, type ParsedEvolution } from "./evolutionParser";

export interface ExtractionRow {
  category:
    | "conduta"
    | "regiao"
    | "equipamento"
    | "posicao"
    | "exercicio"
    | "plano"
    | "dosagem"
    | "carga"
    | "eva";
  code: string;
  valueNumeric?: number;
  valueUnit?: string;
  sourceText: string;
  sourceStart: number | null;
  sourceEnd: number | null;
}

/**
 * Converte a saída do parser em linhas.
 *
 * Dosagem vira duas linhas (`sets` e `reps`) em vez de uma string "3x10" porque
 * o objetivo é agregar: "a carga do paciente subiu de 3x10 para 3x15" só é
 * consultável se as repetições forem numéricas.
 */
export function toRows(parsed: ParsedEvolution): ExtractionRow[] {
  const rows: ExtractionRow[] = [];

  for (const e of parsed.extractions) {
    rows.push({
      category: e.category,
      code: e.code,
      sourceText: e.sourceText,
      sourceStart: e.sourceStart,
      sourceEnd: e.sourceEnd,
    });
  }

  for (const d of parsed.dosages) {
    rows.push({
      category: "dosagem",
      code: "series",
      valueNumeric: d.sets,
      valueUnit: "sets",
      sourceText: d.sourceText,
      sourceStart: d.sourceStart,
      sourceEnd: d.sourceStart + d.sourceText.length,
    });
    rows.push({
      category: "dosagem",
      code: "repeticoes",
      valueNumeric: d.reps,
      valueUnit: "reps",
      sourceText: d.sourceText,
      sourceStart: d.sourceStart,
      sourceEnd: d.sourceStart + d.sourceText.length,
    });
  }

  for (const l of parsed.loads) {
    rows.push({
      category: "carga",
      code: "carga_kg",
      valueNumeric: l.value,
      valueUnit: "kg",
      sourceText: l.sourceText,
      sourceStart: l.sourceStart,
      sourceEnd: l.sourceStart + l.sourceText.length,
    });
  }

  for (const p of parsed.painReadings) {
    rows.push({
      category: "eva",
      code: "eva",
      valueNumeric: p.value,
      valueUnit: "pontos",
      sourceText: p.sourceText,
      sourceStart: p.sourceStart,
      sourceEnd: p.sourceStart + p.sourceText.length,
    });
  }

  // Duas ocorrências idênticas no mesmo offset seriam a mesma extração contada
  // duas vezes — e violariam o índice único.
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.category}|${r.code}|${r.sourceStart ?? -1}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface ExtractSourceParams {
  organizationId: string;
  patientId: string;
  sourceTable: string;
  sourceId: string;
  text: string | null | undefined;
}

export interface ExtractResult {
  sourceId: string;
  rowsWritten: number;
  hasAnyMatch: boolean;
}

/**
 * Extrai e grava as extrações de uma origem.
 *
 * Idempotente: apaga o que o parser havia gerado para aquela origem antes de
 * reinserir. Não toca em linhas `method='ai'` nem em nada revisado por humano —
 * reprocessar o léxico não pode descartar curadoria.
 */
export async function extractAndStore(
  env: Env,
  params: ExtractSourceParams,
): Promise<ExtractResult> {
  const parsed = parseEvolution(params.text);
  const rows = toRows(parsed);
  const sql = getRawSql(env, "write");

  await sql`
    DELETE FROM clinical_extractions
    WHERE source_table = ${params.sourceTable}
      AND source_id = ${params.sourceId}::uuid
      AND method = 'parser'
      AND reviewed_by IS NULL
  `;

  if (rows.length === 0) {
    return { sourceId: params.sourceId, rowsWritten: 0, hasAnyMatch: parsed.hasAnyMatch };
  }

  // Um INSERT com arrays desempacotados: 11 mil evoluções × ~20 extrações não
  // sobrevivem a uma query por linha.
  await sql`
    INSERT INTO clinical_extractions (
      organization_id, patient_id, source_table, source_id,
      category, code, value_numeric, value_unit,
      source_text, source_start, source_end,
      method, lexicon_version
    )
    SELECT
      ${params.organizationId}::uuid, ${params.patientId}::uuid,
      ${params.sourceTable}, ${params.sourceId}::uuid,
      c.category, c.code, c.value_numeric, c.value_unit,
      c.source_text, c.source_start, c.source_end,
      'parser', ${parsed.lexiconVersion}
    FROM unnest(
      ${rows.map((r) => r.category)}::text[],
      ${rows.map((r) => r.code)}::text[],
      ${rows.map((r) => r.valueNumeric ?? null)}::numeric[],
      ${rows.map((r) => r.valueUnit ?? null)}::text[],
      ${rows.map((r) => r.sourceText)}::text[],
      ${rows.map((r) => r.sourceStart)}::int[],
      ${rows.map((r) => r.sourceEnd)}::int[]
    ) AS c(category, code, value_numeric, value_unit, source_text, source_start, source_end)
    ON CONFLICT DO NOTHING
  `;

  return { sourceId: params.sourceId, rowsWritten: rows.length, hasAnyMatch: parsed.hasAnyMatch };
}
