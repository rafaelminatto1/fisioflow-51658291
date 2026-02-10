/**
 * Partnerships API - CRUD operations for managing partnerships
 *
 * Provides endpoints for:
 * - Creating, reading, updating, deleting partnerships
 * - Listing partnerships with filters
 * - Applying partnership discounts to patients
 */

import { CORS_ORIGINS, getPool } from '../init';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { setCorsHeaders } from '../lib/cors';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { Partnership } from '../types/models';
import { logger } from '../lib/logger';
import { DATABASE_FUNCTION, withCors } from '../lib/function-config';

function parseBody(req: any): any {
    return typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
}

function getAuthHeader(req: any): string | undefined {
    const h = req.headers?.authorization || req.headers?.Authorization;
    return Array.isArray(h) ? h[0] : h;
}

const httpOpts = withCors(DATABASE_FUNCTION, CORS_ORIGINS);

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

// ============================================================================
// Business Logic
// ============================================================================

async function listPartnershipsLogic(auth: any, data: any) {
    const { activeOnly = false, limit = 100, offset = 0 } = data;

    let query = 'SELECT * FROM partnerships WHERE organization_id = $1';
    const params: any[] = [auth.organizationId];

    if (activeOnly) {
        query += ' AND is_active = true';
    }

    query += ' ORDER BY name ASC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await getPool().query(query, params);
    return { data: result.rows as Partnership[] };
}

async function getPartnershipLogic(auth: any, data: any) {
    const { partnershipId } = data;

    if (!partnershipId) {
        throw new HttpsError('invalid-argument', 'partnershipId é obrigatório');
    }

    const result = await getPool().query(
        'SELECT * FROM partnerships WHERE id = $1 AND organization_id = $2',
        [partnershipId, auth.organizationId]
    );

    if (result.rows.length === 0) {
        throw new HttpsError('not-found', 'Parceria não encontrada');
    }

    return { data: result.rows[0] as Partnership };
}

async function createPartnershipLogic(auth: any, data: any) {
    const {
        name,
        cnpj,
        contact_person,
        contact_phone,
        contact_email,
        address,
        discount_type = 'percentage',
        discount_value = 0,
        allows_barter = false,
        barter_description,
        barter_sessions_limit,
        notes
    } = data;

    if (!name || name.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'Nome da parceria é obrigatório');
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
        throw new HttpsError('invalid-argument', 'Tipo de desconto inválido');
    }

    if (discount_value < 0) {
        throw new HttpsError('invalid-argument', 'Valor do desconto não pode ser negativo');
    }

    if (discount_type === 'percentage' && discount_value > 100) {
        throw new HttpsError('invalid-argument', 'Desconto percentual não pode exceder 100%');
    }

    const result = await getPool().query(
        `INSERT INTO partnerships (
            organization_id, name, cnpj, contact_person, contact_phone, contact_email,
            address, discount_type, discount_value, allows_barter, barter_description,
            barter_sessions_limit, notes, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
        RETURNING *`,
        [
            auth.organizationId,
            name.trim(),
            cnpj || null,
            contact_person || null,
            contact_phone || null,
            contact_email || null,
            address || null,
            discount_type,
            discount_value,
            allows_barter,
            barter_description || null,
            barter_sessions_limit || null,
            notes || null
        ]
    );

    return { data: result.rows[0] as Partnership };
}

async function updatePartnershipLogic(auth: any, data: any) {
    const { partnershipId, ...updates } = data;

    if (!partnershipId) {
        throw new HttpsError('invalid-argument', 'partnershipId é obrigatório');
    }

    const pool = getPool();

    // Check ownership
    const existing = await pool.query(
        'SELECT id FROM partnerships WHERE id = $1 AND organization_id = $2',
        [partnershipId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
        throw new HttpsError('not-found', 'Parceria não encontrada');
    }

    const allowedFields = [
        'name', 'cnpj', 'contact_person', 'contact_phone', 'contact_email',
        'address', 'discount_type', 'discount_value', 'allows_barter',
        'barter_description', 'barter_sessions_limit', 'notes', 'is_active'
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

    values.push(partnershipId, auth.organizationId);

    const query = `
        UPDATE partnerships
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount + 2} AND organization_id = $${paramCount + 3}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return { data: result.rows[0] as Partnership };
}

async function deletePartnershipLogic(auth: any, data: any) {
    const { partnershipId } = data;

    if (!partnershipId) {
        throw new HttpsError('invalid-argument', 'partnershipId é obrigatório');
    }

    const pool = getPool();

    // Check if partnership exists and belongs to organization
    const existing = await pool.query(
        'SELECT id FROM partnerships WHERE id = $1 AND organization_id = $2',
        [partnershipId, auth.organizationId]
    );

    if (existing.rows.length === 0) {
        throw new HttpsError('not-found', 'Parceria não encontrada');
    }

    // Check if partnership is in use
    const inUse = await pool.query(
        'SELECT COUNT(*) as count FROM patients WHERE partnership_id = $1',
        [partnershipId]
    );

    if (parseInt(inUse.rows[0].count) > 0) {
        throw new HttpsError('failed-precondition', 'Não é possível excluir uma parceria que está vinculada a pacientes. Desative-a em vez disso.');
    }

    await pool.query('DELETE FROM partnerships WHERE id = $1', [partnershipId]);

    return { success: true };
}

// ============================================================================
// HTTP Endpoints
// ============================================================================

export const listPartnershipsHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await listPartnershipsLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('listPartnershipsHttp', e, res); }
});

export const getPartnershipHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await getPartnershipLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('getPartnershipHttp', e, res); }
});

export const createPartnershipHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await createPartnershipLogic(auth, parseBody(req));
        res.status(201).json(result);
    } catch (e) { handleError('createPartnershipHttp', e, res); }
});

export const updatePartnershipHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await updatePartnershipLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('updatePartnershipHttp', e, res); }
});

export const deletePartnershipHttp = onRequest(httpOpts, async (req, res) => {
    if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    setCorsHeaders(res);
    try {
        const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
        const result = await deletePartnershipLogic(auth, parseBody(req));
        res.json(result);
    } catch (e) { handleError('deletePartnershipHttp', e, res); }
});

// ============================================================================
// Callable Functions
// ============================================================================

export const listPartnershipsHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await listPartnershipsLogic(auth, request.data);
    } catch (e) { return handleError('listPartnershipsHandler', e); }
};

export const getPartnershipHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await getPartnershipLogic(auth, request.data);
    } catch (e) { return handleError('getPartnershipHandler', e); }
};

export const createPartnershipHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await createPartnershipLogic(auth, request.data);
    } catch (e) { return handleError('createPartnershipHandler', e); }
};

export const updatePartnershipHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await updatePartnershipLogic(auth, request.data);
    } catch (e) { return handleError('updatePartnershipHandler', e); }
};

export const deletePartnershipHandler = async (request: any) => {
    if (!request.auth || !request.auth.token) throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    try {
        const auth = await authorizeRequest(request.auth.token);
        return await deletePartnershipLogic(auth, request.data);
    } catch (e) { return handleError('deletePartnershipHandler', e); }
};

export const listPartnerships = onCall(httpOpts, listPartnershipsHandler);
export const getPartnership = onCall(httpOpts, getPartnershipHandler);
export const createPartnership = onCall(httpOpts, createPartnershipHandler);
export const updatePartnership = onCall(httpOpts, updatePartnershipHandler);
export const deletePartnership = onCall(httpOpts, deletePartnershipHandler);
