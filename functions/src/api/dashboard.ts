import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getPool, getAdminAuth } from '../init';
import { getOrganizationIdCached } from '../lib/cache-helpers';
import { logger } from '../lib/logger';
import { setCorsHeaders } from '../lib/cors';

async function verifyAuthHeader(req: any): Promise<{ uid: string }> {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new HttpsError('unauthenticated', 'No bearer token');
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      return { uid: decodedToken.uid };
    } catch (error) {
      throw new HttpsError('unauthenticated', 'Invalid token');
    }
}

const httpOpts = {
  region: 'southamerica-east1',
  maxInstances: 1,
  invoker: 'public',
};

export const getDashboardStatsHttp = onRequest(httpOpts, async (req, res) => {
    setCorsHeaders(res, req);
    if (req.method !== 'POST' && req.method !== 'OPTIONS') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
     if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const { uid } = await verifyAuthHeader(req);
        const organizationId = await getOrganizationIdCached(uid);
        const pool = getPool();

        const today = new Date().toISOString().split('T')[0];

        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM patients WHERE organization_id = $1 AND is_active = true) as active_patients,
                (SELECT COUNT(*) FROM appointments WHERE organization_id = $1 AND date = $2) as today_appointments,
                (SELECT COUNT(*) FROM appointments WHERE organization_id = $1 AND date = $2 AND status = 'scheduled') as pending_appointments,
                (SELECT COUNT(*) FROM appointments WHERE organization_id = $1 AND date = $2 AND status = 'completed') as completed_appointments
        `;

        const result = await pool.query(statsQuery, [organizationId, today]);
        const stats = result.rows[0];

        res.json({
            data: {
                activePatients: parseInt(stats.active_patients, 10),
                todayAppointments: parseInt(stats.today_appointments, 10),
                pendingAppointments: parseInt(stats.pending_appointments, 10),
                completedAppointments: parseInt(stats.completed_appointments, 10),
            }
        });

    } catch (error: any) {
        logger.error('Error in getDashboardStatsHttp:', error);
        const statusCode = error.code === 'unauthenticated' ? 401 : 500;
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
});
