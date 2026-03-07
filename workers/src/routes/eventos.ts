/**
 * Rotas: Eventos, Salas, Serviços, Contratados e Participantes
 * GET/POST/PUT/DELETE /api/eventos
 * GET/POST/PUT/DELETE /api/salas
 * GET/POST/PUT/DELETE /api/servicos
 * GET/POST/PUT/DELETE /api/contratados
 * GET/POST/PUT/DELETE /api/evento-contratados
 * GET/POST/PUT/DELETE /api/participantes
 * GET/POST/PUT/DELETE /api/checklist
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== HELPERS =====
async function tableHasColumn(pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ exists: boolean }> }> }, tableName: string, columnName: string) {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    )`,
    [tableName, columnName],
  );
  return Boolean(result.rows[0]?.exists);
}

// ===== EVENTOS =====

app.get('/eventos', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { status, categoria, limit = '50', offset = '0' } = c.req.query();

  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (categoria) { params.push(categoria); conditions.push(`categoria = $${params.length}`); }
  params.push(Number(limit), Number(offset));

  const result = await pool.query(
    `SELECT * FROM eventos WHERE ${conditions.join(' AND ')} ORDER BY data_inicio DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.get('/eventos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'SELECT * FROM eventos WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/eventos', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const b = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `INSERT INTO eventos (organization_id, nome, descricao, categoria, local, data_inicio, data_fim, hora_inicio, hora_fim, gratuito, link_whatsapp, valor_padrao_prestador, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [user.organizationId, b.nome, b.descricao??null, b.categoria??null, b.local??null,
     b.data_inicio??null, b.data_fim??null, b.hora_inicio??null, b.hora_fim??null,
     b.gratuito??false, b.link_whatsapp??null, b.valor_padrao_prestador??null, b.status??'ativo'],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/eventos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const b = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `UPDATE eventos SET nome=COALESCE($3,nome), descricao=$4, categoria=$5, local=$6, data_inicio=$7, data_fim=$8,
     hora_inicio=$9, hora_fim=$10, gratuito=COALESCE($11,gratuito), link_whatsapp=$12, valor_padrao_prestador=$13,
     status=COALESCE($14,status), updated_at=NOW()
     WHERE id=$1 AND organization_id=$2 RETURNING *`,
    [id, user.organizationId, b.nome??null, b.descricao??null, b.categoria??null, b.local??null,
     b.data_inicio??null, b.data_fim??null, b.hora_inicio??null, b.hora_fim??null,
     b.gratuito??null, b.link_whatsapp??null, b.valor_padrao_prestador??null, b.status??null],
  );
  if (!result.rows.length) return c.json({ error: 'Não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/eventos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  await pool.query('DELETE FROM eventos WHERE id=$1 AND organization_id=$2', [id, user.organizationId]);
  return c.json({ ok: true });
});

// ===== SALAS =====

app.get('/salas', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const result = await pool.query(
    'SELECT * FROM salas WHERE organization_id=$1 ORDER BY nome', [user.organizationId]);
  return c.json({ data: result.rows });
});

app.post('/salas', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const b = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    'INSERT INTO salas (organization_id, nome, capacidade, descricao, cor, ativo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [user.organizationId, b.nome, b.capacidade??1, b.descricao??null, b.cor??null, b.ativo??true],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/salas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const b = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `UPDATE salas SET nome=COALESCE($3,nome), capacidade=COALESCE($4,capacidade), descricao=$5, cor=$6, ativo=COALESCE($7,ativo), updated_at=NOW()
     WHERE id=$1 AND organization_id=$2 RETURNING *`,
    [id, user.organizationId, b.nome??null, b.capacidade??null, b.descricao??null, b.cor??null, b.ativo??null],
  );
  if (!result.rows.length) return c.json({ error: 'Não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/salas/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  await pool.query('DELETE FROM salas WHERE id=$1 AND organization_id=$2', [id, user.organizationId]);
  return c.json({ ok: true });
});

// ===== SERVICOS =====

app.get('/servicos', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const result = await pool.query(
    'SELECT * FROM servicos WHERE organization_id=$1 ORDER BY nome', [user.organizationId]);
  return c.json({ data: result.rows });
});

app.post('/servicos', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const b = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    'INSERT INTO servicos (organization_id, nome, descricao, duracao, valor, cor, ativo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [user.organizationId, b.nome, b.descricao??null, b.duracao??60, b.valor??null, b.cor??null, b.ativo??true],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/servicos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const b = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `UPDATE servicos SET nome=COALESCE($3,nome), descricao=$4, duracao=COALESCE($5,duracao), valor=$6, cor=$7, ativo=COALESCE($8,ativo), updated_at=NOW()
     WHERE id=$1 AND organization_id=$2 RETURNING *`,
    [id, user.organizationId, b.nome??null, b.descricao??null, b.duracao??null, b.valor??null, b.cor??null, b.ativo??null],
  );
  if (!result.rows.length) return c.json({ error: 'Não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/servicos/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  await pool.query('DELETE FROM servicos WHERE id=$1 AND organization_id=$2', [id, user.organizationId]);
  return c.json({ ok: true });
});

// ===== CONTRATADOS =====

app.get('/contratados', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const hasOrg = await tableHasColumn(pool, 'contratados', 'organization_id');

  const result = hasOrg
    ? await pool.query('SELECT * FROM contratados WHERE organization_id = $1 ORDER BY nome ASC', [user.organizationId])
    : await pool.query('SELECT * FROM contratados ORDER BY nome ASC');

  return c.json({ data: result.rows });
});

app.post('/contratados', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const hasOrg = await tableHasColumn(pool, 'contratados', 'organization_id');
  const result = hasOrg
    ? await pool.query(
      `INSERT INTO contratados
         (organization_id, nome, contato, cpf_cnpj, especialidade, observacoes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       RETURNING *`,
      [
        user.organizationId,
        String(body.nome),
        body.contato ?? null,
        body.cpf_cnpj ?? null,
        body.especialidade ?? null,
        body.observacoes ?? null,
      ],
    )
    : await pool.query(
      `INSERT INTO contratados
         (nome, contato, cpf_cnpj, especialidade, observacoes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       RETURNING *`,
      [
        String(body.nome),
        body.contato ?? null,
        body.cpf_cnpj ?? null,
        body.especialidade ?? null,
        body.observacoes ?? null,
      ],
    );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/contratados/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const hasOrg = await tableHasColumn(pool, 'contratados', 'organization_id');

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  if (body.nome !== undefined) { params.push(body.nome); sets.push(`nome = $${params.length}`); }
  if (body.contato !== undefined) { params.push(body.contato); sets.push(`contato = $${params.length}`); }
  if (body.cpf_cnpj !== undefined) { params.push(body.cpf_cnpj); sets.push(`cpf_cnpj = $${params.length}`); }
  if (body.especialidade !== undefined) { params.push(body.especialidade); sets.push(`especialidade = $${params.length}`); }
  if (body.observacoes !== undefined) { params.push(body.observacoes); sets.push(`observacoes = $${params.length}`); }

  if (hasOrg) {
    params.push(id, user.organizationId);
    const result = await pool.query(
      `UPDATE contratados SET ${sets.join(', ')}
       WHERE id = $${params.length - 1} AND organization_id = $${params.length}
       RETURNING *`,
      params,
    );
    if (!result.rows.length) return c.json({ error: 'Contratado não encontrado' }, 404);
    return c.json({ data: result.rows[0] });
  }

  params.push(id);
  const result = await pool.query(
    `UPDATE contratados SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Contratado não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

// ===== CHECKLIST =====

app.get('/checklist', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const eventoId = c.req.query('eventoId');
  if (!eventoId) return c.json({ error: 'eventoId é obrigatório' }, 400);

  const result = await pool.query(
    `
      SELECT *
      FROM checklist_items
      WHERE organization_id = $1 AND evento_id = $2
      ORDER BY created_at DESC
    `,
    [user.organizationId, eventoId],
  );

  return c.json({ data: result.rows });
});

app.post('/checklist', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  if (!body.evento_id) return c.json({ error: 'evento_id é obrigatório' }, 400);
  if (!body.titulo) return c.json({ error: 'titulo é obrigatório' }, 400);

  const result = await pool.query(
    `
      INSERT INTO checklist_items (
        organization_id, evento_id, titulo, tipo, quantidade, custo_unitario, status, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      body.evento_id,
      body.titulo,
      body.tipo ?? 'levar',
      Number(body.quantidade ?? 1),
      Number(body.custo_unitario ?? 0),
      body.status ?? 'ABERTO',
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/checklist/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  if (body.titulo !== undefined) { params.push(body.titulo); sets.push(`titulo = $${params.length}`); }
  if (body.tipo !== undefined) { params.push(body.tipo); sets.push(`tipo = $${params.length}`); }
  if (body.quantidade !== undefined) { params.push(Number(body.quantidade)); sets.push(`quantidade = $${params.length}`); }
  if (body.custo_unitario !== undefined) { params.push(Number(body.custo_unitario)); sets.push(`custo_unitario = $${params.length}`); }
  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE checklist_items
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/checklist/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query('DELETE FROM checklist_items WHERE id = $1 AND organization_id = $2', [
    id,
    user.organizationId,
  ]);

  return c.json({ ok: true });
});

app.delete('/contratados/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const hasOrg = await tableHasColumn(pool, 'contratados', 'organization_id');

  if (hasOrg) {
    await pool.query('DELETE FROM contratados WHERE id = $1 AND organization_id = $2', [id, user.organizationId]);
  } else {
    await pool.query('DELETE FROM contratados WHERE id = $1', [id]);
  }
  return c.json({ ok: true });
});

// ===== EVENTO_CONTRATADOS =====

app.get('/evento-contratados', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { eventoId, contratadoId } = c.req.query();

  const conditions: string[] = ['e.organization_id = $1'];
  const params: unknown[] = [user.organizationId];
  if (eventoId) { params.push(eventoId); conditions.push(`ec.evento_id = $${params.length}`); }
  if (contratadoId) { params.push(contratadoId); conditions.push(`ec.contratado_id = $${params.length}`); }

  const result = await pool.query(
    `SELECT ec.*
     FROM evento_contratados ec
     INNER JOIN eventos e ON e.id = ec.evento_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ec.created_at DESC`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/evento-contratados', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.evento_id || !body.contratado_id) {
    return c.json({ error: 'evento_id e contratado_id são obrigatórios' }, 400);
  }

  const eventoCheck = await pool.query(
    'SELECT id FROM eventos WHERE id = $1 AND organization_id = $2',
    [body.evento_id, user.organizationId],
  );
  if (!eventoCheck.rows.length) return c.json({ error: 'Evento não encontrado' }, 404);

  const hasOrg = await tableHasColumn(pool, 'evento_contratados', 'organization_id');
  const result = hasOrg
    ? await pool.query(
      `INSERT INTO evento_contratados
         (organization_id, evento_id, contratado_id, funcao, valor_acordado, horario_inicio, horario_fim, status_pagamento, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
       RETURNING *`,
      [
        user.organizationId,
        body.evento_id,
        body.contratado_id,
        body.funcao ?? null,
        body.valor_acordado != null ? Number(body.valor_acordado) : 0,
        body.horario_inicio ?? null,
        body.horario_fim ?? null,
        body.status_pagamento ?? 'PENDENTE',
      ],
    )
    : await pool.query(
      `INSERT INTO evento_contratados
         (evento_id, contratado_id, funcao, valor_acordado, horario_inicio, horario_fim, status_pagamento, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       RETURNING *`,
      [
        body.evento_id,
        body.contratado_id,
        body.funcao ?? null,
        body.valor_acordado != null ? Number(body.valor_acordado) : 0,
        body.horario_inicio ?? null,
        body.horario_fim ?? null,
        body.status_pagamento ?? 'PENDENTE',
      ],
    );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/evento-contratados/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  if (body.funcao !== undefined) { params.push(body.funcao); sets.push(`funcao = $${params.length}`); }
  if (body.valor_acordado !== undefined) { params.push(Number(body.valor_acordado)); sets.push(`valor_acordado = $${params.length}`); }
  if (body.horario_inicio !== undefined) { params.push(body.horario_inicio); sets.push(`horario_inicio = $${params.length}`); }
  if (body.horario_fim !== undefined) { params.push(body.horario_fim); sets.push(`horario_fim = $${params.length}`); }
  if (body.status_pagamento !== undefined) { params.push(body.status_pagamento); sets.push(`status_pagamento = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE evento_contratados ec
     SET ${sets.join(', ')}
     WHERE ec.id = $${params.length - 1}
       AND EXISTS (
         SELECT 1 FROM eventos e
         WHERE e.id = ec.evento_id AND e.organization_id = $${params.length}
       )
     RETURNING ec.*`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Vínculo não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/evento-contratados/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query(
    `DELETE FROM evento_contratados ec
     WHERE ec.id = $1
       AND EXISTS (
         SELECT 1 FROM eventos e
         WHERE e.id = ec.evento_id AND e.organization_id = $2
       )`,
    [id, user.organizationId],
  );
  return c.json({ ok: true });
});

// ===== PARTICIPANTES =====

app.get('/participantes', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { eventoId, limit = '100', offset = '0' } = c.req.query();

  const conditions: string[] = ['e.organization_id = $1'];
  const params: unknown[] = [user.organizationId];
  if (eventoId) { params.push(eventoId); conditions.push(`p.evento_id = $${params.length}`); }
  params.push(Number(limit), Number(offset));

  const result = await pool.query(
    `SELECT p.*
     FROM participantes p
     INNER JOIN eventos e ON e.id = p.evento_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/participantes', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.evento_id || !body.nome) return c.json({ error: 'evento_id e nome são obrigatórios' }, 400);

  const eventoCheck = await pool.query(
    'SELECT id FROM eventos WHERE id = $1 AND organization_id = $2',
    [body.evento_id, user.organizationId],
  );
  if (!eventoCheck.rows.length) return c.json({ error: 'Evento não encontrado' }, 404);

  const hasOrg = await tableHasColumn(pool, 'participantes', 'organization_id');
  const result = hasOrg
    ? await pool.query(
      `INSERT INTO participantes
         (organization_id, evento_id, nome, contato, instagram, segue_perfil, observacoes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       RETURNING *`,
      [
        user.organizationId,
        body.evento_id,
        String(body.nome),
        body.contato ?? null,
        body.instagram ?? null,
        body.segue_perfil === true,
        body.observacoes ?? null,
      ],
    )
    : await pool.query(
      `INSERT INTO participantes
         (evento_id, nome, contato, instagram, segue_perfil, observacoes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       RETURNING *`,
      [
        body.evento_id,
        String(body.nome),
        body.contato ?? null,
        body.instagram ?? null,
        body.segue_perfil === true,
        body.observacoes ?? null,
      ],
    );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/participantes/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  if (body.nome !== undefined) { params.push(body.nome); sets.push(`nome = $${params.length}`); }
  if (body.contato !== undefined) { params.push(body.contato); sets.push(`contato = $${params.length}`); }
  if (body.instagram !== undefined) { params.push(body.instagram); sets.push(`instagram = $${params.length}`); }
  if (body.segue_perfil !== undefined) { params.push(body.segue_perfil); sets.push(`segue_perfil = $${params.length}`); }
  if (body.observacoes !== undefined) { params.push(body.observacoes); sets.push(`observacoes = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE participantes p
     SET ${sets.join(', ')}
     WHERE p.id = $${params.length - 1}
       AND EXISTS (
         SELECT 1 FROM eventos e
         WHERE e.id = p.evento_id AND e.organization_id = $${params.length}
       )
     RETURNING p.*`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Participante não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/participantes/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query(
    `DELETE FROM participantes p
     WHERE p.id = $1
       AND EXISTS (
         SELECT 1 FROM eventos e
         WHERE e.id = p.evento_id AND e.organization_id = $2
       )`,
    [id, user.organizationId],
  );
  return c.json({ ok: true });
});

export { app as eventosRoutes };
