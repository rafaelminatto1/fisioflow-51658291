import { CORS_ORIGINS } from "../init";
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { setCorsHeaders } from '../lib/cors';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { Transaction } from '../types/models';
import { logger } from '../lib/logger';

function parseBody(req: any): any { return typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {}); }
function getAuthHeader(req: any): string | undefined { const h = req.headers?.authorization || req.headers?.Authorization; return Array.isArray(h) ? h[0] : h; }
const httpOpts = { region: 'southamerica-east1' as const, memory: '512MiB' as const, maxInstances: 10, cors: CORS_ORIGINS };

export const listTransactionsHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const { limit = 100, offset = 0 } = parseBody(req);
        const result = await getPool().query('SELECT * FROM transacoes WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [auth.organizationId, limit, offset]);
        res.json({ data: result.rows });
    } catch (e: unknown) {
        if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
        logger.error('listTransactionsHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});

export const createTransactionHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const data = parseBody(req);
        if (!data.valor || !data.tipo) { res.status(400).json({ error: 'Valor e tipo são obrigatórios' }); return; }
        const result = await getPool().query('INSERT INTO transacoes (tipo, descricao, valor, status, metadata, organization_id, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [data.tipo, data.descricao || null, data.valor, data.status || 'pendente', data.metadata ? JSON.stringify(data.metadata) : null, auth.organizationId, auth.userId]);
        res.status(201).json({ data: result.rows[0] });
    } catch (e: unknown) {
        if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
        logger.error('createTransactionHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});

export const updateTransactionHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const { transactionId, ...updates } = parseBody(req);
        if (!transactionId) { res.status(400).json({ error: 'transactionId é obrigatório' }); return; }
        const pool = getPool();
        const existing = await pool.query('SELECT id FROM transacoes WHERE id = $1 AND organization_id = $2', [transactionId, auth.organizationId]);
        if (existing.rows.length === 0) { res.status(404).json({ error: 'Transação não encontrada' }); return; }
        const allowedFields = ['tipo', 'descricao', 'valor', 'status', 'metadata'];
        const setClauses: string[] = []; const values: any[] = []; let pc = 0;
        for (const f of allowedFields) {
            if (f in updates) { pc++; setClauses.push(`${f} = $${pc}`); values.push(f === 'metadata' ? JSON.stringify(updates[f]) : updates[f]); }
        }
        if (setClauses.length === 0) { res.status(400).json({ error: 'Nenhum dado para atualizar' }); return; }
        pc++; setClauses.push(`updated_at = $${pc}`); values.push(new Date()); values.push(transactionId, auth.organizationId);
        const result = await pool.query(`UPDATE transacoes SET ${setClauses.join(', ')} WHERE id = $${pc + 1} AND organization_id = $${pc + 2} RETURNING *`, values);
        res.json({ data: result.rows[0] });
    } catch (e: unknown) {
        if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
        logger.error('updateTransactionHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});

export const deleteTransactionHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const { transactionId } = parseBody(req);
        if (!transactionId) { res.status(400).json({ error: 'transactionId é obrigatório' }); return; }
        const result = await getPool().query('DELETE FROM transacoes WHERE id = $1 AND organization_id = $2 RETURNING id', [transactionId, auth.organizationId]);
        if (result.rows.length === 0) { res.status(404).json({ error: 'Transação não encontrada' }); return; }
        res.json({ success: true });
    } catch (e: unknown) {
        if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
        logger.error('deleteTransactionHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});

export const findTransactionByAppointmentIdHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const { appointmentId } = parseBody(req);
        if (!appointmentId) { res.status(400).json({ error: 'appointmentId é obrigatório' }); return; }
        const result = await getPool().query("SELECT * FROM transacoes WHERE organization_id = $1 AND metadata->>'appointment_id' = $2 LIMIT 1", [auth.organizationId, appointmentId]);
        res.json({ data: result.rows[0] || null });
    } catch (e: unknown) {
        if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
        logger.error('findTransactionByAppointmentIdHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});

export const getEventReportHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const { eventoId } = parseBody(req);
        if (!eventoId) { res.status(400).json({ error: 'eventoId é obrigatório' }); return; }
        const pool = getPool();
        const [eventoRes, pagamentosRes, prestadoresRes, checklistRes] = await Promise.all([
            pool.query('SELECT nome FROM eventos WHERE id = $1', [eventoId]),
            pool.query('SELECT tipo, descricao, valor, pago_em FROM pagamentos WHERE evento_id = $1', [eventoId]),
            pool.query('SELECT valor_acordado, status_pagamento FROM prestadores WHERE evento_id = $1', [eventoId]),
            pool.query('SELECT quantidade, custo_unitario FROM checklist_items WHERE evento_id = $1', [eventoId])
        ]);
        if (eventoRes.rows.length === 0) { res.status(404).json({ error: 'Evento não encontrado' }); return; }
        const evento = eventoRes.rows[0]; const pagamentos = pagamentosRes.rows; const prestadores = prestadoresRes.rows; const checklist = checklistRes.rows;
        const receitas = pagamentos.filter((p: any) => p.tipo === 'receita').reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
        const custosPrestadores = prestadores.reduce((s: number, p: any) => s + Number(p.valor_acordado || 0), 0);
        const custosInsumos = checklist.reduce((s: number, c: any) => s + Number(c.quantidade || 0) * Number(c.custo_unitario || 0), 0);
        const outrosCustos = pagamentos.filter((p: any) => p.tipo !== 'receita').reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
        const custoTotal = custosPrestadores + custosInsumos + outrosCustos; const saldo = receitas - custoTotal; const margem = receitas > 0 ? Math.round((saldo / receitas) * 100) : 0;
        const pagamentosPendentes = prestadores.filter((p: any) => p.status_pagamento === 'PENDENTE').reduce((s: number, p: any) => s + Number(p.valor_acordado || 0), 0);
        res.json({ data: { eventoId, eventoNome: evento.nome, receitas, custosPrestadores, custosInsumos, outrosCustos, custoTotal, saldo, margem, pagamentosPendentes, detalhePagamentos: pagamentos.map((p: any) => ({ tipo: p.tipo, descricao: p.descricao || '', valor: Number(p.valor || 0), pagoEm: p.pago_em })) } });
    } catch (e: unknown) {
        if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
        logger.error('getEventReportHttp:', e); res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});

// ============================================================================
// INTERFACES & CALLABLE
// ============================================================================

/**
 * Interfaces
 */
interface ListTransactionsRequest {
    limit?: number;
    offset?: number;
}

interface ListTransactionsResponse {
    data: Transaction[];
}

/**
 * Lista transações financeiras
 */
/**
 * Lista transações financeiras
 */
export const listTransactionsHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { limit = 100, offset = 0 } = request.data;

    const pool = getPool();

    try {
        const result = await pool.query(
            `SELECT * FROM transacoes
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
            [auth.organizationId, limit, offset]
        );

        return { data: result.rows as Transaction[] };
    } catch (error: unknown) {
        logger.error('Error in listTransactions:', error);
        if (error instanceof HttpsError) throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao listar transações';
        throw new HttpsError('internal', errorMessage);
    }
};

export const listTransactions = onCall<ListTransactionsRequest, Promise<ListTransactionsResponse>>(
    { cors: CORS_ORIGINS },
    listTransactionsHandler
);

interface CreateTransactionRequest {
    tipo: 'receita' | 'despesa';
    descricao?: string;
    valor: number;
    status?: string;
    metadata?: Record<string, any>;
}

interface CreateTransactionResponse {
    data: Transaction;
}

/**
 * Cria uma nova transação
 */
/**
 * Cria uma nova transação
 */
export const createTransactionHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const data = request.data;

    if (!data.valor || !data.tipo) {
        throw new HttpsError('invalid-argument', 'Valor e tipo são obrigatórios');
    }

    const pool = getPool();

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

        return { data: result.rows[0] as Transaction };
    } catch (error: unknown) {
        logger.error('Error in createTransaction:', error);
        if (error instanceof HttpsError) throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar transação';
        throw new HttpsError('internal', errorMessage);
    }
};

export const createTransaction = onCall<CreateTransactionRequest, Promise<CreateTransactionResponse>>(
    { cors: CORS_ORIGINS },
    createTransactionHandler
);

interface UpdateTransactionRequest {
    transactionId: string;
    tipo?: 'receita' | 'despesa';
    descricao?: string;
    valor?: number;
    status?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
}

interface UpdateTransactionResponse {
    data: Transaction;
}

/**
 * Atualiza uma transação
 */
/**
 * Atualiza uma transação
 */
export const updateTransactionHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { transactionId, ...updates } = request.data;

    if (!transactionId) {
        throw new HttpsError('invalid-argument', 'transactionId é obrigatório');
    }

    const pool = getPool();

    try {
        const existing = await pool.query(
            'SELECT id FROM transacoes WHERE id = $1 AND organization_id = $2',
            [transactionId, auth.organizationId]
        );

        if (existing.rows.length === 0) {
            throw new HttpsError('not-found', 'Transação não encontrada');
        }

        const setClauses: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

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
            throw new HttpsError('invalid-argument', 'Nenhum data para atualizar');
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

        return { data: result.rows[0] as Transaction };
    } catch (error: unknown) {
        logger.error('Error in updateTransaction:', error);
        if (error instanceof HttpsError) throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar transação';
        throw new HttpsError('internal', errorMessage);
    }
};

export const updateTransaction = onCall<UpdateTransactionRequest, Promise<UpdateTransactionResponse>>(
    { cors: CORS_ORIGINS },
    updateTransactionHandler
);

interface DeleteTransactionRequest {
    transactionId: string;
}

/**
 * Remove uma transação
 */
/**
 * Remove uma transação
 */
export const deleteTransactionHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { transactionId } = request.data;

    if (!transactionId) {
        throw new HttpsError('invalid-argument', 'transactionId é obrigatório');
    }

    const pool = getPool();

    try {
        const result = await pool.query(
            'DELETE FROM transacoes WHERE id = $1 AND organization_id = $2 RETURNING id',
            [transactionId, auth.organizationId]
        );

        if (result.rows.length === 0) {
            throw new HttpsError('not-found', 'Transação não encontrada');
        }

        return { success: true };
    } catch (error: unknown) {
        logger.error('Error in deleteTransaction:', error);
        if (error instanceof HttpsError) throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir transação';
        throw new HttpsError('internal', errorMessage);
    }
};

export const deleteTransaction = onCall<DeleteTransactionRequest, Promise<{ success: boolean }>>(
    { cors: CORS_ORIGINS },
    deleteTransactionHandler
);

interface FindTransactionByAppointmentIdRequest {
    appointmentId: string;
}

interface FindTransactionByAppointmentIdResponse {
    data: Transaction | null;
}

/**
 * Busca transação por ID do agendamento (metadados)
 */
/**
 * Busca transação por ID do agendamento (metadados)
 */
export const findTransactionByAppointmentIdHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await authorizeRequest(request.auth.token);
    const { appointmentId } = request.data;

    if (!appointmentId) {
        throw new HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }

    const pool = getPool();

    try {
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

        return { data: result.rows[0] as Transaction };
    } catch (error: unknown) {
        logger.error('Error in findTransactionByAppointmentId:', error);
        if (error instanceof HttpsError) throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar transação';
        throw new HttpsError('internal', errorMessage);
    }
};

export const findTransactionByAppointmentId = onCall<FindTransactionByAppointmentIdRequest, Promise<FindTransactionByAppointmentIdResponse>>(
    { cors: CORS_ORIGINS },
    findTransactionByAppointmentIdHandler
);

interface GetEventReportRequest {
    eventoId: string;
}

interface GetEventReportResponse {
    data: {
        eventoId: string;
        eventoNome: string;
        receitas: number;
        custosPrestadores: number;
        custosInsumos: number;
        outrosCustos: number;
        custoTotal: number;
        saldo: number;
        margem: number;
        pagamentosPendentes: number;
        detalhePagamentos: any[];
    }
}

/**
 * Gera relatório financeiro de evento
 */
/**
 * Gera relatório financeiro de evento
 */
export const getEventReportHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const { eventoId } = request.data;

    if (!eventoId) {
        throw new HttpsError('invalid-argument', 'eventoId é obrigatório');
    }

    const pool = getPool();

    try {
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
    } catch (error: unknown) {
        logger.error('Error in getEventReport:', error);
        if (error instanceof HttpsError) throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar relatório';
        throw new HttpsError('internal', errorMessage);
    }
};

export const getEventReport = onCall<GetEventReportRequest, Promise<GetEventReportResponse>>(
    { cors: CORS_ORIGINS },
    getEventReportHandler
);
