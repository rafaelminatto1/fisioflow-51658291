import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type FeriadoRow = {
  id: string;
  organization_id?: string;
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'ponto_facultativo';
  recorrente: boolean;
  bloqueia_agenda: boolean;
  created_at: string;
  updated_at: string;
};

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { year } = c.req.query();
  const pool = createPool(c.env);

  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (year) {
    params.push(Number(year));
    conditions.push(`EXTRACT(YEAR FROM data) = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT * FROM feriados WHERE ${conditions.join(' AND ')} ORDER BY data ASC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Partial<FeriadoRow>;

  const result = await pool.query(
    `INSERT INTO feriados
       (organization_id, nome, data, tipo, recorrente, bloqueia_agenda)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      user.organizationId,
      body.nome ?? 'Feriado',
      body.data ?? new Date().toISOString(),
      body.tipo ?? 'nacional',
      body.recorrente ?? true,
      body.bloqueia_agenda ?? true,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Partial<FeriadoRow>;
  const sets: string[] = [];
  const params: unknown[] = [];

  const pushIf = (value: unknown, clause: string) => {
    if (value !== undefined) {
      params.push(value);
      sets.push(clause.replace('?', `$${params.length}`));
    }
  };

  pushIf(body.nome, 'nome = ?');
  pushIf(body.data, 'data = ?');
  pushIf(body.tipo, 'tipo = ?');
  pushIf(body.recorrente, 'recorrente = ?');
  pushIf(body.bloqueia_agenda, 'bloqueia_agenda = ?');

  if (!sets.length) {
    return c.json({ error: 'Nada para atualizar' }, 400);
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE feriados SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Feriado não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'DELETE FROM feriados WHERE id = $1 AND organization_id = $2 RETURNING id',
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Feriado não encontrado' }, 404);
  return c.json({ ok: true });
});

export const feriadosRoutes = app;
