import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Helper para retornar sucesso vazio (blindagem)
const emptyData = () => ({ data: [] });
const emptyObject = () => ({ data: {} });

app.get('/waitlist', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT * FROM waitlist WHERE organization_id = $1 AND status = 'waiting' ORDER BY created_at ASC`,
      [user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch { return c.json(emptyData()); }
});

app.get('/settings/business-hours', requireAuth, async (c) => {
  return c.json(emptyData());
});

app.get('/settings/blocked-times', requireAuth, async (c) => {
  return c.json(emptyData());
});

app.get('/settings/cancellation-rules', requireAuth, async (c) => {
  return c.json(emptyObject());
});

app.get('/settings/notification-settings', requireAuth, async (c) => {
  return c.json(emptyObject());
});

app.get('/capacity-config', requireAuth, async (c) => {
  return c.json(emptyData());
});

app.get('/recurring-series', requireAuth, async (c) => {
  return c.json(emptyData());
});

export { app as schedulingRoutes };
