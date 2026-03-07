/**
 * Rotas: Preferências de Notificação
 *
 * GET    /api/notification-preferences
 * PUT    /api/notification-preferences
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const DEFAULT_PREFS = {
  appointment_reminders: true,
  exercise_reminders: true,
  progress_updates: true,
  system_alerts: true,
  therapist_messages: true,
  payment_reminders: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  weekend_notifications: false,
};

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const result = await pool.query(
    'SELECT * FROM notification_preferences WHERE user_id = $1',
    [user.uid],
  );

  if (!result.rows.length) {
    const fallback = {
      user_id: user.uid,
      organization_id: user.organizationId,
      ...DEFAULT_PREFS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return c.json({ data: fallback });
  }

  return c.json({ data: result.rows[0] });
});

app.put('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const prefs = {
    appointment_reminders:
      typeof body.appointment_reminders === 'boolean'
        ? body.appointment_reminders
        : DEFAULT_PREFS.appointment_reminders,
    exercise_reminders:
      typeof body.exercise_reminders === 'boolean'
        ? body.exercise_reminders
        : DEFAULT_PREFS.exercise_reminders,
    progress_updates:
      typeof body.progress_updates === 'boolean'
        ? body.progress_updates
        : DEFAULT_PREFS.progress_updates,
    system_alerts:
      typeof body.system_alerts === 'boolean'
        ? body.system_alerts
        : DEFAULT_PREFS.system_alerts,
    therapist_messages:
      typeof body.therapist_messages === 'boolean'
        ? body.therapist_messages
        : DEFAULT_PREFS.therapist_messages,
    payment_reminders:
      typeof body.payment_reminders === 'boolean'
        ? body.payment_reminders
        : DEFAULT_PREFS.payment_reminders,
    quiet_hours_start: String(body.quiet_hours_start ?? DEFAULT_PREFS.quiet_hours_start),
    quiet_hours_end: String(body.quiet_hours_end ?? DEFAULT_PREFS.quiet_hours_end),
    weekend_notifications:
      typeof body.weekend_notifications === 'boolean'
        ? body.weekend_notifications
        : DEFAULT_PREFS.weekend_notifications,
  };

  const result = await pool.query(
    `INSERT INTO notification_preferences (
      user_id,
      organization_id,
      appointment_reminders,
      exercise_reminders,
      progress_updates,
      system_alerts,
      therapist_messages,
      payment_reminders,
      quiet_hours_start,
      quiet_hours_end,
      weekend_notifications,
      created_at,
      updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      appointment_reminders = EXCLUDED.appointment_reminders,
      exercise_reminders = EXCLUDED.exercise_reminders,
      progress_updates = EXCLUDED.progress_updates,
      system_alerts = EXCLUDED.system_alerts,
      therapist_messages = EXCLUDED.therapist_messages,
      payment_reminders = EXCLUDED.payment_reminders,
      quiet_hours_start = EXCLUDED.quiet_hours_start,
      quiet_hours_end = EXCLUDED.quiet_hours_end,
      weekend_notifications = EXCLUDED.weekend_notifications,
      updated_at = NOW()
    RETURNING *`,
    [
      user.uid,
      user.organizationId,
      prefs.appointment_reminders,
      prefs.exercise_reminders,
      prefs.progress_updates,
      prefs.system_alerts,
      prefs.therapist_messages,
      prefs.payment_reminders,
      prefs.quiet_hours_start,
      prefs.quiet_hours_end,
      prefs.weekend_notifications,
    ],
  );

  return c.json({ data: result.rows[0] });
});

export { app as notificationPreferencesRoutes };
