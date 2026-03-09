/**
 * Rotas: Domínio CRM (Leads, Histórico, Tarefas)
 *
 * GET/POST/PUT/DELETE /api/crm/leads
 * GET/POST            /api/crm/leads/:id/historico
 * GET/POST/PUT/DELETE /api/crm/tarefas
 * GET/POST            /api/crm/campanhas
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== LEADS =====

app.get('/leads', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { estagio, responsavelId, limit = '50', offset = '0' } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (estagio) { params.push(estagio); conditions.push(`estagio = $${params.length}`); }
  if (responsavelId) { params.push(responsavelId); conditions.push(`responsavel_id = $${params.length}`); }

  params.push(Number(limit), Number(offset));
  const result = await pool.query(
    `SELECT * FROM leads WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.get('/leads/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'SELECT * FROM leads WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Lead não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/leads', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO leads
       (organization_id, nome, telefone, email, origem, estagio, responsavel_id,
        data_primeiro_contato, data_ultimo_contato, interesse, observacoes,
        motivo_nao_efetivacao, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.nome),
      body.telefone ?? null,
      body.email ?? null,
      body.origem ?? null,
      body.estagio ?? 'aguardando',
      body.responsavel_id ?? user.uid,
      body.data_primeiro_contato ?? null,
      body.data_ultimo_contato ?? null,
      body.interesse ?? null,
      body.observacoes ?? null,
      body.motivo_nao_efetivacao ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/leads/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) { params.push(body.nome); sets.push(`nome = $${params.length}`); }
  if (body.telefone !== undefined) { params.push(body.telefone); sets.push(`telefone = $${params.length}`); }
  if (body.email !== undefined) { params.push(body.email); sets.push(`email = $${params.length}`); }
  if (body.origem !== undefined) { params.push(body.origem); sets.push(`origem = $${params.length}`); }
  if (body.estagio !== undefined) { params.push(body.estagio); sets.push(`estagio = $${params.length}`); }
  if (body.responsavel_id !== undefined) { params.push(body.responsavel_id); sets.push(`responsavel_id = $${params.length}`); }
  if (body.data_primeiro_contato !== undefined) { params.push(body.data_primeiro_contato); sets.push(`data_primeiro_contato = $${params.length}`); }
  if (body.data_ultimo_contato !== undefined) { params.push(body.data_ultimo_contato); sets.push(`data_ultimo_contato = $${params.length}`); }
  if (body.interesse !== undefined) { params.push(body.interesse); sets.push(`interesse = $${params.length}`); }
  if (body.observacoes !== undefined) { params.push(body.observacoes); sets.push(`observacoes = $${params.length}`); }
  if (body.motivo_nao_efetivacao !== undefined) { params.push(body.motivo_nao_efetivacao); sets.push(`motivo_nao_efetivacao = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE leads SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Lead não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/leads/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM leads WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Lead não encontrado' }, 404);

  await pool.query('DELETE FROM leads WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== HISTORICO DO LEAD =====

app.get('/leads/:id/historico', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const leadCheck = await pool.query(
    'SELECT id FROM leads WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!leadCheck.rows.length) return c.json({ error: 'Lead não encontrado' }, 404);

  const result = await pool.query(
    'SELECT * FROM lead_historico WHERE lead_id = $1 ORDER BY created_at DESC',
    [id],
  );
  return c.json({ data: result.rows });
});

app.post('/leads/:id/historico', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: leadId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const leadCheck = await pool.query(
    'SELECT id FROM leads WHERE id = $1 AND organization_id = $2',
    [leadId, user.organizationId],
  );
  if (!leadCheck.rows.length) return c.json({ error: 'Lead não encontrado' }, 404);

  const result = await pool.query(
    `INSERT INTO lead_historico
       (organization_id, lead_id, tipo_contato, descricao, resultado,
        proximo_contato, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     RETURNING *`,
    [
      user.organizationId,
      leadId,
      body.tipo_contato ?? null,
      body.descricao ?? null,
      body.resultado ?? null,
      body.proximo_contato ?? null,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

// ===== TAREFAS CRM =====

app.get('/tarefas', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { status, responsavelId, leadId } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (responsavelId) { params.push(responsavelId); conditions.push(`responsavel_id = $${params.length}`); }
  if (leadId) { params.push(leadId); conditions.push(`lead_id = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM crm_tarefas WHERE ${conditions.join(' AND ')}
     ORDER BY due_date ASC NULLS LAST, created_at DESC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/tarefas', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.titulo) return c.json({ error: 'titulo é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO crm_tarefas
       (organization_id, titulo, descricao, status, responsavel_id, lead_id, due_date, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.titulo),
      body.descricao ?? null,
      body.status ?? 'pendente',
      body.responsavel_id ?? user.uid,
      body.lead_id ?? null,
      body.due_date ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/tarefas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.titulo !== undefined) { params.push(body.titulo); sets.push(`titulo = $${params.length}`); }
  if (body.descricao !== undefined) { params.push(body.descricao); sets.push(`descricao = $${params.length}`); }
  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
  if (body.responsavel_id !== undefined) { params.push(body.responsavel_id); sets.push(`responsavel_id = $${params.length}`); }
  if (body.lead_id !== undefined) { params.push(body.lead_id); sets.push(`lead_id = $${params.length}`); }
  if (body.due_date !== undefined) { params.push(body.due_date); sets.push(`due_date = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE crm_tarefas SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Tarefa não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/tarefas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM crm_tarefas WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Tarefa não encontrada' }, 404);

  await pool.query('DELETE FROM crm_tarefas WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== CAMPANHAS CRM =====

app.get('/campanhas', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { status, tipo, limit = '50', offset = '0' } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (tipo) { params.push(tipo); conditions.push(`tipo = $${params.length}`); }

  params.push(Number(limit), Number(offset));
  const result = await pool.query(
    `SELECT * FROM crm_campanhas
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/campanhas', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome || !body.tipo) {
    return c.json({ error: 'nome e tipo são obrigatórios' }, 400);
  }

  const patientIds = Array.isArray(body.patient_ids)
    ? body.patient_ids.map((id) => String(id))
    : [];

  const result = await pool.query(
    `INSERT INTO crm_campanhas
       (organization_id, created_by, nome, tipo, conteudo, status, total_destinatarios,
        total_enviados, agendada_em, concluida_em, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      user.uid,
      String(body.nome),
      String(body.tipo),
      body.conteudo ?? null,
      body.status ?? 'concluida',
      patientIds.length,
      patientIds.length,
      body.agendada_em ?? null,
      body.concluida_em ?? new Date().toISOString(),
    ],
  );

  const campaign = result.rows[0] as { id: string };
  for (const patientId of patientIds) {
    await pool.query(
      `INSERT INTO crm_campanha_envios
         (campanha_id, patient_id, canal, status, enviado_em, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [
        campaign.id,
        patientId,
        body.tipo ?? null,
        'enviado',
        body.concluida_em ?? new Date().toISOString(),
      ],
    );
  }

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/campanhas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (body.nome !== undefined) assign('nome', body.nome || null);
  if (body.tipo !== undefined) assign('tipo', body.tipo || null);
  if (body.conteudo !== undefined) assign('conteudo', body.conteudo || null);
  if (body.status !== undefined) assign('status', body.status || null);
  if (body.total_destinatarios !== undefined) assign('total_destinatarios', Number(body.total_destinatarios) || 0);
  if (body.total_enviados !== undefined) assign('total_enviados', Number(body.total_enviados) || 0);
  if (body.agendada_em !== undefined) assign('agendada_em', body.agendada_em || null);
  if (body.concluida_em !== undefined) assign('concluida_em', body.concluida_em || null);

  values.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE crm_campanhas
      SET ${sets.join(', ')}
      WHERE id = $${values.length - 1} AND organization_id = $${values.length}
      RETURNING *
    `,
    values,
  );

  if (!result.rows.length) return c.json({ error: 'Campanha não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/campanhas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  await pool.query(
    'DELETE FROM crm_campanhas WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  return c.json({ ok: true });
});

export { app as crmRoutes };
