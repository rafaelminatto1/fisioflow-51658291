import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
type Pool = ReturnType<typeof createPool>;

let notificationsSchemaReady: Promise<void> | null = null;

async function ensureNotificationsSchema(pool: Pool) {
  if (!notificationsSchemaReady) {
    notificationsSchemaReady = (async () => {
      const statements = [
        `CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'info',
          title TEXT NOT NULL,
          message TEXT,
          link TEXT,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS id TEXT`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS organization_id TEXT`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS user_id TEXT`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'info'`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS message TEXT`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS link TEXT`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb`,
        `ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON notifications (user_id, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC)`,
      ];

      for (const statement of statements) {
        await pool.query(statement);
      }
    })().catch((error) => {
      notificationsSchemaReady = null;
      throw error;
    });
  }

  await notificationsSchemaReady;
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { unreadOnly, limit = '50' } = c.req.query();

  try {
    await ensureNotificationsSchema(pool);

    const conditions = ['user_id = $1'];
    const params: unknown[] = [user.uid];
    if (unreadOnly === 'true') conditions.push('is_read = false');
    params.push(Number(limit));

    const result = await pool.query(
      `SELECT * FROM notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length}`,
      params,
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[Notifications] Error:', error);
    return c.json({ data: [] });
  }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    await ensureNotificationsSchema(pool);

    const body = (await c.req.json()) as Record<string, unknown>;
    const result = await pool.query(
      `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING *`,
      [
        user.organizationId,
        String(body.user_id ?? user.uid),
        String(body.type ?? 'info'),
        String(body.title ?? ''),
        body.message ?? null,
        body.link ?? null,
        JSON.stringify(body.metadata ?? {}),
      ],
    );
    return c.json({ data: result.rows[0] }, 201);
  } catch (_error) {
    return c.json({ error: 'Erro ao criar notificação' }, 500);
  }
});

app.put('/:id/read', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  try {
    await ensureNotificationsSchema(pool);

    const result = await pool.query(
      `
        UPDATE notifications
        SET is_read = true
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
      [id, user.uid],
    );

    if (!result.rows.length) {
      return c.json({ error: 'Notificação não encontrada' }, 404);
    }

    return c.json({ ok: true });
  } catch (error) {
    console.error('[Notifications/MarkRead] Error:', error);
    return c.json({ error: 'Erro ao marcar notificação como lida' }, 500);
  }
});

app.put('/read-all', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    await ensureNotificationsSchema(pool);
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [user.uid]);
    return c.json({ ok: true });
  } catch (error) {
    console.error('[Notifications/ReadAll] Error:', error);
    return c.json({ error: 'Erro ao marcar notificações como lidas' }, 500);
  }
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  try {
    await ensureNotificationsSchema(pool);

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.uid],
    );

    if (!result.rows.length) {
      return c.json({ error: 'Notificação não encontrada' }, 404);
    }

    return c.json({ ok: true });
  } catch (error) {
    console.error('[Notifications/Delete] Error:', error);
    return c.json({ error: 'Erro ao excluir notificação' }, 500);
  }
});

export { app as notificationsRoutes };
