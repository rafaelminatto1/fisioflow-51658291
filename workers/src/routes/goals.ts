/**
 * Rotas: Metas do Paciente (patient_goals)
 *
 * GET    /api/goals?patientId=
 * POST   /api/goals
 * PUT    /api/goals/:id
 * DELETE /api/goals/:id
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function trimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim().replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeStatus(value: unknown): string | undefined {
  const normalized = trimmedString(value)?.toLowerCase();
  if (!normalized) return undefined;
  if (['active', 'em_andamento', 'in_progress'].includes(normalized)) return 'em_andamento';
  if (['completed', 'concluido', 'concluído', 'done'].includes(normalized)) return 'concluido';
  if (['cancelled', 'canceled', 'cancelado'].includes(normalized)) return 'cancelado';
  return normalized;
}

function normalizePriority(value: unknown): string | undefined {
  const normalized = trimmedString(value)?.toLowerCase();
  if (!normalized) return undefined;
  if (['low', 'baixa'].includes(normalized)) return 'baixa';
  if (['medium', 'media', 'média'].includes(normalized)) return 'media';
  if (['high', 'alta'].includes(normalized)) return 'alta';
  if (['critical', 'critica', 'crítica'].includes(normalized)) return 'critica';
  return normalized;
}

function cleanupMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId } = c.req.query();
  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const result = await pool.query(
    `SELECT * FROM patient_goals
     WHERE patient_id = $1 AND organization_id = $2
     ORDER BY created_at DESC`,
    [patientId, user.organizationId],
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const rawMetadata = parseMetadata(body.metadata);
  const goalTitle = trimmedString(body.goal_title ?? body.title);
  const goalDescription = trimmedString(body.goal_description);
  const legacyDescription = trimmedString(body.description);
  const persistedDescription = goalTitle ?? legacyDescription ?? goalDescription;

  if (!persistedDescription) {
    return c.json({ error: 'goal_title ou description é obrigatório' }, 400);
  }

  const metadata = cleanupMetadata({
    ...rawMetadata,
    goal_title: goalTitle ?? legacyDescription ?? persistedDescription,
    goal_description: body.goal_description !== undefined ? goalDescription ?? null : rawMetadata.goal_description,
    category: body.category !== undefined ? trimmedString(body.category) ?? null : rawMetadata.category,
    target_value: body.target_value !== undefined ? trimmedString(body.target_value) ?? null : rawMetadata.target_value,
    current_value: body.current_value !== undefined ? trimmedString(body.current_value) ?? null : rawMetadata.current_value,
    current_progress:
      body.current_progress !== undefined
        ? parseNumber(body.current_progress) ?? 0
        : rawMetadata.current_progress ?? 0,
  });

  const result = await pool.query(
    `INSERT INTO patient_goals
       (patient_id, organization_id, description, target_date, status, priority, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      patientId,
      user.organizationId,
      persistedDescription,
      trimmedString(body.target_date) ?? null,
      normalizeStatus(body.status) ?? 'em_andamento',
      normalizePriority(body.priority) ?? 'media',
      JSON.stringify(metadata),
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const current = await pool.query(
    `SELECT * FROM patient_goals
     WHERE id = $1 AND organization_id = $2
     LIMIT 1`,
    [id, user.organizationId],
  );
  if (!current.rows.length) return c.json({ error: 'Meta não encontrada' }, 404);

  const currentRow = current.rows[0] as Record<string, unknown>;
  const currentMetadata = parseMetadata(currentRow.metadata);

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  const goalTitleProvided = body.goal_title !== undefined || body.title !== undefined;
  const legacyDescriptionProvided = body.description !== undefined;
  const nextGoalTitle = goalTitleProvided
    ? trimmedString(body.goal_title ?? body.title)
    : undefined;
  const nextLegacyDescription = legacyDescriptionProvided
    ? trimmedString(body.description)
    : undefined;

  if (goalTitleProvided || legacyDescriptionProvided) {
    params.push(nextGoalTitle ?? nextLegacyDescription ?? String(currentRow.description ?? '').trim());
    sets.push(`description = $${params.length}`);
  }

  if (body.status !== undefined) {
    params.push(normalizeStatus(body.status) ?? String(currentRow.status ?? 'em_andamento'));
    sets.push(`status = $${params.length}`);
  }
  if (body.priority !== undefined) {
    params.push(normalizePriority(body.priority) ?? String(currentRow.priority ?? 'media'));
    sets.push(`priority = $${params.length}`);
  }
  if (body.target_date !== undefined) {
    params.push(trimmedString(body.target_date) ?? null);
    sets.push(`target_date = $${params.length}`);
  }

  const achievedAt = body.completed_at !== undefined ? body.completed_at : body.achieved_at;
  if (achievedAt !== undefined) {
    params.push(trimmedString(achievedAt) ?? null);
    sets.push(`achieved_at = $${params.length}`);
  }

  const metadataTouched =
    body.metadata !== undefined ||
    goalTitleProvided ||
    body.goal_description !== undefined ||
    body.category !== undefined ||
    body.target_value !== undefined ||
    body.current_value !== undefined ||
    body.current_progress !== undefined;

  if (metadataTouched) {
    const nextMetadata = cleanupMetadata({
      ...currentMetadata,
      ...parseMetadata(body.metadata),
      goal_title:
        goalTitleProvided || legacyDescriptionProvided
          ? nextGoalTitle ?? nextLegacyDescription ?? currentMetadata.goal_title ?? currentRow.description
          : currentMetadata.goal_title,
      goal_description:
        body.goal_description !== undefined
          ? trimmedString(body.goal_description) ?? null
          : currentMetadata.goal_description,
      category:
        body.category !== undefined
          ? trimmedString(body.category) ?? null
          : currentMetadata.category,
      target_value:
        body.target_value !== undefined
          ? trimmedString(body.target_value) ?? null
          : currentMetadata.target_value,
      current_value:
        body.current_value !== undefined
          ? trimmedString(body.current_value) ?? null
          : currentMetadata.current_value,
      current_progress:
        body.current_progress !== undefined
          ? parseNumber(body.current_progress) ?? 0
          : currentMetadata.current_progress,
    });

    params.push(JSON.stringify(nextMetadata));
    sets.push(`metadata = $${params.length}::jsonb`);
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE patient_goals SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  return c.json({ data: result.rows[0] });
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM patient_goals WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Meta não encontrada' }, 404);

  await pool.query('DELETE FROM patient_goals WHERE id = $1', [id]);
  return c.json({ ok: true });
});

export { app as goalsRoutes };
