/**
 * Patient Financial Records API - CRUD for patient session payments
 *
 * Provides endpoints for:
 * - Creating, reading, updating, deleting financial records
 * - Listing patient financial history
 * - Applying partnership discounts automatically
 */

import { getPool } from '../init';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { setCorsHeaders } from '../lib/cors';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { PatientFinancialRecord } from '../types/models';
import { logger } from '../lib/logger';
// import { DATABASE_FUNCTION, withCors } from '../lib/function-config'; // Not used after CORS fix

function parseBody(req: any): any {
    return typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
}

function getAuthHeader(req: any): string | undefined {
    const h = req.headers?.authorization || req.headers?.Authorization;
    return Array.isArray(h) ? h[0] : h;
}

const httpOpts = {
  region: 'southamerica-east1',
  maxInstances: 1,
  invoker: 'public',
};

function handleError(origin: string, e: unknown, res?: any) {
    logger.error(`${origin}:`, e);
    const message = e instanceof Error ? e.message : 'Erro desconhecido';

    if (res) {
        if (e instanceof HttpsError && e.code === 'unauthenticated') {
            return res.status(401).json({ error: e.message });
        }
        return res.status(500).json({ error: message });
    }

    if (e instanceof HttpsError) throw e;
    throw new HttpsError('internal', message);
}

// Helper to calculate final value with discount
function calculateFinalValue(sessionValue: number, discountType: string, discountValue: number): number {
    if (discountType === 'percentage') {
        return sessionValue - (sessionValue * (discountValue / 100));
    } else if (discountType === 'fixed') {
        return Math.max(0, sessionValue - discountValue);
    }
    return sessionValue;
}

// ============================================================================
// Business Logic
// ============================================================================

async function listPatientFinancialRecordsLogic(auth: any, data: any) {
    const { patientId, limit = 100, offset = 0, status } = data;

    if (!patientId) {
        throw new HttpsError('invalid-argument', 'patientId é obrigatório');
    }

    // Verify patient belongs to organization
    const patientCheck = await getPool().query(
        'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
        [patientId, auth.organizationId]
    );

    if (patientCheck.rows.length === 0) {
        throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    let query = 'SELECT * FROM patient_financial_records WHERE patient_id = $1 AND organization_id = $2';
    const params: any[] = [patientId, auth.organizationId];

    if (status) {
        query += ' AND payment_status = $3';
        params.push(status);
    }

    query += ' ORDER BY session_date DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await getPool().query(query, params);

    // Fetch partnership details if any
    const records = await Promise.all(
        result.rows.map(async (record) => {
            if (record.partnership_id) {
                const partnership = await getPool().query(
                    'SELECT name, discount_type, discount_value FROM partnerships WHERE id = $1',
                    [record.partnership_id]
                );
                return {
                    ...record,
                    partnership: partnership.rows[0] || null
                };
            }
            return { ...record, partnership: null };
        })
    );

    return { data: records };
}

async function listAllFinancialRecordsLogic(auth: any, data: any) {
    const { limit = 100, offset = 0, startDate, endDate } = data;

    let query = `
      SELECT pfr.*, p.name as patient_name
      FROM patient_financial_records pfr
      JOIN patients p ON pfr.patient_id = p.id
      WHERE pfr.organization_id = $1
    `;
    const params: any[] = [auth.organizationId];
    let paramCount = 1;

    if (startDate) {
        query += ` AND pfr.session_date >= $${++paramCount}`;
        params.push(startDate);
    }
    if (endDate) {
        query += ` AND pfr.session_date <= $${++paramCount}`;
        params.push(endDate);
    }

    query += ` ORDER BY pfr.session_date DESC, pfr.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await getPool().query(query, params);
    return { data: result.rows };
}

async function getPatientFinancialSummaryLogic(auth: any, data: any) {
    const { patientId } = data;

    if (!patientId) {
        throw new HttpsError('invalid-argument', 'patientId é obrigatório');
    }

    // Verify patient belongs to organization
    const patientCheck = await getPool().query(
        'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
        [patientId, auth.organizationId]
    );

    if (patientCheck.rows.length === 0) {
        throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    const result = await getPool().query(
        `SELECT
            COUNT(*) as total_sessions,
            COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_sessions,
            COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_sessions,
            COALESCE(SUM(final_value), 0) as total_value,
            COALESCE(SUM(paid_amount), 0) as total_paid,
            COALESCE(SUM(final_value) FILTER (WHERE payment_status = 'pending'), 0) as total_pending,
            COALESCE(AVG(final_value), 0) as average_session_value
        FROM patient_financial_records
        WHERE patient_id = $1 AND organization_id = $2`,
        [patientId, auth.organizationId]
    );

    const summary = result.rows[0];

    return {
        data: {
            total_sessions: parseInt(summary.total_sessions),
            paid_sessions: parseInt(summary.paid_sessions),
            pending_sessions: parseInt(summary.pending_sessions),
            total_value: parseFloat(summary.total_value),
            total_paid: parseFloat(summary.total_paid),
            total_pending: parseFloat(summary.total_pending),
            average_session_value: parseFloat(summary.average_session_value)
        }
    };
}

async function createFinancialRecordLogic(auth: any, data: any) {
    const {
        patient_id,
        appointment_id,
        session_date,
        session_value,
        payment_method,
        payment_status = 'pending',
        paid_amount = 0,
        paid_date,
        notes,
        is_barter = false,
        barter_notes
    } = data;

    if (!patient_id) {
        throw new HttpsError('invalid-argument', 'patient_id é obrigatório');
    }
    if (!session_date) {
        throw new HttpsError('invalid-argument', 'session_date é obrigatório');
    }
    if (session_value === undefined || session_value === null) {
        throw new HttpsError('invalid-argument', 'session_value é obrigatório');
    }

    // Verify patient belongs to organization and get partnership info
    const patient = await getPool().query(
        `SELECT p.id, p.partnership_id, p.name,
            part.id as partnership_id, part.discount_type, part.discount_value, part.allows_barter
        FROM patients p
        LEFT JOIN partnerships part ON p.partnership_id = part.id AND part.is_active = true
        WHERE p.id = $1 AND p.organization_id = $2`,
        [patient_id, auth.organizationId]
    );

    if (patient.rows.length === 0) {
        throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    const patientData = patient.rows[0];
    let discount_value = 0;
    let discount_type: 'percentage' | 'fixed' | 'partnership' | null = null;
    const partnership_id = patientData.partnership_id;

    // Apply partnership discount if applicable
    if (patientData.partnership_id && !is_barter) {
        discount_type = 'partnership';
        if (patientData.discount_type === 'percentage') {
            discount_value = session_value * (patientData.discount_value / 100);
        } else {
            discount_value = patientData.discount_value;
        }
    }

    const final_value = calculateFinalValue(session_value, discount_type || 'none', discount_value);

    const result = await getPool().query(
        `INSERT INTO patient_financial_records (
            organization_id, patient_id, appointment_id, session_date, session_value,
            discount_value, discount_type, partnership_id, final_value, payment_method,
            payment_status, paid_amount, paid_date, notes, is_barter, barter_notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
            auth.organizationId,
            patient_id,
            appointment_id || null,
            session_date,
            session_value,
            discount_value,
            discount_type,
            partnership_id || null,
            final_value,
            payment_method || null,
            payment_status,
            paid_amount || 0,
            paid_date || null,
            notes || null,
            is_barter,
            barter_notes || null,
            auth.userId
        ]
    );

    return { data: result.rows[0] as PatientFinancialRecord };
}

async function updateFinancialRecordLogic(auth: any, data: any) {
    const { recordId, ...updates } = data;

    if (!recordId) {
        throw new HttpsError('invalid-argument', 'recordId é obrigatório');
    }

    const pool = getPool();

    // Check ownership
    const existing = await pool.query(
        'SELECT * FROM patient_financial_records WHERE id = $1 AND organization_id = $2',
        [recordId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
        throw new HttpsError('not-found', 'Registro financeiro não encontrado');
    }

    const allowedFields = [
        'session_date', 'session_value', 'payment_method', 'payment_status',
        'paid_amount', 'paid_date', 'notes', 'is_barter', 'barter_notes'
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    for (const field of allowedFields) {
        if (field in updates) {
            paramCount++;
            setClauses.push(`${field} = $${paramCount + 1}`);
            values.push(updates[field]);
        }
    }

    if (setClauses.length === 0) {
        throw new HttpsError('invalid-argument', 'Nenhum campo para atualizar');
    }

    values.push(recordId, auth.organizationId);

    const query = `
        UPDATE patient_financial_records
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount + 2} AND organization_id = $${paramCount + 3}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return { data: result.rows[0] as PatientFinancialRecord };
}

async function deleteFinancialRecordLogic(auth: any, data: any) {
    const { recordId } = data;

    if (!recordId) {
        throw new HttpsError('invalid-argument', 'recordId é obrigatório');
    }

    const pool = getPool();

    const existing = await pool.query(
        'SELECT id FROM patient_financial_records WHERE id = $1 AND organization_id = $2',
        [recordId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
        throw new HttpsError('not-found', 'Registro financeiro não encontrado');
    }

    await pool.query('DELETE FROM patient_financial_records WHERE id = $1', [recordId]);

    return { success: true };
}

async function markAsPaidLogic(auth: any, data: any) {
    const { recordId, payment_method, paid_date } = data;

    if (!recordId) {
        throw new HttpsError('invalid-argument', 'recordId é obrigatório');
    }

    if (!payment_method) {
        throw new HttpsError('invalid-argument', 'payment_method é obrigatório');
    }

    const pool = getPool();

    const existing = await pool.query(
        'SELECT * FROM patient_financial_records WHERE id = $1 AND organization_id = $2',
        [recordId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
        throw new HttpsError('not-found', 'Registro financeiro não encontrado');
    }

    const result = await pool.query(
        `UPDATE patient_financial_records
        SET payment_status = 'paid',
            paid_amount = final_value,
            payment_method = $1,
            paid_date = COALESCE($2, CURRENT_DATE),
            updated_at = NOW()
        WHERE id = $3 AND organization_id = $4
        RETURNING *`,
        [payment_method, paid_date || null, recordId, auth.organizationId]
    );

    return { data: result.rows[0] as PatientFinancialRecord };
}

// ============================================================================
// HTTP Endpoints
// ============================================================================

export const listPatientFinancialRecordsHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await listPatientFinancialRecordsLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('listPatientFinancialRecordsHttp', e, res); }
});

export const getPatientFinancialSummaryHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await getPatientFinancialSummaryLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('getPatientFinancialSummaryHttp', e, res); }
});

export const createFinancialRecordHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await createFinancialRecordLogic(auth, parseBody(req));
        res.status(201).json(result);
    } catch (e) { handleError('createFinancialRecordHttp', e, res); }
});

export const updateFinancialRecordHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await updateFinancialRecordLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('updateFinancialRecordHttp', e, res); }
});

export const deleteFinancialRecordHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await deleteFinancialRecordLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('deleteFinancialRecordHttp', e, res); }
});

export const markAsPaidHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await markAsPaidLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('markAsPaidHttp', e, res); }
});

export const listAllFinancialRecordsHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await listAllFinancialRecordsLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('listAllFinancialRecordsHttp', e, res); }
});

// ============================================================================
// Callable Functions
// ============================================================================

export const listPatientFinancialRecordsHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await listPatientFinancialRecordsLogic(auth, request.data);
    } catch (e) { return handleError('listPatientFinancialRecordsHandler', e); }
};

export const getPatientFinancialSummaryHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await getPatientFinancialSummaryLogic(auth, request.data);
    } catch (e) { return handleError('getPatientFinancialSummaryHandler', e); }
};

export const createFinancialRecordHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await createFinancialRecordLogic(auth, request.data);
    } catch (e) { return handleError('createFinancialRecordHandler', e); }
};

export const updateFinancialRecordHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await updateFinancialRecordLogic(auth, request.data);
    } catch (e) { return handleError('updateFinancialRecordHandler', e); }
};

export const deleteFinancialRecordHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await deleteFinancialRecordLogic(auth, request.data);
    } catch (e) { return handleError('deleteFinancialRecordHandler', e); }
};

export const markAsPaidHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await markAsPaidLogic(auth, request.data);
    } catch (e) { return handleError('markAsPaidHandler', e); }
};

export const listPatientFinancialRecords = onCall(httpOpts, listPatientFinancialRecordsHandler);
export const getPatientFinancialSummary = onCall(httpOpts, getPatientFinancialSummaryHandler);
export const createFinancialRecord = onCall(httpOpts, createFinancialRecordHandler);
export const updateFinancialRecord = onCall(httpOpts, updateFinancialRecordHandler);
export const deleteFinancialRecord = onCall(httpOpts, deleteFinancialRecordHandler);
export const markAsPaid = onCall(httpOpts, markAsPaidHandler);
