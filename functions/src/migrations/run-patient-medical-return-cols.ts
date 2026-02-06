
import { onRequest } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { logger } from '../lib/logger';

export const runPatientMedicalReturnCols = onRequest({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 300,
    region: 'southamerica-east1',
}, async (req, res) => {
    // Simple API key check
    const apiKey = req.query.key || req.headers['x-migration-key'];
    if (apiKey !== 'fisioflow-migration-2026') {
        res.status(403).json({ error: 'Forbidden - Invalid API key' });
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed - use POST' });
        return;
    }

    const pool = getPool();
    const client = await pool.connect();
    const results: { step: string; success: boolean; error?: string }[] = [];

    try {
        logger.info('🔄 Starting Patient Medical Return Columns Migration...');

        const columnsToAdd = [
            { name: 'referring_doctor_name', type: 'TEXT' },
            { name: 'referring_doctor_phone', type: 'TEXT' },
            { name: 'medical_return_date', type: 'DATE' },
            { name: 'medical_report_done', type: 'BOOLEAN DEFAULT false' },
            { name: 'medical_report_sent', type: 'BOOLEAN DEFAULT false' }
        ];

        for (const col of columnsToAdd) {
            try {
                // Check if column exists first
                const checkResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'patients' AND column_name = $1
        `, [col.name]);

                if (checkResult.rows.length === 0) {
                    await client.query(`ALTER TABLE patients ADD COLUMN ${col.name} ${col.type}`);
                    results.push({ step: `Add column ${col.name}`, success: true });
                    logger.info(`✅ Column ${col.name} added`);
                } else {
                    results.push({ step: `Add column ${col.name}`, success: true });
                    logger.info(`ℹ️ Column ${col.name} already exists`);
                }
            } catch (err: any) {
                results.push({ step: `Add column ${col.name}`, success: false, error: err.message });
                logger.error(`❌ Error adding column ${col.name}:`, err.message);
            }
        }

        res.json({
            success: true,
            message: 'Migration completed',
            results,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        logger.error('❌ Migration failed:', error);
        res.status(500).json({
            success: false,
            error: error?.message || String(error),
            results,
        });
    } finally {
        client.release();
    }
});
