/**
 * Unified Appointment Service
 * Consolida todas as operações de agendamentos.
 * Melhora eficiência de custo e performance.
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { CORS_ORIGINS, setCorsHeaders } from '../lib/cors';
import { logger } from '../lib/logger';
import {
    listAppointmentsHttp,
    getAppointmentHttp,
    createAppointmentHttp,
    updateAppointmentHttp,
    cancelAppointmentHttp,
    checkTimeConflictHttp
} from './appointments';

/**
 * HTTP Appointment Service
 */
export const appointmentServiceHttp = onRequest(
    {
        region: 'southamerica-east1',
        memory: '512MiB',
        maxInstances: 15,
        cpu: 1,
        concurrency: 80,
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        cors: CORS_ORIGINS,
        invoker: 'public',
    },
    async (req, res) => {
        // Set CORS headers manually to ensure they work
        setCorsHeaders(res, req);

        // Handle preflight OPTIONS requests
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        const action = req.body?.action || req.query?.action;

        if (action === 'ping') {
            res.status(200).send('pong');
            return;
        }

        logger.info(`[AppointmentService] Action: ${action}`);

        switch (action) {
            case 'list': return listAppointmentsHttp(req, res);
            case 'get': return getAppointmentHttp(req, res);
            case 'create': return createAppointmentHttp(req, res);
            case 'update': return updateAppointmentHttp(req, res);
            case 'cancel': return cancelAppointmentHttp(req, res);
            case 'checkConflict': return checkTimeConflictHttp(req, res);
            case 'fixIndices': {
                const { fixAppointmentIndexHandler } = await import('../migrations/fix-appointment-index');
                return fixAppointmentIndexHandler(req, res);
            }
            default:
                res.status(400).json({ error: 'Ação de agendamento inválida.' });
        }
    }
);

/**
 * Callable Appointment Service
 */
export const appointmentService = onCall(
    {
        region: 'southamerica-east1',
        memory: '512MiB',
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    },
    async (request) => {
        const action = request.data?.action;

        if (action === 'ping') {
            return { status: 'ok', service: 'appointmentService' };
        }

        const {
            listAppointmentsHandler,
            getAppointmentHandler,
            createAppointmentHandler,
            updateAppointmentHandler,
            cancelAppointmentHandler,
            checkTimeConflictHandler
        } = await import('./appointments');

        switch (action) {
            case 'list': return listAppointmentsHandler(request);
            case 'get': return getAppointmentHandler(request);
            case 'create': return createAppointmentHandler(request);
            case 'update': return updateAppointmentHandler(request);
            case 'cancel': return cancelAppointmentHandler(request);
            case 'checkConflict': return checkTimeConflictHandler(request);
            default:
                throw new HttpsError('invalid-argument', 'Ação inválida.');
        }
    }
);
