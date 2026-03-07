import { Hono } from 'hono';
import type { Env } from '../types/env';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type PrestadorRecord = {
  id: string;
  evento_id: string;
  nome: string;
  contato?: string | null;
  cpf_cnpj?: string | null;
  valor_acordado: number;
  status_pagamento: 'PENDENTE' | 'PAGO';
  created_at: string;
  updated_at: string;
};

type MetricsResponse = {
  count: number;
  last_updated_at: string | null;
};

async function ensureEventBelongsToOrg(
  pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: { organization_id: string }[] }> },
  eventId: string,
  organizationId: string,
) {
  const result = await pool.query('SELECT organization_id FROM eventos WHERE id = $1 LIMIT 1', [eventId]);
  if (!result.rows.length) return null;
  if (result.rows[0].organization_id !== organizationId) return false;
  return true;
}

async function getPrestadorWithEvent(
  pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ evento_id: string; organization_id: string }> }> },
  id: string,
) {
  const result = await pool.query(
    'SELECT p.evento_id, e.organization_id FROM prestadores p JOIN eventos e ON e.id = p.evento_id WHERE p.id = $1 LIMIT 1',
    [id],
  );
  if (!result.rows.length) return null;
  return result.rows[0];
}

app.get('/', requireAuth, async (c) => {
  const { eventoId } = c.req.query();
  if (!eventoId) return c.json({ error: 'eventoId é obrigatório' }, 400);

  const user = c.get('user');
  const pool = createPool(c.env);
  const isOwner = await ensureEventBelongsToOrg(pool, eventoId, user.organizationId);
  if (isOwner === null) return c.json({ error: 'Evento não encontrado' }, 404);
  if (!isOwner) return c.json({ error: 'Acesso negado ao evento' }, 403);

  const prestadores = await pool.query(
    'SELECT * FROM prestadores WHERE evento_id = $1 ORDER BY created_at DESC',
    [eventoId],
  );

  return c.json({ data: prestadores.rows });
});

app.get('/metrics', requireAuth, async (c) => {
  const { eventoId } = c.req.query();
  if (!eventoId) return c.json({ error: 'eventoId é obrigatório' }, 400);

  const user = c.get('user');
  const pool = createPool(c.env);
  const isOwner = await ensureEventBelongsToOrg(pool, eventoId, user.organizationId);
  if (isOwner === null) return c.json({ error: 'Evento não encontrado' }, 404);
  if (!isOwner) return c.json({ error: 'Acesso negado ao evento' }, 403);

  const metricsQuery = await pool.query(
    'SELECT COUNT(*)::int AS count, MAX(updated_at)::text AS last_updated_at FROM prestadores WHERE evento_id = $1',
    [eventoId],
  );

  const metrics = metricsQuery.rows[0] as MetricsResponse;
  return c.json({ data: metrics });
});

app.post('/', requireAuth, async (c) => {
  const body = (await c.req.json()) as Partial<PrestadorRecord> & { evento_id: string; nome: string };
  const { evento_id, nome, contato, cpf_cnpj, valor_acordado, status_pagamento } = body;
  if (!evento_id || !nome) return c.json({ error: 'evento_id e nome são obrigatórios' }, 400);

  const user = c.get('user');
  const pool = createPool(c.env);
  const isOwner = await ensureEventBelongsToOrg(pool, evento_id, user.organizationId);
  if (isOwner === null) return c.json({ error: 'Evento não encontrado' }, 404);
  if (!isOwner) return c.json({ error: 'Acesso negado ao evento' }, 403);

  const result = await pool.query(
    `INSERT INTO prestadores (evento_id, nome, contato, cpf_cnpj, valor_acordado, status_pagamento)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      evento_id,
      nome,
      contato ?? null,
      cpf_cnpj ?? null,
      valor_acordado ?? 0,
      status_pagamento ?? 'PENDENTE',
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/:id', requireAuth, async (c) => {
  const { id } = c.req.param();
  const body = (await c.req.json()) as Partial<PrestadorRecord>;
  const { nome, contato, cpf_cnpj, valor_acordado, status_pagamento } = body;

  const user = c.get('user');
  const pool = createPool(c.env);
  const prestador = await getPrestadorWithEvent(pool, id);
  if (!prestador) return c.json({ error: 'Prestador não encontrado' }, 404);
  if (prestador.organization_id !== user.organizationId) return c.json({ error: 'Acesso negado' }, 403);

  const result = await pool.query(
    `UPDATE prestadores SET nome=COALESCE($2,nome), contato=$3, cpf_cnpj=$4, valor_acordado=COALESCE($5,valor_acordado),
    status_pagamento=COALESCE($6,status_pagamento), updated_at=NOW()
    WHERE id=$1 RETURNING *`,
    [
      id,
      nome ?? null,
      contato ?? null,
      cpf_cnpj ?? null,
      valor_acordado ?? null,
      status_pagamento ?? null,
    ],
  );

  return c.json({ data: result.rows[0] });
});

app.delete('/:id', requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const pool = createPool(c.env);
  const prestador = await getPrestadorWithEvent(pool, id);
  if (!prestador) return c.json({ error: 'Prestador não encontrado' }, 404);
  if (prestador.organization_id !== user.organizationId) return c.json({ error: 'Acesso negado' }, 403);

  await pool.query('DELETE FROM prestadores WHERE id = $1', [id]);
  return c.json({ ok: true });
});

app.put('/:id/status', requireAuth, async (c) => {
  const { id } = c.req.param();
  const body = (await c.req.json()) as { status?: 'PENDENTE' | 'PAGO' };
  const user = c.get('user');
  const pool = createPool(c.env);
  const prestador = await getPrestadorWithEvent(pool, id);
  if (!prestador) return c.json({ error: 'Prestador não encontrado' }, 404);
  if (prestador.organization_id !== user.organizationId) return c.json({ error: 'Acesso negado' }, 403);

  const current = await pool.query('SELECT status_pagamento FROM prestadores WHERE id = $1 LIMIT 1', [id]);
  const currentStatus = current.rows[0]?.status_pagamento ?? 'PENDENTE';
  const nextStatus = body.status ?? (currentStatus === 'PAGO' ? 'PENDENTE' : 'PAGO');

  const result = await pool.query(
    'UPDATE prestadores SET status_pagamento = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, nextStatus],
  );

  return c.json({ data: result.rows[0] });
});

export const prestadoresRoutes = app;
