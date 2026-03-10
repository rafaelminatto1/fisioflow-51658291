/**
 * Exercise Videos Routes — Neon PostgreSQL
 *
 * GET    /api/exercise-videos               — lista com filtros (category, difficulty, bodyPart, equipment, search)
 * GET    /api/exercise-videos/:id           — vídeo por ID
 * GET    /api/exercise-videos/by-exercise/:exerciseId — vídeos de um exercício
 * POST   /api/exercise-videos               — cria registro de metadados (upload já feito no R2)
 * PUT    /api/exercise-videos/:id           — atualiza metadados
 * DELETE /api/exercise-videos/:id           — remove registro (limpeza R2 pelo frontend)
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── GET / (lista) ────────────────────────────────────────────────────────────

app.get('/', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const user = c.get('user');
  const q = c.req.query();

  const params: unknown[] = [user.organizationId];
  const where: string[] = ['(organization_id = $1 OR organization_id IS NULL)'];

  if (q.category && q.category !== 'all') {
    params.push(q.category);
    where.push(`category = $${params.length}`);
  }
  if (q.difficulty && q.difficulty !== 'all') {
    params.push(q.difficulty);
    where.push(`difficulty = $${params.length}`);
  }
  if (q.bodyPart && q.bodyPart !== 'all') {
    params.push(q.bodyPart);
    where.push(`$${params.length} = ANY(body_parts)`);
  }
  if (q.equipment && q.equipment !== 'all') {
    params.push(q.equipment);
    where.push(`$${params.length} = ANY(equipment)`);
  }
  if (q.search) {
    params.push(`%${q.search.toLowerCase()}%`);
    where.push(`(LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`);
  }

  const result = await pool.query(
    `SELECT * FROM exercise_videos WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
    params,
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

// ─── GET /by-exercise/:exerciseId ─────────────────────────────────────────────

app.get('/by-exercise/:exerciseId', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const { exerciseId } = c.req.param();
  const result = await pool.query(
    'SELECT * FROM exercise_videos WHERE exercise_id = $1 ORDER BY created_at DESC',
    [exerciseId],
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

// ─── GET /:id ──────────────────────────────────────────────────────────────────

app.get('/:id', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const result = await pool.query('SELECT * FROM exercise_videos WHERE id = $1', [id]);
  if (!result.rows.length) return c.json({ error: 'Vídeo não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

// ─── POST / (cria metadados após upload R2) ───────────────────────────────────

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const title = String(body.title ?? '').trim();
  const videoUrl = String(body.video_url ?? '').trim();
  if (!title) return c.json({ error: 'title é obrigatório' }, 400);
  if (!videoUrl) return c.json({ error: 'video_url é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO exercise_videos
       (exercise_id, organization_id, title, description, video_url, thumbnail_url,
        duration, file_size, category, difficulty, body_parts, equipment,
        uploaded_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     RETURNING *`,
    [
      body.exercise_id ?? null,
      user.organizationId,
      title,
      body.description ?? null,
      videoUrl,
      body.thumbnail_url ?? null,
      body.duration ?? null,
      body.file_size ?? 0,
      body.category ?? 'fortalecimento',
      body.difficulty ?? 'iniciante',
      body.body_parts ?? [],
      body.equipment ?? [],
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  const patchable = ['title', 'description', 'thumbnail_url', 'duration', 'category', 'difficulty', 'body_parts', 'equipment', 'exercise_id'] as const;
  for (const key of patchable) {
    if (body[key] !== undefined) {
      params.push(body[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE exercise_videos SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND (organization_id = $${params.length} OR organization_id IS NULL)
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Vídeo não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'DELETE FROM exercise_videos WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL) RETURNING *',
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Vídeo não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

export { app as exerciseVideosRoutes };
