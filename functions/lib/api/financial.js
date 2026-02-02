"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventReport = exports.findTransactionByAppointmentId = exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.listTransactions = exports.getEventReportHttp = exports.findTransactionByAppointmentIdHttp = exports.deleteTransactionHttp = exports.updateTransactionHttp = exports.createTransactionHttp = exports.listTransactionsHttp = void 0;
const init_1 = require("../init");
const https_1 = require("firebase-functions/v2/https");
const init_2 = require("../init");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../lib/logger");
function setCorsHeaders(res) { res.set('Access-Control-Allow-Origin', '*'); res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); }
function parseBody(req) { return typeof req.body === 'string' ? (() => { try {
    return JSON.parse(req.body || '{}');
}
catch {
    return {};
} })() : (req.body || {}); }
function getAuthHeader(req) { const h = req.headers?.authorization || req.headers?.Authorization; return Array.isArray(h) ? h[0] : h; }
const httpOpts = { region: 'southamerica-east1', memory: '256MiB', maxInstances: 100, cors: true };
exports.listTransactionsHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    setCorsHeaders(res);
    try {
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)));
        const { limit = 100, offset = 0 } = parseBody(req);
        const result = await (0, init_2.getPool)().query('SELECT * FROM transacoes WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [auth.organizationId, limit, offset]);
        res.json({ data: result.rows });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('listTransactionsHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.createTransactionHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    setCorsHeaders(res);
    try {
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)));
        const data = parseBody(req);
        if (!data.valor || !data.tipo) {
            res.status(400).json({ error: 'Valor e tipo são obrigatórios' });
            return;
        }
        const result = await (0, init_2.getPool)().query('INSERT INTO transacoes (tipo, descricao, valor, status, metadata, organization_id, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [data.tipo, data.descricao || null, data.valor, data.status || 'pendente', data.metadata ? JSON.stringify(data.metadata) : null, auth.organizationId, auth.userId]);
        res.status(201).json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('createTransactionHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.updateTransactionHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    setCorsHeaders(res);
    try {
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)));
        const { transactionId, ...updates } = parseBody(req);
        if (!transactionId) {
            res.status(400).json({ error: 'transactionId é obrigatório' });
            return;
        }
        const pool = (0, init_2.getPool)();
        const existing = await pool.query('SELECT id FROM transacoes WHERE id = $1 AND organization_id = $2', [transactionId, auth.organizationId]);
        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Transação não encontrada' });
            return;
        }
        const allowedFields = ['tipo', 'descricao', 'valor', 'status', 'metadata'];
        const setClauses = [];
        const values = [];
        let pc = 0;
        for (const f of allowedFields) {
            if (f in updates) {
                pc++;
                setClauses.push(`${f} = $${pc}`);
                values.push(f === 'metadata' ? JSON.stringify(updates[f]) : updates[f]);
            }
        }
        if (setClauses.length === 0) {
            res.status(400).json({ error: 'Nenhum dado para atualizar' });
            return;
        }
        pc++;
        setClauses.push(`updated_at = $${pc}`);
        values.push(new Date());
        values.push(transactionId, auth.organizationId);
        const result = await pool.query(`UPDATE transacoes SET ${setClauses.join(', ')} WHERE id = $${pc + 1} AND organization_id = $${pc + 2} RETURNING *`, values);
        res.json({ data: result.rows[0] });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('updateTransactionHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.deleteTransactionHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    setCorsHeaders(res);
    try {
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)));
        const { transactionId } = parseBody(req);
        if (!transactionId) {
            res.status(400).json({ error: 'transactionId é obrigatório' });
            return;
        }
        const result = await (0, init_2.getPool)().query('DELETE FROM transacoes WHERE id = $1 AND organization_id = $2 RETURNING id', [transactionId, auth.organizationId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Transação não encontrada' });
            return;
        }
        res.json({ success: true });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('deleteTransactionHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.findTransactionByAppointmentIdHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    setCorsHeaders(res);
    try {
        const auth = await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)));
        const { appointmentId } = parseBody(req);
        if (!appointmentId) {
            res.status(400).json({ error: 'appointmentId é obrigatório' });
            return;
        }
        const result = await (0, init_2.getPool)().query("SELECT * FROM transacoes WHERE organization_id = $1 AND metadata->>'appointment_id' = $2 LIMIT 1", [auth.organizationId, appointmentId]);
        res.json({ data: result.rows[0] || null });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('findTransactionByAppointmentIdHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
exports.getEventReportHttp = (0, https_1.onRequest)(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    setCorsHeaders(res);
    try {
        await (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)));
        const { eventoId } = parseBody(req);
        if (!eventoId) {
            res.status(400).json({ error: 'eventoId é obrigatório' });
            return;
        }
        const pool = (0, init_2.getPool)();
        const [eventoRes, pagamentosRes, prestadoresRes, checklistRes] = await Promise.all([
            pool.query('SELECT nome FROM eventos WHERE id = $1', [eventoId]),
            pool.query('SELECT tipo, descricao, valor, pago_em FROM pagamentos WHERE evento_id = $1', [eventoId]),
            pool.query('SELECT valor_acordado, status_pagamento FROM prestadores WHERE evento_id = $1', [eventoId]),
            pool.query('SELECT quantidade, custo_unitario FROM checklist_items WHERE evento_id = $1', [eventoId])
        ]);
        if (eventoRes.rows.length === 0) {
            res.status(404).json({ error: 'Evento não encontrado' });
            return;
        }
        const evento = eventoRes.rows[0];
        const pagamentos = pagamentosRes.rows;
        const prestadores = prestadoresRes.rows;
        const checklist = checklistRes.rows;
        const receitas = pagamentos.filter((p) => p.tipo === 'receita').reduce((s, p) => s + Number(p.valor || 0), 0);
        const custosPrestadores = prestadores.reduce((s, p) => s + Number(p.valor_acordado || 0), 0);
        const custosInsumos = checklist.reduce((s, c) => s + Number(c.quantidade || 0) * Number(c.custo_unitario || 0), 0);
        const outrosCustos = pagamentos.filter((p) => p.tipo !== 'receita').reduce((s, p) => s + Number(p.valor || 0), 0);
        const custoTotal = custosPrestadores + custosInsumos + outrosCustos;
        const saldo = receitas - custoTotal;
        const margem = receitas > 0 ? Math.round((saldo / receitas) * 100) : 0;
        const pagamentosPendentes = prestadores.filter((p) => p.status_pagamento === 'PENDENTE').reduce((s, p) => s + Number(p.valor_acordado || 0), 0);
        res.json({ data: { eventoId, eventoNome: evento.nome, receitas, custosPrestadores, custosInsumos, outrosCustos, custoTotal, saldo, margem, pagamentosPendentes, detalhePagamentos: pagamentos.map((p) => ({ tipo: p.tipo, descricao: p.descricao || '', valor: Number(p.valor || 0), pagoEm: p.pago_em })) } });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError && e.code === 'unauthenticated') {
            res.status(401).json({ error: e.message });
            return;
        }
        logger_1.logger.error('getEventReportHttp:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
    }
});
/**
 * Lista transações financeiras
 */
exports.listTransactions = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { limit = 100, offset = 0 } = request.data;
    const pool = (0, init_2.getPool)();
    try {
        const result = await pool.query(`SELECT * FROM transacoes
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`, [auth.organizationId, limit, offset]);
        return { data: result.rows };
    }
    catch (error) {
        logger_1.logger.error('Error in listTransactions:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao listar transações';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Cria uma nova transação
 */
exports.createTransaction = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const data = request.data;
    if (!data.valor || !data.tipo) {
        throw new https_1.HttpsError('invalid-argument', 'Valor e tipo são obrigatórios');
    }
    const pool = (0, init_2.getPool)();
    try {
        const result = await pool.query(`INSERT INTO transacoes (
        tipo, descricao, valor, status, metadata,
        organization_id, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            data.tipo,
            data.descricao || null,
            data.valor,
            data.status || 'pendente',
            data.metadata ? JSON.stringify(data.metadata) : null,
            auth.organizationId,
            auth.userId,
        ]);
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in createTransaction:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar transação';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Atualiza uma transação
 */
exports.updateTransaction = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { transactionId, ...updates } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError('invalid-argument', 'transactionId é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        const existing = await pool.query('SELECT id FROM transacoes WHERE id = $1 AND organization_id = $2', [transactionId, auth.organizationId]);
        if (existing.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Transação não encontrada');
        }
        const setClauses = [];
        const values = [];
        let paramCount = 0;
        const allowedFields = ['tipo', 'descricao', 'valor', 'status', 'metadata'];
        for (const field of allowedFields) {
            if (field in updates) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);
                if (field === 'metadata') {
                    values.push(JSON.stringify(updates[field]));
                }
                else {
                    values.push(updates[field]);
                }
            }
        }
        if (setClauses.length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'Nenhum dado para atualizar');
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
    }
    catch (error) {
        logger_1.logger.error('Error in updateTransaction:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar transação';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Remove uma transação
 */
exports.deleteTransaction = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { transactionId } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError('invalid-argument', 'transactionId é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        const result = await pool.query('DELETE FROM transacoes WHERE id = $1 AND organization_id = $2 RETURNING id', [transactionId, auth.organizationId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Transação não encontrada');
        }
        return { success: true };
    }
    catch (error) {
        logger_1.logger.error('Error in deleteTransaction:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir transação';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Busca transação por ID do agendamento (metadados)
 */
exports.findTransactionByAppointmentId = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { appointmentId } = request.data;
    if (!appointmentId) {
        throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        const result = await pool.query(`SELECT * FROM transacoes
       WHERE organization_id = $1
         AND metadata->>'appointment_id' = $2
       LIMIT 1`, [auth.organizationId, appointmentId]);
        if (result.rows.length === 0) {
            return { data: null };
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        logger_1.logger.error('Error in findTransactionByAppointmentId:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar transação';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Gera relatório financeiro de evento
 */
exports.getEventReport = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const { eventoId } = request.data;
    if (!eventoId) {
        throw new https_1.HttpsError('invalid-argument', 'eventoId é obrigatório');
    }
    const pool = (0, init_2.getPool)();
    try {
        const [eventoRes, pagamentosRes, prestadoresRes, checklistRes] = await Promise.all([
            pool.query('SELECT nome FROM eventos WHERE id = $1', [eventoId]),
            pool.query('SELECT tipo, descricao, valor, pago_em FROM pagamentos WHERE evento_id = $1', [eventoId]),
            pool.query('SELECT valor_acordado, status_pagamento FROM prestadores WHERE evento_id = $1', [eventoId]),
            pool.query('SELECT quantidade, custo_unitario FROM checklist_items WHERE evento_id = $1', [eventoId])
        ]);
        if (eventoRes.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Evento não encontrado');
        }
        const evento = eventoRes.rows[0];
        const pagamentos = pagamentosRes.rows;
        const prestadores = prestadoresRes.rows;
        const checklist = checklistRes.rows;
        const receitas = pagamentos
            .filter((p) => p.tipo === 'receita')
            .reduce((sum, p) => sum + Number(p.valor || 0), 0);
        const custosPrestadores = prestadores
            .reduce((sum, p) => sum + Number(p.valor_acordado || 0), 0);
        const custosInsumos = checklist
            .reduce((sum, c) => sum + (Number(c.quantidade || 0) * Number(c.custo_unitario || 0)), 0);
        const outrosCustos = pagamentos
            .filter((p) => p.tipo !== 'receita')
            .reduce((sum, p) => sum + Number(p.valor || 0), 0);
        const custoTotal = custosPrestadores + custosInsumos + outrosCustos;
        const saldo = receitas - custoTotal;
        const margem = receitas > 0 ? Math.round((saldo / receitas) * 100) : 0;
        const pagamentosPendentes = prestadores
            .filter((p) => p.status_pagamento === 'PENDENTE')
            .reduce((sum, p) => sum + Number(p.valor_acordado || 0), 0);
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
                detalhePagamentos: pagamentos.map((p) => ({
                    tipo: p.tipo,
                    descricao: p.descricao || '',
                    valor: Number(p.valor || 0),
                    pagoEm: p.pago_em,
                })),
            }
        };
    }
    catch (error) {
        logger_1.logger.error('Error in getEventReport:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar relatório';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=financial.js.map