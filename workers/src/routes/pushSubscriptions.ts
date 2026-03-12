import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
type Pool = ReturnType<typeof createPool>;

let pushSubscriptionsSchemaReady: Promise<void> | null = null;

async function ensurePushSubscriptionsSchema(pool: Pool) {
  if (!pushSubscriptionsSchemaReady) {
    pushSubscriptionsSchemaReady = (async () => {
      const statements = [
        `CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          user_id TEXT NOT NULL,
          organization_id TEXT,
          endpoint TEXT NOT NULL,
          p256dh TEXT,
          auth TEXT,
          device_info JSONB,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS user_id TEXT`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS organization_id TEXT`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS p256dh TEXT`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS endpoint TEXT`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS auth TEXT`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS device_info JSONB`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint_user ON push_subscriptions (endpoint, user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active ON push_subscriptions (user_id, active)`,
      ];

      for (const statement of statements) {
        await pool.query(statement);
      }
    })().catch((error) => {
      pushSubscriptionsSchemaReady = null;
      throw error;
    });
  }

  await pushSubscriptionsSchemaReady;
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { userId, activeOnly } = c.req.query();
  const targetUser = userId || user.uid;
  if (!targetUser) {
    return c.json({ data: [] });
  }

  try {
    await ensurePushSubscriptionsSchema(pool);

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
    try { return c.json({ data: result.rows || result }); } catch (_error) { return c.json({ data: [] }); }
  } catch (error) {
    console.error('[PushSubscriptions/List] Error:', error);
    return c.json({ data: [] });
  }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    await ensurePushSubscriptionsSchema(pool);
    const body = (await c.req.json()) as {
      endpoint?: string;
      p256dh?: string;
      auth?: string;
      device_info?: Record<string, unknown>;
      deviceInfo?: Record<string, unknown>;
      organization_id?: string | null;
      organizationId?: string | null;
      active?: boolean;
    };
    const deviceInfo = body.device_info ?? body.deviceInfo ?? null;
    const organizationId = body.organization_id ?? body.organizationId ?? user.organizationId ?? null;

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
          deviceInfo ? JSON.stringify(deviceInfo) : null,
          body.active ?? true,
          organizationId,
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
        organizationId,
        body.endpoint,
        body.p256dh ?? null,
        body.auth ?? null,
        deviceInfo ? JSON.stringify(deviceInfo) : null,
        body.active ?? true,
      ],
    );
    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error('[PushSubscriptions/Post] Error:', error);
    return c.json({ error: 'Erro ao salvar assinatura push' }, 500);
  }
});

app.put('/deactivate', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    await ensurePushSubscriptionsSchema(pool);
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
  } catch (error) {
    console.error('[PushSubscriptions/Deactivate] Error:', error);
    return c.json({ error: 'Erro ao desativar assinatura push' }, 500);
  }
});

export { app as pushSubscriptionsRoutes };
