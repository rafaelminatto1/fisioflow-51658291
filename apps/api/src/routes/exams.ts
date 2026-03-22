/**
 * Rotas: Exames do Paciente
 *
 * GET    /api/exams?patientId=
 * POST   /api/exams
 * DELETE /api/exams/:id
 * POST   /api/exams/:id/files
 * DELETE /api/exams/:id/files/:fileId
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { patientId } = c.req.query();
  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const exams = await pool.query(
    `SELECT e.*, json_agg(f.*) FILTER (WHERE f.id IS NOT NULL) AS files
     FROM patient_exams e
     LEFT JOIN patient_exam_files f ON f.exam_id = e.id
     WHERE e.patient_id = $1 AND e.organization_id = $2
     GROUP BY e.id
     ORDER BY e.exam_date DESC NULLS LAST, e.created_at DESC`,
    [patientId, user.organizationId],
  );
  return c.json({ data: exams.rows });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO patient_exams
       (patient_id, organization_id, title, exam_date, exam_type, description, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      patientId, user.organizationId,
      String(body.title ?? ''),
      body.exam_date ?? null,
      body.exam_type ?? null,
      body.description ?? null,
      user.uid,
    ],
  );
  return c.json({ data: { ...result.rows[0], files: [] } }, 201);
});

app.post('/:id/files', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const check = await pool.query(
    'SELECT id FROM patient_exams WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Exame não encontrado' }, 404);

  const result = await pool.query(
    `INSERT INTO patient_exam_files
       (exam_id, organization_id, file_path, file_name, file_type, file_size, storage_url, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [
      id, user.organizationId,
      String(body.file_path ?? ''),
      String(body.file_name ?? ''),
      body.file_type ?? null,
      body.file_size != null ? Number(body.file_size) : null,
      body.storage_url ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM patient_exams WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Exame não encontrado' }, 404);

  const files = await pool.query('SELECT file_path FROM patient_exam_files WHERE exam_id = $1', [id]);
  await pool.query('DELETE FROM patient_exams WHERE id = $1', [id]);

  return c.json({ ok: true, deleted_files: files.rows.map(r => r.file_path) });
});

app.delete('/:id/files/:fileId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id, fileId } = c.req.param();

  const check = await pool.query(
    `SELECT f.file_path FROM patient_exam_files f
     JOIN patient_exams e ON e.id = f.exam_id
     WHERE f.id = $1 AND e.id = $2 AND e.organization_id = $3`,
    [fileId, id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Arquivo não encontrado' }, 404);

  await pool.query('DELETE FROM patient_exam_files WHERE id = $1', [fileId]);
  return c.json({ ok: true, file_path: check.rows[0].file_path });
});

export { app as examsRoutes };
