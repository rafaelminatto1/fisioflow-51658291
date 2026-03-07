import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { userId, activeOnly } = c.req.query();
  const targetUser = userId || user.uid;
  if (!targetUser) {
    return c.json({ data: [] });
  }

  const conditions = ['user_id = $1'];
  const params: unknown[] = [targetUser];
  if (activeOnly === 'true') {
    conditions.push('active = true');
  }

  const result = await pool.query(
    `
      SELECT *
      FROM push_subscriptions
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    device_info?: Record<string, unknown>;
    organization_id?: string | null;
    active?: boolean;
  };

  if (!body.endpoint) {
    return c.json({ error: 'endpoint é obrigatório' }, 400);
  }

  const existing = await pool.query(
    `SELECT id FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2 LIMIT 1`,
    [body.endpoint, user.uid],
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `
        UPDATE push_subscriptions SET
          p256dh = $1,
          auth = $2,
          device_info = $3,
          active = $4,
          organization_id = $5,
          updated_at = NOW()
        WHERE id = $6
      `,
      [
        body.p256dh ?? null,
        body.auth ?? null,
        body.device_info ? JSON.stringify(body.device_info) : null,
        body.active ?? true,
        body.organization_id ?? user.organizationId ?? null,
        existing.rows[0].id,
      ],
    );
    const updatedResp = await pool.query(`SELECT * FROM push_subscriptions WHERE id = $1`, [
      existing.rows[0].id,
    ]);
    return c.json({ data: updatedResp.rows[0] });
  }

  const result = await pool.query(
    `
      INSERT INTO push_subscriptions (
        user_id,
        organization_id,
        endpoint,
        p256dh,
        auth,
        device_info,
        active,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING *
    `,
    [
      user.uid,
      body.organization_id ?? user.organizationId ?? null,
      body.endpoint,
      body.p256dh ?? null,
      body.auth ?? null,
      body.device_info ? JSON.stringify(body.device_info) : null,
      body.active ?? true,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/deactivate', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return c.json({ error: 'endpoint é obrigatório' }, 400);
  }

  const res = await pool.query(
    `
      UPDATE push_subscriptions
      SET active = false, updated_at = NOW()
      WHERE endpoint = $1 AND user_id = $2
      RETURNING *
    `,
    [body.endpoint, user.uid],
  );
  return c.json({ data: res.rows[0] ?? null });
});

export { app as pushSubscriptionsRoutes };
