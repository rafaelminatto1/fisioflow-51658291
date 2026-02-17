import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { CORS_ORIGINS } from '../lib/cors';
import { authorizeRequest } from '../middleware/auth';
import { logger } from '../lib/logger';
import { triggerPatientRagReindex } from '../ai/rag/rag-index-maintenance';

// ============================================================================
// Types
// ============================================================================

interface Surgery {
    name: string;
    date: string;
    surgeon: string;
    hospital: string;
    notes?: string;
}

interface Goal {
    description: string;
    targetDate: string;
}

interface Pathology {
    name: string;
    status: 'active' | 'treated';
    diagnosedAt: string;
}

interface SaveSurgeriesRequest {
    recordId: string;
    surgeries: Surgery[];
}

interface SaveGoalsRequest {
    recordId: string;
    goals: Goal[];
}

interface SavePathologiesRequest {
    recordId: string;
    pathologies: Pathology[];
}

// ============================================================================
// Helpers
// ============================================================================

async function getPatientIdFromRecord(recordId: string, organizationId: string): Promise<string> {
    const pool = getPool();
    const result = await pool.query(
        'SELECT patient_id FROM medical_records WHERE id = $1 AND organization_id = $2',
        [recordId, organizationId]
    );

    if (result.rows.length === 0) {
        throw new HttpsError('not-found', 'Medical record not found');
    }

    return result.rows[0].patient_id;
}

// ============================================================================
// Functions
// ============================================================================

export const saveSurgeries = onCall<SaveSurgeriesRequest>(
    { cors: CORS_ORIGINS },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }
        const auth = await authorizeRequest(request.auth.token);
        const { recordId, surgeries } = request.data;

        if (!recordId || !Array.isArray(surgeries)) {
            throw new HttpsError('invalid-argument', 'Invalid arguments');
        }

        try {
            const patientId = await getPatientIdFromRecord(recordId, auth.organizationId);
            const pool = getPool();

            // Start transaction
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Insert new surgeries
                // Note: We are appending, assuming these are NEW surgeries being added via the form
                // If the UI implies replacement, we should delete existing ones or handle updates.
                // Given the simplistic UI, appending or "adding to history" is likely intended,
                // OR the UI sends ALL surgeries and expects a sync. 
                // Let's assume append for now, or check if we should clear for this record?
                // Surgeries are usually patient-wide, not per-record. 
                // But the input is linked to a record.
                // Let's insert them into a patient_surgeries table.

                for (const surgery of surgeries) {
                    await client.query(
                        `INSERT INTO patient_surgeries (
                    patient_id, organization_id, name, date, surgeon, hospital, notes, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            patientId,
                            auth.organizationId,
                            surgery.name,
                            surgery.date,
                            surgery.surgeon,
                            surgery.hospital,
                            surgery.notes || null,
                            auth.userId
                        ]
                    );
                }

                await client.query('COMMIT');

                // Background reindex
                await triggerPatientRagReindex({
                    patientId,
                    organizationId: auth.organizationId,
                    reason: 'surgeries_updated'
                });

                return { success: true };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            logger.error('Error saving surgeries:', error);
            throw new HttpsError('internal', 'Error saving surgeries');
        }
    }
);

export const saveGoals = onCall<SaveGoalsRequest>(
    { cors: CORS_ORIGINS },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }
        const auth = await authorizeRequest(request.auth.token);
        const { recordId, goals } = request.data;

        if (!recordId || !Array.isArray(goals)) {
            throw new HttpsError('invalid-argument', 'Invalid arguments');
        }

        try {
            const patientId = await getPatientIdFromRecord(recordId, auth.organizationId);
            const pool = getPool();
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Insert goals
                for (const goal of goals) {
                    await client.query(
                        `INSERT INTO patient_goals (
                    patient_id, organization_id, description, target_date, status, created_by
                ) VALUES ($1, $2, $3, $4, 'active', $5)`,
                        [
                            patientId,
                            auth.organizationId,
                            goal.description,
                            goal.targetDate,
                            auth.userId
                        ]
                    );
                }

                await client.query('COMMIT');

                await triggerPatientRagReindex({
                    patientId,
                    organizationId: auth.organizationId,
                    reason: 'goals_updated'
                });

                return { success: true };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            logger.error('Error saving goals:', error);
            throw new HttpsError('internal', 'Error saving goals');
        }
    }
);

export const savePathologies = onCall<SavePathologiesRequest>(
    { cors: CORS_ORIGINS },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }
        const auth = await authorizeRequest(request.auth.token);
        const { recordId, pathologies } = request.data;

        if (!recordId || !Array.isArray(pathologies)) {
            throw new HttpsError('invalid-argument', 'Invalid arguments');
        }

        try {
            const patientId = await getPatientIdFromRecord(recordId, auth.organizationId);
            const pool = getPool();
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                for (const path of pathologies) {
                    // Check if already exists to avoid duplicates? Or just insert?
                    // Assuming insert for history tracking, or maybe upsert?
                    // Simple insert for now.
                    await client.query(
                        `INSERT INTO patient_pathologies (
                    patient_id, organization_id, name, status, diagnosed_at, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            patientId,
                            auth.organizationId,
                            path.name,
                            path.status,
                            path.diagnosedAt,
                            auth.userId
                        ]
                    );
                }

                await client.query('COMMIT');

                await triggerPatientRagReindex({
                    patientId,
                    organizationId: auth.organizationId,
                    reason: 'pathologies_updated'
                });

                return { success: true };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            logger.error('Error saving pathologies:', error);
            throw new HttpsError('internal', 'Error saving pathologies');
        }
    }
);
