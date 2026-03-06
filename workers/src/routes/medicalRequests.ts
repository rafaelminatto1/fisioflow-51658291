/**
 * Rotas: Pedidos Médicos
 *
 * GET    /api/medical-requests?patientId=
 * POST   /api/medical-requests
 * DELETE /api/medical-requests/:id
 * POST   /api/medical-requests/:id/files
 * DELETE /api/medical-requests/:id/files/:fileId
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId } = c.req.query();
  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const result = await pool.query(
    `SELECT r.*, json_agg(f.*) FILTER (WHERE f.id IS NOT NULL) AS files
     FROM medical_requests r
     LEFT JOIN medical_request_files f ON f.medical_request_id = r.id
     WHERE r.patient_id = $1 AND r.organization_id = $2
     GROUP BY r.id
     ORDER BY r.request_date DESC NULLS LAST, r.created_at DESC`,
    [patientId, user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO medical_requests
       (patient_id, organization_id, doctor_name, request_date, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [
      patientId, user.organizationId,
      body.doctor_name ?? null,
      body.request_date ?? null,
      body.notes ?? null,
      user.uid,
    ],
  );
  return c.json({ data: { ...result.rows[0], files: [] } }, 201);
});

app.post('/:id/files', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const check = await pool.query(
    'SELECT id FROM medical_requests WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Pedido não encontrado' }, 404);

  const result = await pool.query(
    `INSERT INTO medical_request_files
       (medical_request_id, organization_id, file_path, file_name, file_type, file_size, storage_url, created_at)
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
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM medical_requests WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Pedido não encontrado' }, 404);

  const files = await pool.query('SELECT file_path FROM medical_request_files WHERE medical_request_id = $1', [id]);
  await pool.query('DELETE FROM medical_requests WHERE id = $1', [id]);

  return c.json({ ok: true, deleted_files: files.rows.map(r => r.file_path) });
});

app.delete('/:id/files/:fileId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id, fileId } = c.req.param();

  const check = await pool.query(
    `SELECT f.file_path FROM medical_request_files f
     JOIN medical_requests r ON r.id = f.medical_request_id
     WHERE f.id = $1 AND r.id = $2 AND r.organization_id = $3`,
    [fileId, id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Arquivo não encontrado' }, 404);

  await pool.query('DELETE FROM medical_request_files WHERE id = $1', [fileId]);
  return c.json({ ok: true, file_path: check.rows[0].file_path });
});

export { app as medicalRequestsRoutes };
