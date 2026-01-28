"use strict";
/**
 * Middleware de Autenticação para Cloud Functions
 * Gerencia tokens Firebase Auth e contexto de organização
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractBearerToken = extractBearerToken;
exports.verifyToken = verifyToken;
exports.authorizeRequest = authorizeRequest;
exports.withAuth = withAuth;
exports.requireRole = requireRole;
exports.hasPermission = hasPermission;
exports.createAuthorizedClient = createAuthorizedClient;
const auth_1 = require("firebase-admin/auth");
const app_1 = require("firebase-admin/app");
const auth = () => (0, auth_1.getAuth)((0, app_1.getApp)());
const https_1 = require("firebase-functions/v2/https");
// Re-exportar getPool do index
const init_1 = require("../init");
/**
 * Extrai e verifica o token Bearer do header Authorization
 *
 * @param authHeader - Header Authorization completo
 * @returns Token JWT puro
 * @throws HttpsError se o header for inválido
 */
function extractBearerToken(authHeader) {
    if (!authHeader) {
        throw new https_1.HttpsError('unauthenticated', 'Token de autenticação não fornecido');
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new https_1.HttpsError('unauthenticated', 'Formato de token inválido. Use: Bearer <token>');
    }
    return parts[1];
}
/**
 * Verifica o token Firebase Auth e retorna os dados decodificados
 *
 * @param token - Token JWT
 * @returns Token decodificado
 * @throws HttpsError se o token for inválido
 */
async function verifyToken(token) {
    try {
        const decoded = await auth().verifyIdToken(token, true);
        return {
            uid: decoded.uid,
            email: decoded.email || '',
            email_verified: decoded.email_verified || false,
        };
    }
    catch (error) {
        if (error.code === 'auth/id-token-expired') {
            throw new https_1.HttpsError('unauthenticated', 'Token expirado');
        }
        if (error.code === 'auth/id-token-revoked') {
            throw new https_1.HttpsError('unauthenticated', 'Token revogado');
        }
        throw new https_1.HttpsError('unauthenticated', 'Token inválido: ' + error.message);
    }
}
/**
 * Busca os dados do profile no banco de dados
 *
 * @param userId - UID do Firebase Auth
 * @returns Dados do profile
 * @throws HttpsError se o profile não for encontrado
 */
async function getProfile(userId) {
    const pool = (0, init_1.getPool)();
    try {
        let result = await pool.query(`SELECT id, user_id, organization_id, role, full_name, email, is_active
       FROM profiles
       WHERE user_id = $1`, [userId]);
        if (result.rows.length === 0) {
            // [AUTO-FIX] Create default org and profile for the first user (Single-Clinic Mode)
            console.log(`[Auth Middleware] Creating default profile for user: ${userId}`);
            const organizationId = 'default-org';
            // 1. Ensure Organization exists
            await pool.query(`INSERT INTO organizations (id, name, slug, active)
         VALUES ($1, 'Clínica Principal', 'default-org', true)
         ON CONFLICT (id) DO NOTHING`, [organizationId]);
            // 2. Create Profile
            // We fetch some basic info from Firebase Auth if possible, but here we use defaults
            const newProfile = await pool.query(`INSERT INTO profiles (user_id, organization_id, role, full_name, email, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, organization_id, role, full_name, email, is_active`, [userId, organizationId, 'admin', 'Usuário Principal', 'admin@fisioflow.com', true]);
            return newProfile.rows[0];
        }
        const profile = result.rows[0];
        if (!profile.is_active) {
            throw new https_1.HttpsError('permission-denied', 'Este usuário está desativado');
        }
        return profile;
    }
    catch (error) {
        // If database connection fails, provide a more helpful error
        if (error instanceof Error) {
            if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
                console.error('[Auth Middleware] Database connection error:', error.message);
                throw new https_1.HttpsError('internal', 'Erro de conexão com o banco de dados. Verifique se o PostgreSQL/Cloud SQL está configurado e acessível.');
            }
        }
        throw error;
    }
}
/**
 * Configura o contexto RLS (Row Level Security) para a conexão atual
 *
 * @param pool - Pool de conexões PostgreSQL
 * @param organizationId - ID da organização do usuário
 */
async function setRLSContext(pool, organizationId) {
    await pool.query('SET LOCAL app.organization_id = $1', [organizationId]);
    await pool.query('SET LOCAL app.user_id = $1', [organizationId]); // Fallback
}
/**
 * Autoriza uma requisição e retorna o contexto de autenticação completo
 *
 * Esta função deve ser chamada no início de cada Cloud Function que precisa
 * de autorização. Ela:
 * 1. Verifica o token Firebase Auth
 * 2. Busca os dados do profile no banco
 * 3. Configura o contexto RLS para isolamento multi-tenant
 *
 * @param token - Token JWT do Firebase Auth
 * @returns Contexto de autenticação com dados do usuário
 * @throws HttpsError se a autorização falhar
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   const auth = await authorizeRequest(request.auth.token);
 *   // Use auth.organizationId, auth.role, etc.
 * });
 * ```
 */
async function authorizeRequest(tokenOrUid) {
    let uid;
    if (typeof tokenOrUid === 'string') {
        // 1. Verificar token Firebase se for string
        const decoded = await verifyToken(tokenOrUid);
        uid = decoded.uid;
    }
    else {
        // Já é um objeto decodificado ou { uid }
        uid = tokenOrUid.uid;
    }
    // 2. Buscar profile no banco
    const profile = await getProfile(uid);
    // 3. Configurar contexto RLS
    const pool = (0, init_1.getPool)();
    await setRLSContext(pool, profile.organization_id);
    // 4. Retornar contexto completo
    return {
        userId: uid,
        organizationId: profile.organization_id,
        role: profile.role,
        email: profile.email,
        profileId: profile.id,
    };
}
/**
 * Wrapper para criar callable functions com autorização automática
 *
 * @param handler - Função handler que recebe o AuthContext
 * @returns Cloud Function callable com autenticação
 *
 * @example
 * ```typescript
 * export const myFunction = withAuth(async (data, auth) => {
 *   // auth já contém userId, organizationId, role, etc.
 *   return { success: true };
 * });
 * ```
 */
function withAuth(handler) {
    return async (request) => {
        const auth = await authorizeRequest(request.auth.token);
        return handler(request.data, auth);
    };
}
/**
 * Verifica se o usuário tem permissão baseada em papel
 *
 * @param auth - Contexto de autenticação
 * @param allowedRoles - Array de papéis permitidos
 * @throws HttpsError se o usuário não tiver permissão
 */
function requireRole(auth, allowedRoles) {
    if (!allowedRoles.includes(auth.role)) {
        throw new https_1.HttpsError('permission-denied', `Acesso negado. Requer um dos papéis: ${allowedRoles.join(', ')}`);
    }
}
/**
 * Verifica se o usuário é admin ou tem role específico
 * Admins têm acesso a tudo
 *
 * @param auth - Contexto de autenticação
 * @param role - Papel necessário (opcional, se omitido verifica se é admin)
 * @returns true se tem permissão
 */
function hasPermission(auth, role) {
    if (auth.role === 'admin')
        return true;
    if (!role)
        return false;
    return auth.role === role;
}
/**
 * Criar um cliente PostgreSQL com contexto RLS configurado
 *
 * Útil para queries que precisam ser executadas dentro de uma transação
 * ou com contexto específico
 *
 * @param auth - Contexto de autenticação
 * @returns Cliente PostgreSQL com RLS configurado
 */
async function createAuthorizedClient(auth) {
    const pool = (0, init_1.getPool)();
    await setRLSContext(pool, auth.organizationId);
    return pool;
}
//# sourceMappingURL=auth.js.map