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
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT * FROM business_hours WHERE organization_id = $1 ORDER BY day_of_week ASC`,
      [user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch { return c.json(emptyData()); }
});

app.post('/settings/business-hours', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const body = (await c.req.json()) as any[];
    // Limpa horários existentes e insere novos
    await pool.query('DELETE FROM business_hours WHERE organization_id = $1', [user.organizationId]);
    
    const results = [];
    for (const bh of body) {
      const res = await pool.query(
        `INSERT INTO business_hours (organization_id, day_of_week, start_time, end_time, is_closed)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [user.organizationId, bh.day_of_week, bh.start_time, bh.end_time, bh.is_closed || false]
      );
      results.push(res.rows[0]);
    }
    return c.json({ data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/settings/blocked-times', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT * FROM blocked_times WHERE organization_id = $1 ORDER BY start_time ASC`,
      [user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch { return c.json(emptyData()); }
});

app.post('/settings/blocked-times', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const body = (await c.req.json());
    const result = await pool.query(
      `INSERT INTO blocked_times (organization_id, start_time, end_time, reason, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.organizationId, body.start_time, body.end_time, body.reason || null, user.uid]
    );
    return c.json({ data: result.rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/settings/blocked-times/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  try {
    await pool.query(
      `DELETE FROM blocked_times WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/settings/cancellation-rules', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT * FROM cancellation_rules WHERE organization_id = $1 LIMIT 1`,
      [user.organizationId]
    );
    return c.json({ data: result.rows[0] || {} });
  } catch { return c.json(emptyObject()); }
});

app.post('/settings/cancellation-rules', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const body = (await c.req.json());
    const res = await pool.query(
      `INSERT INTO cancellation_rules (organization_id, min_hours_notice, allow_reschedule, cancellation_fee, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (organization_id) DO UPDATE SET
         min_hours_notice = EXCLUDED.min_hours_notice,
         allow_reschedule = EXCLUDED.allow_reschedule,
         cancellation_fee = EXCLUDED.cancellation_fee,
         updated_at = NOW()
       RETURNING *`,
      [user.organizationId, body.min_hours_notice, body.allow_reschedule, body.cancellation_fee]
    );
    return c.json({ data: res.rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/settings/notification-settings', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT * FROM scheduling_notification_settings WHERE organization_id = $1 LIMIT 1`,
      [user.organizationId]
    );
    return c.json({ data: result.rows[0] || {} });
  } catch { return c.json(emptyObject()); }
});

app.post('/settings/notification-settings', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const body = (await c.req.json());
    const res = await pool.query(
      `INSERT INTO scheduling_notification_settings (organization_id, enable_reminders, reminder_hours_before, enable_confirmation, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (organization_id) DO UPDATE SET
         enable_reminders = EXCLUDED.enable_reminders,
         reminder_hours_before = EXCLUDED.reminder_hours_before,
         enable_confirmation = EXCLUDED.enable_confirmation,
         updated_at = NOW()
       RETURNING *`,
      [user.organizationId, body.enable_reminders, body.reminder_hours_before, body.enable_confirmation]
    );
    return c.json({ data: res.rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/capacity-config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT * FROM schedule_capacity WHERE organization_id = $1 ORDER BY day_of_week ASC, start_time ASC`,
      [user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch { return c.json(emptyData()); }
});

app.post('/capacity-config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const body = (await c.req.json());
    const configs = Array.isArray(body) ? body : [body];
    const results = [];
    
    for (const config of configs) {
      const res = await pool.query(
        `INSERT INTO schedule_capacity (organization_id, day_of_week, start_time, end_time, max_patients)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [user.organizationId, config.day_of_week, config.start_time, config.end_time, config.max_patients]
      );
      results.push(res.rows[0]);
    }
    return c.json({ data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/capacity-config/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = (await c.req.json());
    const res = await pool.query(
      `UPDATE schedule_capacity 
       SET day_of_week = $1, start_time = $2, end_time = $3, max_patients = $4, updated_at = NOW()
       WHERE id = $5 AND organization_id = $6 RETURNING *`,
      [body.day_of_week, body.start_time, body.end_time, body.max_patients, id, user.organizationId]
    );
    return c.json({ data: res.rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/capacity-config/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  try {
    await pool.query(
      `DELETE FROM schedule_capacity WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/recurring-series', requireAuth, async (c) => {
  return c.json(emptyData());
});

export { app as schedulingRoutes };
