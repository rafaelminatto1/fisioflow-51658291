import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { isUuid } from '../lib/validators';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/commissions/summary?month=2026-03
app.get('/summary', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { month } = c.req.query(); // formato: YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return c.json({ error: 'Parâmetro month inválido (use YYYY-MM)' }, 400);
  }

  const [year, mon] = month.split('-');
  const periodStart = `${year}-${mon}-01`;
  const periodEnd = new Date(Number(year), Number(mon), 0).toISOString().split('T')[0]; // último dia do mês

  // Busca sessões por terapeuta no período + taxa de comissão configurada
  const result = await pool.query(
    `
    SELECT
      s.therapist_id,
      COUNT(s.id) AS total_sessions,
      COALESCE(SUM(a.price), 0) AS total_revenue,
      COALESCE(tc.commission_rate, 40.00) AS commission_rate,
      COALESCE(SUM(a.price) * COALESCE(tc.commission_rate, 40.00) / 100, 0) AS commission_amount,
      COALESCE(
        (SELECT status FROM commission_payouts cp
         WHERE cp.organization_id = $1 AND cp.therapist_id = s.therapist_id
           AND cp.period_start = $2::date AND cp.period_end = $3::date
         LIMIT 1), 'pendente'
      ) AS payout_status
    FROM sessions s
    LEFT JOIN appointments a ON a.id = s.appointment_id
    LEFT JOIN LATERAL (
      SELECT commission_rate FROM therapist_commissions
      WHERE organization_id = $1 AND therapist_id = s.therapist_id
        AND effective_from <= $2::date
      ORDER BY effective_from DESC LIMIT 1
    ) tc ON TRUE
    WHERE s.organization_id = $1
      AND s.created_at >= $2::timestamptz
      AND s.created_at < ($3::date + INTERVAL '1 day')::timestamptz
    GROUP BY s.therapist_id, tc.commission_rate
    ORDER BY total_revenue DESC
    `,
    [user.organizationId, periodStart, periodEnd],
  );

  return c.json({ data: result.rows || [], period: { start: periodStart, end: periodEnd } });
});

// GET /api/commissions/therapist/:id?limit=12
app.get('/therapist/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { limit: lim } = c.req.query();
  const pool = createPool(c.env);

  const result = await pool.query(
    `SELECT * FROM commission_payouts
     WHERE organization_id = $1 AND therapist_id = $2
     ORDER BY period_start DESC LIMIT $3`,
    [user.organizationId, id, Math.min(Number(lim) || 12, 36)],
  );

  return c.json({ data: result.rows || [] });
});

// POST /api/commissions/config — configurar taxa de comissão
app.post('/config', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json()) as {
    therapist_id: string;
    commission_rate: number;
    effective_from?: string;
    notes?: string;
  };

  if (!body.therapist_id) return c.json({ error: 'therapist_id é obrigatório' }, 400);
  if (body.commission_rate == null || body.commission_rate < 0 || body.commission_rate > 100) {
    return c.json({ error: 'commission_rate deve ser entre 0 e 100' }, 400);
  }

  const pool = createPool(c.env);
  const result = await pool.query(
    `INSERT INTO therapist_commissions (organization_id, therapist_id, commission_rate, effective_from, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [
      user.organizationId,
      body.therapist_id,
      body.commission_rate,
      body.effective_from ?? new Date().toISOString().split('T')[0],
      body.notes ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// POST /api/commissions/payout — marcar período como pago
app.post('/payout', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json()) as {
    therapist_id: string;
    period_start: string;
    period_end: string;
    total_sessions: number;
    total_revenue: number;
    commission_rate: number;
    commission_amount: number;
    notes?: string;
  };

  if (!body.therapist_id || !body.period_start || !body.period_end) {
    return c.json({ error: 'therapist_id, period_start e period_end são obrigatórios' }, 400);
  }

  const pool = createPool(c.env);

  // Upsert — se já existe, atualiza para pago
  const result = await pool.query(
    `INSERT INTO commission_payouts
      (organization_id, therapist_id, period_start, period_end, total_sessions,
       total_revenue, commission_rate, commission_amount, status, paid_at, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pago',NOW(),$9)
     ON CONFLICT (organization_id, therapist_id, period_start, period_end)
     DO UPDATE SET status = 'pago', paid_at = NOW(), notes = EXCLUDED.notes
     RETURNING *`,
    [
      user.organizationId,
      body.therapist_id,
      body.period_start,
      body.period_end,
      body.total_sessions ?? 0,
      body.total_revenue ?? 0,
      body.commission_rate,
      body.commission_amount,
      body.notes ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// GET /api/commissions/config?therapistId=xxx
app.get('/config', requireAuth, async (c) => {
  const user = c.get('user');
  const { therapistId } = c.req.query();
  const pool = createPool(c.env);

  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (therapistId) {
    params.push(therapistId);
    conditions.push(`therapist_id = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT DISTINCT ON (therapist_id) * FROM therapist_commissions
     WHERE ${conditions.join(' AND ')}
     ORDER BY therapist_id, effective_from DESC`,
    params,
  );

  return c.json({ data: result.rows || [] });
});

export { app as commissionsRoutes };
