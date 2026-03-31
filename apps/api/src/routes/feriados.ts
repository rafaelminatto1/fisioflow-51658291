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
  const pool = await createPool(c.env);

  // 1. Feriados org-específicos (customizados / estaduais) — sempre do Neon
  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (year) {
    params.push(Number(year));
    conditions.push(`EXTRACT(YEAR FROM data) = $${params.length}`);
  }

  const [orgResult, nacionaisD1] = await Promise.all([
    pool.query(
      `SELECT * FROM feriados WHERE ${conditions.join(' AND ')} ORDER BY data ASC`,
      params,
    ),
    // 2. Feriados nacionais do D1 (zero latência, sem hit no Neon)
    c.env.DB
      ? c.env.DB.prepare(
          year
            ? "SELECT data, nome, tipo FROM feriados_nacionais WHERE data LIKE ? ORDER BY data ASC"
            : "SELECT data, nome, tipo FROM feriados_nacionais ORDER BY data ASC"
        ).bind(year ? `${year}-%` : undefined).all<{ data: string; nome: string; tipo: string }>()
          .then((r) => r.results)
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  // Mapeia nacionais do D1 para o formato esperado pelo frontend (mesclando sem duplicatas)
  const orgDates = new Set((orgResult.rows as FeriadoRow[]).map((r) => r.data?.split('T')[0]));
  const nacionaisMapped = nacionaisD1
    .filter((f) => !orgDates.has(f.data)) // org já definiu override para essa data
    .map((f) => ({
      id: `nacional:${f.data}`,
      organization_id: null,
      nome: f.nome,
      data: f.data,
      tipo: 'nacional' as const,
      recorrente: true,
      bloqueia_agenda: true,
      created_at: f.data,
      updated_at: f.data,
    }));

  const merged = [...(orgResult.rows as FeriadoRow[]), ...nacionaisMapped]
    .sort((a, b) => a.data.localeCompare(b.data));

  return c.json({ data: merged });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
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
  const pool = await createPool(c.env);
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
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'DELETE FROM feriados WHERE id = $1 AND organization_id = $2 RETURNING id',
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Feriado não encontrado' }, 404);
  return c.json({ ok: true });
});

export const feriadosRoutes = app;
