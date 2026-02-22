import { getPool } from '../init';

/**
 * Migration to fix the appointment index constraint
 * Drops the unique constraint and recreates it as a non-unique index
 * allowing multiple appointments per slot (based on capacity)
 */
export const fixAppointmentIndexHandler = async (req: any, res: any) => {
    console.log('[Migration] Request received to fix appointment indices');

    const pool = getPool();

    try {
        console.log('[Migration] Starting robust fix for appointment indices...');

        // 1. Drop known indices
        await pool.query(`DROP INDEX IF EXISTS idx_appointments_time_conflict`);
        console.log('[Migration] Dropped index idx_appointments_time_conflict');

        // 2. Attempt to drop potential unique constraints by names
        const constraintsToDrop = [
            'idx_appointments_time_conflict',
            'appointments_therapist_id_date_start_time_end_time_key',
            'appointments_therapist_id_date_start_time_end_time_organization_id_key',
            'idx_appointments_no_conflict'
        ];

        for (const constraint of constraintsToDrop) {
            try {
                await pool.query(`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS "${constraint}"`);
                console.log(`[Migration] Attempted to drop constraint: ${constraint}`);
            } catch (e: any) {
                console.warn(`[Migration] Failed to drop constraint ${constraint} (likely does not exist):`, e.message);
            }
        }

        // 3. Create non-unique optimized index
        // This index helps checkTimeConflictByCapacity which filters by organization_id and date
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_appointments_capacity_check
            ON appointments(organization_id, date, start_time, end_time)
            WHERE status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')
        `);
        console.log('[Migration] Created optimized non-unique index idx_appointments_capacity_check');

        // 4. Also keep the therapist-based index but make it non-unique
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_appointments_therapist_time
            ON appointments(therapist_id, date, start_time, end_time)
            WHERE status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')
        `);
        console.log('[Migration] Created therapist-based non-unique index idx_appointments_therapist_time');

        res.json({
            success: true,
            message: 'Appointment indices updated successfully. Unique constraints dropped and non-unique indices created.'
        });
    } catch (error: any) {
        console.error('[Migration] Critical error fixing indices:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
