/**
 * API Functions: Financial
 * Cloud Functions para gestão financeira
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Pool } from 'pg';
import { authorizeRequest } from '../middleware/auth';

/**
 * Lista transações financeiras
 */
export const listTransactions = onCall(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { limit = 100, offset = 0 } = request.data || {};

    const pool = new Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });

    try {
        const result = await pool.query(
            `SELECT * FROM transacoes
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
            [auth.organizationId, limit, offset]
        );

        return { data: result.rows };
    } finally {
        await pool.end();
    }
});

/**
 * Cria uma nova transação
 */
export const createTransaction = onCall(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const data = request.data || {};

    // Validar campos obrigatórios
    if (!data.valor || !data.tipo) {
        throw new HttpsError('invalid-argument', 'Valor e tipo são obrigatórios');
    }

    const pool = new Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });

    try {
        const result = await pool.query(
            `INSERT INTO transacoes (
        tipo, descricao, valor, status, metadata,
        organization_id, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
            [
                data.tipo,
                data.descricao || null,
                data.valor,
                data.status || 'pendente',
                data.metadata ? JSON.stringify(data.metadata) : null,
                auth.organizationId,
                auth.userId,
            ]
        );

        return { data: result.rows[0] };
    } finally {
        await pool.end();
    }
});

/**
 * Atualiza uma transação
 */
export const updateTransaction = onCall(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { transactionId, ...updates } = request.data || {};

    if (!transactionId) {
        throw new HttpsError('invalid-argument', 'transactionId é obrigatório');
    }

    const pool = new Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });

    try {
        // Validar propriedade
        const existing = await pool.query(
            'SELECT id FROM transacoes WHERE id = $1 AND organization_id = $2',
            [transactionId, auth.organizationId]
        );

        if (existing.rows.length === 0) {
            throw new HttpsError('not-found', 'Transação não encontrada');
        }

        const setClauses: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        const allowedFields = ['tipo', 'descricao', 'valor', 'status', 'metadata'];

        for (const field of allowedFields) {
            if (field in updates) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);
                if (field === 'metadata') {
                    values.push(JSON.stringify(updates[field]));
                } else {
                    values.push(updates[field]);
                }
            }
        }

        if (setClauses.length === 0) {
            throw new HttpsError('invalid-argument', 'Nenhum dado para atualizar');
        }

        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());

        values.push(transactionId, auth.organizationId);

        const query = `
      UPDATE transacoes
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
      RETURNING *
    `;

        const result = await pool.query(query, values);

        return { data: result.rows[0] };
    } finally {
        await pool.end();
    }
});

/**
 * Remove uma transação
 */
export const deleteTransaction = onCall(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { transactionId } = request.data || {};

    if (!transactionId) {
        throw new HttpsError('invalid-argument', 'transactionId é obrigatório');
    }

    const pool = new Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });

    try {
        const result = await pool.query(
            'DELETE FROM transacoes WHERE id = $1 AND organization_id = $2 RETURNING id',
            [transactionId, auth.organizationId]
        );

        if (result.rows.length === 0) {
            throw new HttpsError('not-found', 'Transação não encontrada');
        }

        return { success: true };
    } finally {
        await pool.end();
    }
});

/**
 * Busca transação por ID do agendamento (metadados)
 */
export const findTransactionByAppointmentId = onCall(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { appointmentId } = request.data || {};

    if (!appointmentId) {
        throw new HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }

    const pool = new Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });

    try {
        // Usar operador ->> para acessar JSONB se metadata for JSONB
        // Assumindo metadata é JSONB
        const result = await pool.query(
            `SELECT * FROM transacoes
       WHERE organization_id = $1
         AND metadata->>'appointment_id' = $2
       LIMIT 1`,
            [auth.organizationId, appointmentId]
        );

        if (result.rows.length === 0) {
            return { data: null };
        }

        return { data: result.rows[0] };
    } finally {
        await pool.end();
    }
});

/**
 * Gera relatório financeiro de evento
 */
export const getEventReport = onCall(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const auth = await authorizeRequest(request.auth.token);
    const { eventoId } = request.data || {};

    if (!eventoId) {
        throw new HttpsError('invalid-argument', 'eventoId é obrigatório');
    }

    const pool = new Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });

    try {
        // Buscar dados em paralelo
        const [eventoRes, pagamentosRes, prestadoresRes, checklistRes] = await Promise.all([
            pool.query('SELECT nome FROM eventos WHERE id = $1', [eventoId]),
            pool.query('SELECT tipo, descricao, valor, pago_em FROM pagamentos WHERE evento_id = $1', [eventoId]),
            pool.query('SELECT valor_acordado, status_pagamento FROM prestadores WHERE evento_id = $1', [eventoId]),
            pool.query('SELECT quantidade, custo_unitario FROM checklist_items WHERE evento_id = $1', [eventoId])
        ]);

        if (eventoRes.rows.length === 0) {
            throw new HttpsError('not-found', 'Evento não encontrado');
        }

        const evento = eventoRes.rows[0];
        const pagamentos = pagamentosRes.rows;
        const prestadores = prestadoresRes.rows;
        const checklist = checklistRes.rows;

        const receitas = pagamentos
            .filter((p: any) => p.tipo === 'receita')
            .reduce((sum: number, p: any) => sum + Number(p.valor || 0), 0);

        const custosPrestadores = prestadores
            .reduce((sum: number, p: any) => sum + Number(p.valor_acordado || 0), 0);

        const custosInsumos = checklist
            .reduce((sum: number, c: any) => sum + (Number(c.quantidade || 0) * Number(c.custo_unitario || 0)), 0);

        const outrosCustos = pagamentos
            .filter((p: any) => p.tipo !== 'receita')
            .reduce((sum: number, p: any) => sum + Number(p.valor || 0), 0);

        const custoTotal = custosPrestadores + custosInsumos + outrosCustos;
        const saldo = receitas - custoTotal;
        const margem = receitas > 0 ? Math.round((saldo / receitas) * 100) : 0;

        const pagamentosPendentes = prestadores
            .filter((p: any) => p.status_pagamento === 'PENDENTE')
            .reduce((sum: number, p: any) => sum + Number(p.valor_acordado || 0), 0);

        return {
            data: {
                eventoId,
                eventoNome: evento.nome,
                receitas,
                custosPrestadores,
                custosInsumos,
                outrosCustos,
                custoTotal,
                saldo,
                margem,
                pagamentosPendentes,
                detalhePagamentos: pagamentos.map((p: any) => ({
                    tipo: p.tipo,
                    descricao: p.descricao || '',
                    valor: Number(p.valor || 0),
                    pagoEm: p.pago_em,
                })),
            }
        };
    } finally {
        await pool.end();
    }
});
