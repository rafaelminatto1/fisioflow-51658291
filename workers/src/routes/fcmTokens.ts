import { Hono } from 'hono';
import type { Env } from '../types/env';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use('*', requireAuth);

app.post('/', async (c) => {
  const db = await createPool(c.env);
  try {
    const body = await c.req.json();
    const { token, userId, tenantId, deviceInfo, active = true } = body;
    const platform = deviceInfo?.platform;
    const deviceModel = deviceInfo?.model;
    const osVersion = deviceInfo?.osVersion;
    const appVersion = deviceInfo?.appVersion;

    if (!token || !userId) {
      return c.json({ error: 'token e userId são obrigatórios' }, 400);
    }

    const result = await db.query(
      `INSERT INTO fcm_tokens (token, user_id, tenant_id, platform, device_model, os_version, app_version, active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       tenant_id = EXCLUDED.tenant_id,
       platform = EXCLUDED.platform,
       device_model = EXCLUDED.device_model,
       os_version = EXCLUDED.os_version,
       app_version = EXCLUDED.app_version,
       active = EXCLUDED.active,
       updated_at = NOW() RETURNING *`,
      [token, userId, tenantId, platform, deviceModel, osVersion, appVersion, active]
    );

    return c.json({ success: true, data: result.rows?.[0] || (result as any)[0] });
  } catch (error: any) {
    console.error('[FCMTokens/Post] Error:', error.message);
    return c.json({ error: 'Erro ao salvar token', details: error.message }, 500);
  }
});

app.delete('/:token', async (c) => {
  const db = await createPool(c.env);
  const { token } = c.req.param();
  try {
    const result = await db.query(
      `UPDATE fcm_tokens SET active = false, updated_at = NOW() WHERE token = $1 RETURNING *`,
      [token]
    );
    return c.json({ success: true, data: result.rows?.[0] || (result as any)[0] });
  } catch (error: any) {
    console.error('[FCMTokens/Delete] Error:', error.message);
    return c.json({ error: 'Erro ao desativar token', details: error.message }, 500);
  }
});

app.get('/user/:userId', async (c) => {
  const db = await createPool(c.env);
  const { userId } = c.req.param();
  try {
    const result = await db.query(
      `SELECT token FROM fcm_tokens WHERE user_id = $1 AND active = true`,
      [userId]
    );
    const rows = result.rows || (result as any);
    return c.json({ data: rows.map((r: any) => r.token) });
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar tokens do usuário', details: error.message }, 500);
  }
});

app.get('/tenant/:tenantId', async (c) => {
  const db = await createPool(c.env);
  const { tenantId } = c.req.param();
  try {
    const result = await db.query(
      `SELECT token FROM fcm_tokens WHERE tenant_id = $1 AND active = true`,
      [tenantId]
    );
    const rows = result.rows || (result as any);
    return c.json({ data: rows.map((r: any) => r.token) });
  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar tokens do tenant', details: error.message }, 500);
  }
});

export { app as fcmTokensRoutes };
