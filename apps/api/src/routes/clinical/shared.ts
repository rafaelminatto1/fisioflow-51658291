import type { Hono } from 'hono';
import type { Env } from '../../types/env';
import type { AuthVariables } from '../../lib/auth';
import { createPool } from '../../lib/db';

export type ClinicalRouteApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;

export async function getColumns(
  pool: ReturnType<typeof createPool>,
  tableName: string,
): Promise<Set<string>> {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );

  return new Set(result.rows.map((row) => String(row.column_name)));
}

export async function hasTable(
  pool: ReturnType<typeof createPool>,
  tableName: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT to_regclass($1)::text AS table_name`,
    [`public.${tableName}`],
  );
  return Boolean(result.rows[0]?.table_name);
}

export function normalizeJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

export function normalizeStandardizedTestRow(row: Record<string, unknown>) {
  const scaleName = String(
    row.scale_name ?? row.test_type ?? row.test_name ?? 'CUSTOM',
  ).toUpperCase();
  const testName = String(row.test_name ?? row.scale_name ?? 'Teste padronizado');
  const testType = String(row.test_type ?? scaleName).toLowerCase();
  const responsesSource = row.responses ?? row.answers ?? {};
  const responses =
    responsesSource && typeof responsesSource === 'object' && !Array.isArray(responsesSource)
      ? responsesSource
      : {};

  return {
    ...row,
    scale_name: scaleName,
    test_name: testName,
    test_type: testType,
    responses,
    answers: responses,
    applied_at: String(row.applied_at ?? row.created_at ?? new Date().toISOString()),
    applied_by: row.applied_by ?? row.created_by ?? null,
    max_score: Number(row.max_score ?? 0),
    notes: row.notes ?? null,
  };
}

export function normalizeEvolutionTemplateRow(row: Record<string, unknown>) {
  const nome = String(row.nome ?? row.name ?? '');
  const descricao = row.descricao ?? row.description ?? null;
  const conteudo = String(row.conteudo ?? row.content ?? '');
  const camposPadrao = normalizeJsonArray(row.campos_padrao ?? row.blocks);
  const tags = normalizeTextArray(row.tags);

  return {
    ...row,
    nome,
    name: String(row.name ?? nome),
    tipo: String(row.tipo ?? 'fisioterapia'),
    descricao,
    description: row.description ?? descricao,
    conteudo,
    content: String(row.content ?? conteudo),
    campos_padrao: camposPadrao,
    blocks: normalizeJsonArray(row.blocks ?? camposPadrao),
    tags,
    ativo: row.ativo !== false,
  };
}
