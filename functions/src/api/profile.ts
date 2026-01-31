/**
 * API Functions: Profile
 * Cloud Functions para gestão do perfil do usuário
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { authorizeRequest } from '../middleware/auth';
import { getPool } from '../init';
import { Profile } from '../types/models';
import { logger } from '../lib/logger';


interface GetProfileResponse {
    data: Profile;
}

/**
 * Retorna o perfil completo do usuário autenticado
 */
export const getProfile = onCall<{}, Promise<GetProfileResponse>>({ cors: true }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }

    // O authorizeRequest já verifica o token e busca o profile básico para validação,
    // além de configurar o contexto RLS.
    const authContext = await authorizeRequest(request.auth.token);

    const pool = getPool();

    try {
        const result = await pool.query(
            `SELECT 
        id, user_id, organization_id, full_name, email, 
        phone, avatar_url, role, crefito, specialties, 
        bio, birth_date, is_active, last_login_at, 
        email_verified, preferences, created_at, updated_at
      FROM profiles
      WHERE user_id = $1`,
            [authContext.userId]
        );

        if (result.rows.length === 0) {
            throw new HttpsError('not-found', 'Perfil não encontrado');
        }

        return { data: result.rows[0] as Profile };
    } catch (error: unknown) {
        if (error instanceof HttpsError) throw error;
        logger.error('Erro ao buscar perfil:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar perfil';
        throw new HttpsError('internal', errorMessage);
    }
});

interface UpdateProfileRequest {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    crefito?: string;
    specialties?: string[]; // Assuming array of strings for JSON
    bio?: string;
    birth_date?: string;
    preferences?: Record<string, any>;
    [key: string]: any;
}

interface UpdateProfileResponse {
    data: Profile;
}

/**
 * Atualiza o perfil do usuário autenticado
 */
export const updateProfile = onCall<UpdateProfileRequest, Promise<UpdateProfileResponse>>({ cors: true }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new HttpsError('unauthenticated', 'Requisita autenticação.');
    }

    const authContext = await authorizeRequest(request.auth.token);
    const updates = request.data;

    const pool = getPool();

    try {
        // Campos permitidos para atualização via frontend
        const allowedFields = [
            'full_name', 'phone', 'avatar_url', 'crefito',
            'specialties', 'bio', 'birth_date', 'preferences'
        ];

        const setClauses: string[] = [];
        const values: (string | number | Date)[] = [];
        let paramCount = 0;

        for (const field of allowedFields) {
            if (field in updates) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);

                // Tratar campos JSON
                if (field === 'specialties' || field === 'preferences') {
                    values.push(JSON.stringify(updates[field]));
                } else {
                    values.push(updates[field]);
                }
            }
        }

        if (setClauses.length === 0) {
            throw new HttpsError('invalid-argument', 'Nenhum campo válido para atualização');
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

        return { data: result.rows[0] as Profile };
    } catch (error: unknown) {
        if (error instanceof HttpsError) throw error;
        logger.error('Erro ao atualizar perfil:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao atualizar perfil';
        throw new HttpsError('internal', errorMessage);
    }
});
