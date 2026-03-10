import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const MAX_VERSIONS = 25;

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const { soapRecordId } = c.req.query();
  if (!soapRecordId) return c.json({ error: 'soapRecordId required' }, 400);
  const db = createPool(c.env);

  const result = await db.query(
    `SELECT * FROM evolution_versions WHERE soap_record_id = $1 ORDER BY saved_at DESC LIMIT $2`,
    [soapRecordId, MAX_VERSIONS]
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = createPool(c.env);

  const result = await db.query(
    `INSERT INTO evolution_versions (soap_record_id, saved_by, change_type, content)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [
      body.soap_record_id ?? body.soapRecordId,
      body.saved_by ?? user.uid,
      body.change_type ?? body.changeType ?? 'auto',
      JSON.stringify(body.content ?? {}),
    ]
  );
  return c.json({ data: result.rows[0] }, 201);
});

export { app as evolutionVersionsRoutes };
