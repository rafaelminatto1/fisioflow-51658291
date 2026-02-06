/**
 * API Functions: Doctors
 * Cloud Functions para gestão de médicos via Cloud SQL
 */

import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getPool, CORS_ORIGINS } from '../init';
import { verifyAuthHeader, getOrganizationId } from './patients'; // Reusing helpers
import { setCorsHeaders } from '../lib/cors';
import { logger } from '../lib/logger';

/**
 * Lista médicos da organização (Cloud SQL)
 */
export const listDoctorsHttp = onRequest(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 1,
        cors: CORS_ORIGINS,
        invoker: 'public',
    },
    async (req, res) => {
        setCorsHeaders(res, req);
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        try {
            const { uid } = await verifyAuthHeader(req);
            const organizationId = await getOrganizationId(uid);

            const { search, limit = 50, offset = 0 } = req.body || {};
            const pool = getPool();

            let queryText = `
        SELECT * FROM doctors
        WHERE organization_id = $1 AND is_active = true
      `;
            const params: any[] = [organizationId];
            let paramCount = 1;

            if (search) {
                paramCount++;
                // Using ILIKE for search, but ideally we'd use the trigram indexes for better performance
                // if the search term is long enough. For simple listing, ILIKE is fine.
                queryText += ` AND (name ILIKE $${paramCount} OR specialty ILIKE $${paramCount} OR clinic_name ILIKE $${paramCount})`;
                params.push(`%${search}%`);
            }

            queryText += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            params.push(limit, offset);

            const result = await pool.query(queryText, params);

            const countResult = await pool.query(
                `SELECT COUNT(*) FROM doctors WHERE organization_id = $1 AND is_active = true ${search ? `AND (name ILIKE $2 OR specialty ILIKE $2 OR clinic_name ILIKE $2)` : ''}`,
                search ? [organizationId, `%${search}%`] : [organizationId]
            );

            res.json({
                data: result.rows,
                total: parseInt(countResult.rows[0].count, 10),
                page: Math.floor(offset / limit) + 1,
                perPage: limit,
            });
        } catch (error) {
            logger.error('Error in listDoctorsHttp:', error);
            const statusCode = error instanceof HttpsError && error.code === 'unauthenticated' ? 401 : 500;
            res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Erro ao listar médicos' });
        }
    }
);

/**
 * Busca médicos para autocomplete (Cloud SQL - High Performance)
 */
export const searchDoctorsHttp = onRequest(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 1,
        cors: CORS_ORIGINS,
        invoker: 'public',
    },
    async (req, res) => {
        setCorsHeaders(res, req);
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        try {
            const { uid } = await verifyAuthHeader(req);
            const organizationId = await getOrganizationId(uid);
            const { searchTerm, limit = 10 } = req.body || {};

            if (!searchTerm || searchTerm.trim().length < 2) {
                res.json({ data: [] });
                return;
            }

            const pool = getPool();

            // Utilize the trigram GIN index for fast fuzzy search
            // Similarity operator % or word_similarity operator <->
            const result = await pool.query(
                `SELECT *, similarity(name, $1) as score
         FROM doctors
         WHERE organization_id = $2 
           AND is_active = true 
           AND (name % $1 OR specialty % $1 OR clinic_name % $1)
         ORDER BY score DESC
         LIMIT $3`,
                [searchTerm, organizationId, limit]
            );

            res.json({ data: result.rows });
        } catch (error) {
            logger.error('Error in searchDoctorsHttp:', error);
            res.status(500).json({ error: 'Erro ao buscar médicos' });
        }
    }
);

/**
 * Sincroniza médico do Firestore para o SQL (Trigged by Firestore doc write)
 */
export const syncDoctorToSqlHandler = async (doctorId: string, doctorData: any) => {
    const pool = getPool();
    try {
        const {
            organization_id,
            created_by,
            name,
            specialty,
            crm,
            crm_state,
            phone,
            email,
            clinic_name,
            clinic_address,
            clinic_phone,
            notes,
            is_active = true
        } = doctorData;

        await pool.query(
            `INSERT INTO doctors (
        id, organization_id, created_by, name, specialty, crm, crm_state,
        phone, email, clinic_name, clinic_address, clinic_phone, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        specialty = EXCLUDED.specialty,
        crm = EXCLUDED.crm,
        crm_state = EXCLUDED.crm_state,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        clinic_name = EXCLUDED.clinic_name,
        clinic_address = EXCLUDED.clinic_address,
        clinic_phone = EXCLUDED.clinic_phone,
        notes = EXCLUDED.notes,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()`,
            [
                doctorId, organization_id, created_by, name, specialty, crm, crm_state,
                phone, email, clinic_name, clinic_address, clinic_phone, notes, is_active
            ]
        );
        logger.info(`[syncDoctorToSql] Successfully synced doctor ${doctorId}`);
    } catch (error) {
        logger.error(`[syncDoctorToSql] Error syncing doctor ${doctorId}:`, error);
        throw error;
    }
};
