import { FirestoreEvent, Change, DocumentSnapshot } from 'firebase-functions/v2/firestore';
import { getPool } from '../init';
import { logger } from '../lib/logger';

/**
 * Sync Patients from Firestore to Cloud SQL (Handler Logic)
 * Ensures that changes made directly in Firestore (e.g. mobile offline mode)
 * are reflected in the relational database.
 */
export async function handlePatientSync(event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { patientId: string }>) {
    const snapshot = event.data;
    if (!snapshot) return;

    const patientId = event.params.patientId;
    const newData = snapshot.after.exists ? snapshot.after.data() : null;

    // Se o documento foi deletado no Firestore, marcamos como inativo no SQL (Soft Delete)
    if (!newData) {
        logger.info(`[Sync] Patient ${patientId} deleted in Firestore. Soft-deleting in SQL.`);
        const pool = getPool();
        try {
            await pool.query('UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1', [patientId]);
        } catch (e) {
            logger.error(`[Sync] Failed to soft-delete patient ${patientId} in SQL:`, e);
        }
        return;
    }

    const pool = getPool();

    try {
        // Mapeamento de campos Firestore -> SQL
        const name = newData.name || newData.full_name;
        const email = newData.email || null;
        const cpf = newData.cpf ? newData.cpf.replace(/\D/g, '') : null;
        const phone = newData.phone || null;
        const organizationId = newData.organizationId || newData.organization_id;

        if (!organizationId) {
            logger.warn(`[Sync] Patient ${patientId} has no organizationId. Skipping SQL sync.`);
            return;
        }

        // Garante que a organização existe (para evitar erro de FK)
        await pool.query(
            `INSERT INTO organizations (id, name, email) VALUES ($1, 'Clínica Sync', 'sync@fisioflow.com') ON CONFLICT (id) DO NOTHING`,
            [organizationId]
        );

        // Upsert no SQL
        // Usamos ON CONFLICT para inserir ou atualizar
        const query = `
            INSERT INTO patients (
                id, organization_id, name, email, cpf, phone, 
                birth_date, gender, main_condition, status, 
                is_active, updated_at, created_at,
                referring_doctor_name, referring_doctor_phone, medical_return_date,
                medical_report_done, medical_report_sent
            ) VALUES (
                $1, $2, $3, $4, $5, $6, 
                $7, $8, $9, $10, 
                $11, NOW(), $12,
                $13, $14, $15, $16, $17
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                cpf = EXCLUDED.cpf,
                phone = EXCLUDED.phone,
                birth_date = EXCLUDED.birth_date,
                gender = EXCLUDED.gender,
                main_condition = EXCLUDED.main_condition,
                status = EXCLUDED.status,
                is_active = EXCLUDED.is_active,
                referring_doctor_name = EXCLUDED.referring_doctor_name,
                referring_doctor_phone = EXCLUDED.referring_doctor_phone,
                medical_return_date = EXCLUDED.medical_return_date,
                medical_report_done = EXCLUDED.medical_report_done,
                medical_report_sent = EXCLUDED.medical_report_sent,
                updated_at = NOW()
            WHERE patients.updated_at < NOW() - INTERVAL '2 seconds'
        `;

        const values = [
            patientId,
            organizationId,
            name,
            email,
            cpf,
            phone,
            newData.birth_date || '1900-01-01',
            newData.gender || null,
            newData.main_condition || 'A definir',
            newData.status || 'Inicial',
            newData.is_active !== false, // Default true
            newData.created_at ? new Date(newData.created_at) : new Date(),
            newData.referring_doctor_name || null,
            newData.referring_doctor_phone || null,
            newData.medical_return_date || null,
            newData.medical_report_done === true,
            newData.medical_report_sent === true
        ];

        await pool.query(query, values);
        logger.info(`[Sync] Patient ${patientId} synced to Cloud SQL.`);

    } catch (error) {
        logger.error(`[Sync] Error syncing patient ${patientId} to SQL:`, error);
    }
}