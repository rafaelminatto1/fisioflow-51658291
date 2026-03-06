/**
 * Rotas: Documentos do Paciente
 *
 * GET    /api/documents?patientId=
 * POST   /api/documents
 * DELETE /api/documents/:id
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
    `SELECT * FROM patient_documents
     WHERE patient_id = $1 AND organization_id = $2
     ORDER BY created_at DESC`,
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
    `INSERT INTO patient_documents
       (patient_id, organization_id, file_name, file_path, file_type, file_size,
        category, description, storage_url, uploaded_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      patientId, user.organizationId,
      String(body.file_name ?? ''),
      String(body.file_path ?? ''),
      body.file_type ?? null,
      body.file_size != null ? Number(body.file_size) : null,
      body.category ?? 'outro',
      body.description ?? null,
      body.storage_url ?? null,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT file_path FROM patient_documents WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Documento não encontrado' }, 404);

  await pool.query('DELETE FROM patient_documents WHERE id = $1', [id]);
  return c.json({ ok: true, file_path: check.rows[0].file_path });
});

export { app as documentsRoutes };
