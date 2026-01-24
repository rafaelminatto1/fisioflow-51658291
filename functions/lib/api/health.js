"use strict";
/**
 * Health Check API
 * Função simples para verificar conectividade com Cloud SQL
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = void 0;
const https_1 = require("firebase-functions/v2/https");
const pg_1 = require("pg");
exports.healthCheck = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    maxInstances: 1,
    vpcConnector: 'projects/fisioflow-migration/locations/us-central1/connectors/cloudsql-connector',
}, async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        // Usar socket Unix do Cloud SQL
        const pool = new pg_1.Pool({
            host: '/cloudsql/fisioflow-migration:us-central1:fisioflow-pg',
            user: 'fisioflow',
            password: 'fisioflow2024',
            database: 'fisioflow',
            max: 1,
            connectionTimeoutMillis: 10000,
        });
        const result = await pool.query('SELECT COUNT(*) as count FROM exercises WHERE is_active = true');
        const dbTime = await pool.query('SELECT NOW() as server_time');
        await pool.end();
        res.json({
            status: 'healthy',
            database: 'connected (Unix socket)',
            exercises_count: parseInt(result.rows[0].count),
            server_time: dbTime.rows[0].server_time,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            hint: 'Configure VPC connector for Cloud SQL access'
        });
    }
});
//# sourceMappingURL=health.js.map