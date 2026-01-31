"use strict";
/**
 * API Functions: Profile
 * Cloud Functions para gestão do perfil do usuário
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../middleware/auth");
const init_1 = require("../init");
const logger_1 = require("../lib/logger");
/**
 * Retorna o perfil completo do usuário autenticado
 */
exports.getProfile = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    // O authorizeRequest já verifica o token e busca o profile básico para validação,
    // além de configurar o contexto RLS.
    const authContext = await (0, auth_1.authorizeRequest)(request.auth.token);
    const pool = (0, init_1.getPool)();
    try {
        const result = await pool.query(`SELECT 
        id, user_id, organization_id, full_name, email, 
        phone, avatar_url, role, crefito, specialties, 
        bio, birth_date, is_active, last_login_at, 
        email_verified, preferences, created_at, updated_at
      FROM profiles
      WHERE user_id = $1`, [authContext.userId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Perfil não encontrado');
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger_1.logger.error('Erro ao buscar perfil:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar perfil';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Atualiza o perfil do usuário autenticado
 */
exports.updateProfile = (0, https_1.onCall)({ cors: init_1.CORS_ORIGINS }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const authContext = await (0, auth_1.authorizeRequest)(request.auth.token);
    const updates = request.data;
    const pool = (0, init_1.getPool)();
    try {
        // Campos permitidos para atualização via frontend
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
                // Tratar campos JSON
                if (field === 'specialties' || field === 'preferences') {
                    values.push(JSON.stringify(updates[field]));
                }
                else {
                    values.push(updates[field]);
                }
            }
        }
        if (setClauses.length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualização');
        }
        // Adicionar updated_at
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        // Adicionar WHERE
        paramCount++;
        values.push(authContext.userId);
        const query = `
      UPDATE profiles
      SET ${setClauses.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
        const result = await pool.query(query, values);
        return { data: result.rows[0] };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger_1.logger.error('Erro ao atualizar perfil:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao atualizar perfil';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=profile.js.map