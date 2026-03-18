import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { sendTestEmail } from '../lib/email';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { channel, status, limit = '100' } = c.req.query();

  const conditions = ['cl.organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (channel && channel !== 'all') {
    params.push(channel);
    conditions.push(`cl.type = $${params.length}`);
  }

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`cl.status = $${params.length}`);
  }

  params.push(Number(limit));

  const result = await pool.query(
    `
      SELECT
        cl.*,
        p.full_name AS patient_full_name,
        p.name AS patient_name,
        p.email AS patient_email,
        p.phone AS patient_phone
      FROM communication_logs cl
      LEFT JOIN patients p ON p.id = cl.patient_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY cl.created_at DESC
      LIMIT $${params.length}
    `,
    params,
  );

  const data = result.rows.map((row) => ({
    ...row,
    patient: row.patient_id
      ? {
          id: row.patient_id,
          full_name: row.patient_full_name ?? row.patient_name ?? null,
          name: row.patient_full_name ?? row.patient_name ?? null,
          email: row.patient_email ?? null,
          phone: row.patient_phone ?? null,
        }
      : null,
  }));

  return c.json({ data });
});

app.get('/stats', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);

  const result = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'enviado')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'entregue')::int AS delivered,
        COUNT(*) FILTER (WHERE status = 'falha')::int AS failed,
        COUNT(*) FILTER (WHERE status = 'pendente')::int AS pending,
        COUNT(*) FILTER (WHERE type = 'email')::int AS email,
        COUNT(*) FILTER (WHERE type = 'whatsapp')::int AS whatsapp,
        COUNT(*) FILTER (WHERE type = 'sms')::int AS sms
      FROM communication_logs
      WHERE organization_id = $1
    `,
    [user.organizationId],
  );

  const row = result.rows[0] ?? {};
  return c.json({
    data: {
      total: Number(row.total ?? 0),
      sent: Number(row.sent ?? 0),
      delivered: Number(row.delivered ?? 0),
      failed: Number(row.failed ?? 0),
      pending: Number(row.pending ?? 0),
      byChannel: {
        email: Number(row.email ?? 0),
        whatsapp: Number(row.whatsapp ?? 0),
        sms: Number(row.sms ?? 0),
      },
    },
  });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.type || !body.recipient || !body.body) {
    return c.json({ error: 'type, recipient e body são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO communication_logs (
        organization_id, patient_id, appointment_id, type, recipient, subject, body, status,
        sent_at, delivered_at, read_at, error_message, metadata, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      body.patient_id ?? null,
      body.appointment_id ?? null,
      String(body.type),
      String(body.recipient),
      body.subject ? String(body.subject) : null,
      String(body.body),
      String(body.status ?? 'pendente'),
      body.sent_at ?? null,
      body.delivered_at ?? null,
      body.read_at ?? null,
      body.error_message ?? null,
      JSON.stringify(body.metadata ?? {}),
      user.uid,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  await pool.query('DELETE FROM communication_logs WHERE id = $1 AND organization_id = $2', [
    id,
    user.organizationId,
  ]);
  return c.json({ ok: true });
});

app.post('/:id/resend', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      UPDATE communication_logs
      SET status = 'pendente', error_message = NULL, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Comunicação não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/test-email', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const recipient = String(body.to ?? body.email ?? '').trim();
  if (!recipient) return c.json({ error: 'to é obrigatório' }, 400);

  try {
    await sendTestEmail(c.env, recipient);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }

  await pool.query(
    `
      INSERT INTO communication_logs (
        organization_id, type, recipient, subject, body, status, sent_at, metadata, created_by, created_at, updated_at
      ) VALUES ($1, 'email', $2, $3, $4, 'enviado', NOW(), $5, $6, NOW(), NOW())
    `,
    [
      user.organizationId,
      recipient,
      'Email de teste — FisioFlow',
      'Email de teste enviado com sucesso via Resend',
      JSON.stringify({ is_test: true }),
      user.uid,
    ],
  );

  return c.json({ success: true, message: `Email de teste enviado para ${recipient}` });
});

export { app as communicationsRoutes };
