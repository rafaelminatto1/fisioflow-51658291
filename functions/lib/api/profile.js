"use strict";
/**
 * API Functions: Profile (HTTP with CORS fix)
 * Cloud Functions para gestão do perfil do usuário
 * Using onRequest to fix authentication and CORS issues
 */
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
exports.updateProfile = exports.getProfile = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const init_1 = require("../init");
const logger_1 = require("../lib/logger");
const auth = admin.auth();
/**
 * Helper to verify Firebase ID token from Authorization header
 */
async function verifyAuth(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new https_1.HttpsError('unauthenticated', 'No authorization header');
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await auth.verifyIdToken(token);
        return { uid: decodedToken.uid, token: decodedToken };
    }
    catch (error) {
        throw new https_1.HttpsError('unauthenticated', 'Invalid token');
    }
}
/**
 * Helper to get user profile from database
 * Tries PostgreSQL first, then Firestore as fallback
 */
async function getUserProfile(userId) {
    // First try PostgreSQL
    try {
        const pool = (0, init_1.getPool)();
        const result = await pool.query(`SELECT
        id, user_id, organization_id, full_name, email,
        phone, avatar_url, role, crefito, specialties,
        bio, birth_date, is_active, last_login_at,
        email_verified, preferences, created_at, updated_at
      FROM profiles
      WHERE user_id = $1`, [userId]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
    }
    catch (error) {
        logger_1.logger.info('PostgreSQL query failed in getUserProfile, trying Firestore:', error);
    }
    // Fallback to Firestore
    try {
        const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
        if (profileDoc.exists) {
            const data = profileDoc.data();
            if (data) {
                // Convert Firestore profile to Profile format
                return {
                    id: userId,
                    user_id: userId,
                    organization_id: data.organizationId || data.activeOrganizationId || data.organizationIds?.[0] || 'default',
                    full_name: data.displayName || data.name || '',
                    email: data.email || '',
                    phone: data.phone || data.phoneNumber || '',
                    avatar_url: data.photoURL || data.avatarUrl || '',
                    role: data.role || 'user',
                    crefito: data.crefito || '',
                    specialties: data.specialties || [],
                    bio: data.bio || '',
                    birth_date: data.birthDate || null,
                    is_active: data.isActive !== false,
                    last_login_at: data.lastLoginAt || null,
                    email_verified: data.emailVerified || false,
                    preferences: data.preferences || {},
                    created_at: data.createdAt?.toDate?.() || new Date(),
                    updated_at: data.updatedAt?.toDate?.() || new Date(),
                };
            }
        }
    }
    catch (error) {
        logger_1.logger.info('Firestore query failed in getUserProfile:', error);
    }
    throw new https_1.HttpsError('not-found', 'Perfil não encontrado em PostgreSQL nem Firestore');
}
/**
 * CORS headers helper
 */
function setCorsHeaders(res) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
/**
 * POST /getProfile - Retorna o perfil do usuário autenticado
 */
exports.getProfile = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
}, async (req, res) => {
    // Handle OPTIONS preflight FIRST, before any other processing
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    // Only accept POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    setCorsHeaders(res);
    try {
        // Verify authentication
        const { uid } = await verifyAuth(req);
        // Get profile
        const profile = await getUserProfile(uid);
        res.json({ data: profile });
    }
    catch (error) {
        logger_1.logger.error('Erro ao buscar perfil:', error);
        if (error instanceof https_1.HttpsError) {
            const statusCode = error.code === 'unauthenticated' ? 401 :
                error.code === 'not-found' ? 404 : 500;
            res.status(statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Erro interno ao buscar perfil' });
        }
    }
});
/**
 * POST /updateProfile - Atualiza o perfil do usuário
 */
exports.updateProfile = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
}, async (req, res) => {
    // Handle OPTIONS preflight FIRST
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    // Only accept POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    setCorsHeaders(res);
    try {
        // Verify authentication
        const { uid } = await verifyAuth(req);
        const updates = req.body;
        const pool = (0, init_1.getPool)();
        // Campos permitidos para atualização
        const allowedFields = [
            'full_name', 'phone', 'avatar_url', 'crefito',
            'specialties', 'bio', 'birth_date', 'preferences'
        ];
        const setClauses = [];
        const values = [];
        let paramCount = 0;
        for (const field of allowedFields) {
            if (field in updates) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);
                if (field === 'specialties' || field === 'preferences') {
                    values.push(JSON.stringify(updates[field]));
                }
                else {
                    values.push(updates[field]);
                }
            }
        }
        if (setClauses.length === 0) {
            res.status(400).json({ error: 'Nenhum campo válido para atualização' });
            return;
        }
        // Adicionar updated_at
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        // Adicionar WHERE
        paramCount++;
        values.push(uid);
        const query = `
        UPDATE profiles
        SET ${setClauses.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING *
      `;
        const result = await pool.query(query);
        res.json({ data: result.rows[0] });
    }
    catch (error) {
        logger_1.logger.error('Erro ao atualizar perfil:', error);
        if (error instanceof https_1.HttpsError) {
            const statusCode = error.code === 'unauthenticated' ? 401 :
                error.code === 'not-found' ? 404 : 500;
            res.status(statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Erro interno ao atualizar perfil' });
        }
    }
});
//# sourceMappingURL=profile.js.map