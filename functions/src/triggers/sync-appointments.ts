import { FirestoreEvent, Change, DocumentSnapshot } from 'firebase-functions/v2/firestore';
import { getPool } from '../init';
import { logger } from '../lib/logger';

/**
 * Sync Appointments from Firestore to Cloud SQL
 * Enables offline scheduling support by replicating Firestore changes to PostgreSQL.
 */
export async function handleAppointmentSync(event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { appointmentId: string }>) {
    const snapshot = event.data;
    if (!snapshot) return;

    const appointmentId = event.params.appointmentId;
    const newData = snapshot.after.exists ? snapshot.after.data() : null;

    const pool = getPool();

    // 1. Handle Deletion (Soft Delete in SQL)
    if (!newData) {
        logger.info(`[Sync] Appointment ${appointmentId} deleted in Firestore. Cancelling in SQL.`);
        try {
            await pool.query("UPDATE appointments SET status = 'cancelado', updated_at = NOW() WHERE id = $1", [appointmentId]);
        } catch (e) {
            logger.error(`[Sync] Failed to cancel appointment ${appointmentId} in SQL:`, e);
        }
        return;
    }

    try {
        const organizationId = newData.organizationId || newData.organization_id;
        
        if (!organizationId) {
            logger.warn(`[Sync] Appointment ${appointmentId} has no organizationId. Skipping.`);
            return;
        }

        // 2. Data Normalization (Firestore Loose types -> SQL Enums/Types)
        
        // Normalize Status
        const rawStatus = (newData.status || 'agendado').toLowerCase();
        const validStatuses = ['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'paciente_faltou'];
        const status = validStatuses.includes(rawStatus) ? rawStatus : 'agendado';

        // Normalize Session Type
        const rawType = (newData.type || newData.session_type || 'individual').toLowerCase();
        const validTypes = ['individual', 'dupla', 'grupo'];
        const sessionType = validTypes.includes(rawType) ? rawType : 'individual';

        // Normalize Therapist
        // Fallback: If no therapistId, use createdBy (assuming creator is the professional)
        const therapistId = newData.therapistId || newData.therapist_id || newData.createdBy || newData.created_by;

        if (!newData.patientId) {
            logger.warn(`[Sync] Appointment ${appointmentId} has no patientId. Skipping.`);
            return;
        }

        // 3. Ensure Dependencies (Foreign Keys)
        // We assume Patient Sync trigger handles the patient creation. 
        // If this fails due to FK, Cloud Functions will retry automatically until patient exists.

        // 4. UPSERT into Cloud SQL
        const query = `
            INSERT INTO appointments (
                id, organization_id, patient_id, therapist_id,
                date, start_time, end_time,
                status, session_type, notes,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7,
                $8, $9, $10,
                $11, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                patient_id = EXCLUDED.patient_id,
                therapist_id = EXCLUDED.therapist_id,
                date = EXCLUDED.date,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                status = EXCLUDED.status,
                session_type = EXCLUDED.session_type,
                notes = EXCLUDED.notes,
                updated_at = NOW()
            WHERE appointments.updated_at < NOW() - INTERVAL '2 seconds'
        `;

        const values = [
            appointmentId,
            organizationId,
            newData.patientId || newData.patient_id,
            therapistId, // Can be null in DB? Check schema. If Schema requires NOT NULL, we might need a placeholder or fail.
            newData.date,
            newData.startTime || newData.start_time,
            newData.endTime || newData.end_time,
            status,
            sessionType,
            newData.notes || null,
            newData.created_at ? new Date(newData.created_at) : new Date()
        ];

        await pool.query(query, values);
        logger.info(`[Sync] Appointment ${appointmentId} synced to Cloud SQL.`);

    } catch (error: any) {
        // Special handling for FK violations (Patient doesn't exist yet in SQL)
        if (error.code === '23503') { // foreign_key_violation
            logger.warn(`[Sync] FK Violation for appointment ${appointmentId}. Patient might not exist yet in SQL. Retrying...`);
            // Throwing error forces Cloud Function to retry (Backoff strategy)
            throw error; 
        }
        logger.error(`[Sync] Error syncing appointment ${appointmentId}:`, error);
    }
}
