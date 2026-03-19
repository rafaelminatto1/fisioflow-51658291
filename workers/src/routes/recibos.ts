import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasTable(pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { limit = '100', offset = '0' } = c.req.query();
  const limitNum = Math.min(500, Math.max(1, Number(limit) || 100));
  const offsetNum = Math.max(0, Number(offset) || 0);

  try {
    if (!(await hasTable(pool, 'recibos'))) {
      return c.json({ data: [] });
    }

    const result = await pool.query(
      `SELECT * FROM recibos WHERE organization_id = $1 ORDER BY numero_recibo DESC LIMIT $2 OFFSET $3`,
      [user.organizationId, limitNum, offsetNum],
    );
    return c.json({ data: result.rows || result });
  } catch (error) {
    console.error('[Recibos] Failed to list receipts:', error);
    return c.json({ data: [] });
  }
});

app.get('/last-number', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    if (!(await hasTable(pool, 'recibos'))) {
      return c.json({ data: { last_number: 0 } });
    }

    const result = await pool.query(
      'SELECT MAX(numero_recibo)::bigint AS last_number FROM recibos WHERE organization_id = $1',
      [user.organizationId],
    );
    return c.json({ data: { last_number: result.rows[0]?.last_number ?? 0 } });
  } catch (error) {
    console.error('[Recibos] Failed to fetch last number:', error);
    return c.json({ data: { last_number: 0 } });
  }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'recibos'))) {
    return c.json({ error: 'Tabela recibos indisponível' }, 501);
  }

  const lastNumberRes = await pool.query(
    'SELECT MAX(numero_recibo)::bigint AS last_number FROM recibos WHERE organization_id = $1',
    [user.organizationId],
  );
  const nextNumber = (lastNumberRes.rows[0]?.last_number ?? 0) + 1;

  const result = await pool.query(
    `INSERT INTO recibos
       (organization_id, numero_recibo, patient_id, valor, valor_extenso, referente, data_emissao,
        emitido_por, cpf_cnpj_emitente, assinado, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      nextNumber,
      body.patient_id ?? null,
      Number(body.valor ?? 0),
      body.valor_extenso ?? null,
      body.referente ?? null,
      body.data_emissao ?? new Date().toISOString(),
      body.emitido_por ?? user.email ?? 'Sistema',
      body.cpf_cnpj_emitente ?? null,
      body.assinado === true,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

export const recibosRoutes = app;
