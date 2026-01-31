"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPayment = exports.getPatientFinancialSummary = exports.listPayments = void 0;
const https_1 = require("firebase-functions/v2/https");
const init_1 = require("../init");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../lib/logger");
exports.listPayments = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, limit = 50, offset = 0 } = request.data;
    const pool = (0, init_1.getPool)();
    try {
        let query = `
      SELECT p.*,
        pat.name as patient_name,
        prof.full_name as therapist_name
      FROM payments p
      LEFT JOIN patients pat ON p.patient_id = pat.id
      LEFT JOIN profiles prof ON p.therapist_id = prof.user_id
      WHERE p.organization_id = $1
    `;
        const params = [auth.organizationId];
        if (patientId) {
            query += ` AND p.patient_id = $${params.length + 1}`;
            params.push(patientId);
        }
        query += ` ORDER BY p.payment_date DESC, p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        return { data: result.rows };
    }
    catch (error) {
        logger_1.logger.error('Error in listPayments:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao listar pagamentos';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.getPatientFinancialSummary = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se paciente pertence à organização
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // Buscar resumo
        const result = await pool.query(`SELECT
        COALESCE(SUM(p.amount_cents) FILTER (p.status = 'completed'), 0) as total_paid_cents,
        COUNT(p.id) FILTER (p.status = 'completed') as individual_sessions_paid,
        COALESCE(SUM(pkg.sessions_count), 0) as package_sessions_total,
        COALESCE(SUM(pkg.sessions_used), 0) as package_sessions_used,
        COALESCE(SUM(pkg.sessions_count - pkg.sessions_used) FILTER (pkg.is_active = true), 0) as package_sessions_available
      FROM payments p
      LEFT JOIN patient_session_packages pkg ON pkg.patient_id = $1 AND pkg.is_active = true
      WHERE p.patient_id = $1 AND p.organization_id = $2
      GROUP BY p.patient_id`, [patientId, auth.organizationId]);
        // Buscar pacotes ativos
        const packages = await pool.query(`SELECT
        id,
        sessions_count,
        sessions_used,
        amount_cents,
        purchase_date,
        valid_until,
        is_active
      FROM patient_session_packages
      WHERE patient_id = $1 AND is_active = true
        AND valid_until > CURRENT_DATE
      ORDER BY valid_until`, [patientId]);
        return {
            summary: result.rows[0] || {
                total_paid_cents: 0,
                individual_sessions_paid: 0,
                package_sessions_total: 0,
                package_sessions_used: 0,
                package_sessions_available: 0,
            },
            active_packages: packages.rows,
        };
    }
    catch (error) {
        logger_1.logger.error('Error in getPatientFinancialSummary:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar resumo financeiro';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
exports.createPayment = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { patientId, appointmentId, amountCents, method, paymentDate, notes } = request.data;
    if (!patientId || !amountCents || !method) {
        throw new https_1.HttpsError('invalid-argument', 'patientId, amountCents e method são obrigatórios');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se paciente existe
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patientCheck.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // Verificar se appointment existe (se fornecido)
        if (appointmentId) {
            const apt = await pool.query('SELECT id FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId]);
            if (apt.rows.length === 0) {
                throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
            }
        }
        // Inserir pagamento
        const result = await pool.query(`INSERT INTO payments (
        patient_id, appointment_id, amount_cents, method,
        payment_date, organization_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            patientId,
            appointmentId || null,
            amountCents,
            method,
            paymentDate || new Date().toISOString().split('T')[0],
            auth.organizationId,
            notes || null,
        ]);
        const payment = result.rows[0];
        // Publicar no Ably
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientUpdate(patientId, {
                type: 'payment_created',
                paymentId: payment.id,
            });
        }
        catch (e) {
            logger_1.logger.error('Error publishing to Ably:', e);
        }
        return { data: payment };
    }
    catch (error) {
        logger_1.logger.error('Error in createPayment:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar pagamento';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=payments.js.map