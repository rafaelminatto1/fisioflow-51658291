import { getPool } from '../init';

/**
 * Migration to fix the appointment index constraint
 * Drops the unique constraint and recreates it as a non-unique index
 * allowing multiple appointments per slot (based on capacity)
 */
export const fixAppointmentIndexHandler = async (req: any, res: any) => {
    // Basic auth check (admin check recommended for production)
    // Here we rely on the function being unauthenticated or called by admin
    // For safety, let's just log who called it
    console.log('[Migration] Request headers:', req.headers);

    const pool = getPool();

    try {
        console.log('[Migration] Starting fix for idx_appointments_time_conflict...');

        // 1. Drop the existing index (unique or not)
        await pool.query(`DROP INDEX IF EXISTS idx_appointments_time_conflict`);
        console.log('[Migration] Dropped index idx_appointments_time_conflict');

        // 2. Create non-unique index
        // Use 'paciente_faltou' instead of 'no_show' based on DB enum
        await pool.query(`
            CREATE INDEX idx_appointments_time_conflict
            ON appointments(therapist_id, date, start_time, end_time)
            WHERE status NOT IN ('cancelado', 'paciente_faltou')
        `);
        console.log('[Migration] Created non-unique index idx_appointments_time_conflict');

        res.json({
            success: true,
            message: 'Index idx_appointments_time_conflict fixed successfully (non-unique)'
        });
    } catch (error: any) {
        console.error('[Migration] Error fixing index:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
