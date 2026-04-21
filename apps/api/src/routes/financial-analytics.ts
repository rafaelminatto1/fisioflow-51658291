import { Hono } from 'hono';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { appointments, patientPackages } from '@fisioflow/db';
import { createDb, createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

type FinancialApp = Hono<{ Bindings: Env; Variables: AuthVariables }>;

export const registerFinancialAnalyticsRoutes = (app: FinancialApp) => {
  app.get('/prediction', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const [futureSchedule] = await db.select({
      expectedRevenue: sql<number>`COALESCE(SUM(${appointments.paymentAmount}), 0)`,
      sessionCount: sql<number>`COUNT(*)`
    })
    .from(appointments)
    .where(and(
      eq(appointments.organizationId, user.organizationId),
      gte(appointments.date, sql`CURRENT_DATE`),
      lte(appointments.date, sql`CURRENT_DATE + INTERVAL '30 days'`),
      sql`${appointments.status}::text NOT IN (
        'cancelado', 'cancelled',
        'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
        'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show'
      )`
    ));

    const [packagesBaseline] = await db.select({
      inventoryValue: sql<number>`COALESCE(SUM(${patientPackages.remainingSessions} * (${patientPackages.price} / NULLIF(${patientPackages.totalSessions}, 0))), 0)`
    })
    .from(patientPackages)
    .where(and(
      eq(patientPackages.organizationId, user.organizationId),
      eq(patientPackages.status, 'active')
    ));

    const [noShowRate] = await db.select({
      rate: sql<number>`(
        COUNT(
          CASE
            WHEN ${appointments.status}::text IN (
              'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
              'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show'
            ) THEN 1
          END
        )::float / NULLIF(COUNT(*), 0)
      )`
    })
    .from(appointments)
    .where(and(
      eq(appointments.organizationId, user.organizationId),
      sql`${appointments.date} < CURRENT_DATE`,
      sql`${appointments.date} >= CURRENT_DATE - INTERVAL '90 days'`
    ));

    const rawExpected = Number(futureSchedule?.expectedRevenue || 0);
    const rate = Number(noShowRate?.rate || 0.1);

    return c.json({
      data: {
        next30Days: {
          raw: rawExpected,
          adjusted: rawExpected * (1 - rate),
          sessions: Number(futureSchedule?.sessionCount || 0),
          confidence: 0.85
        },
        inventory: {
          packageValue: Number(packagesBaseline?.inventoryValue || 0)
        },
        historicalMetrics: {
          noShowRate: rate
        }
      }
    });
  });

  app.get('/card-mapping/:digits', requireAuth, async (c) => {
    const user = c.get('user');
    const digits = c.req.param('digits').replace(/\D/g, '').slice(-4);
    if (digits.length !== 4) return c.json({ data: null });

    const pool = createPool(c.env);
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS card_patient_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id TEXT NOT NULL,
        card_digits CHAR(4) NOT NULL,
        patient_id UUID NOT NULL,
        patient_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(organization_id, card_digits)
      )`);
      const res = await pool.query(
        `SELECT patient_id, patient_name FROM card_patient_mappings WHERE organization_id = $1 AND card_digits = $2`,
        [user.organizationId, digits]
      );
      return c.json({ data: res.rows[0] ?? null });
    } catch {
      return c.json({ data: null });
    }
  });

  app.post('/card-mapping', requireAuth, async (c) => {
    const user = c.get('user');
    const body = await c.req.json() as { patientId: string; cardLastDigits: string; patientName?: string };
    const digits = String(body.cardLastDigits ?? '').replace(/\D/g, '').slice(-4);

    if (!body.patientId || digits.length !== 4) {
      return c.json({ error: 'patientId e cardLastDigits (4 dígitos) são obrigatórios' }, 400);
    }

    const pool = createPool(c.env);
    try {
      await pool.query(
        `INSERT INTO card_patient_mappings (organization_id, card_digits, patient_id, patient_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (organization_id, card_digits) DO UPDATE SET patient_id = EXCLUDED.patient_id, patient_name = EXCLUDED.patient_name`,
        [user.organizationId, digits, body.patientId, body.patientName ?? null]
      );
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: 'Erro ao salvar mapeamento', details: err.message }, 500);
    }
  });
};
