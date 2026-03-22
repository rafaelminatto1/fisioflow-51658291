import type { Hono } from 'hono';
import { createPool } from '../../lib/db';
import type { Env } from '../../types/env';
import type { AuthVariables } from '../../lib/auth';

export type AnalyticsRouteApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;

export const hasTable = async (pool: ReturnType<typeof createPool>, tableName: string) => {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
};

export const parseDate = (input: string | undefined): string | null => {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

export const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const asNumber = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))
      ? Number(value)
      : null;
