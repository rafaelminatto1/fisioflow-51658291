"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventReport = exports.findTransactionByAppointmentId = exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.listTransactions = void 0;
const https_1 = require("firebase-functions/v2/https");
const init_1 = require("../init");
const auth_1 = require("../middleware/auth");
/**
 * Lista transações financeiras
 */
exports.listTransactions = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { limit = 100, offset = 0 } = request.data;
    const pool = (0, init_1.getPool)();
    try {
        const result = await pool.query(`SELECT * FROM transacoes
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`, [auth.organizationId, limit, offset]);
        return { data: result.rows };
    }
    catch (error) {
        console.error('Error in listTransactions:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao listar transações';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Cria uma nova transação
 */
exports.createTransaction = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const data = request.data;
    if (!data.valor || !data.tipo) {
        throw new https_1.HttpsError('invalid-argument', 'Valor e tipo são obrigatórios');
    }
    const pool = (0, init_1.getPool)();
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
        console.error('Error in createTransaction:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar transação';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Atualiza uma transação
 */
exports.updateTransaction = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { transactionId, ...updates } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError('invalid-argument', 'transactionId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
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
        console.error('Error in updateTransaction:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar transação';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Remove uma transação
 */
exports.deleteTransaction = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { transactionId } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError('invalid-argument', 'transactionId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        const result = await pool.query('DELETE FROM transacoes WHERE id = $1 AND organization_id = $2 RETURNING id', [transactionId, auth.organizationId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Transação não encontrada');
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error in deleteTransaction:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir transação';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Busca transação por ID do agendamento (metadados)
 */
exports.findTransactionByAppointmentId = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { appointmentId } = request.data;
    if (!appointmentId) {
        throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
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
        console.error('Error in findTransactionByAppointmentId:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar transação';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Gera relatório financeiro de evento
 */
exports.getEventReport = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const { eventoId } = request.data;
    if (!eventoId) {
        throw new https_1.HttpsError('invalid-argument', 'eventoId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
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
        console.error('Error in getEventReport:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar relatório';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=financial.js.map