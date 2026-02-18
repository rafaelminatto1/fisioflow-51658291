/**
 * Unified Patient Service
 * Consolida todas as operações de pacientes em um único serviço Cloud Functions Gen 2.
 * Reduz custos de instâncias ativas e simplifica a manutenção.
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { 
    listPatientsHttp, 
    getPatientHttp, 
    createPatientHttp, 
    updatePatientHttp, 
    deletePatientHttp,
    getPatientStatsHttp
} from './patients';
import { CORS_ORIGINS } from '../lib/cors';
import { logger } from '../lib/logger';

/**
 * Handler unificado para chamadas HTTP (POST)
 * O frontend deve chamar este endpoint com a propriedade "action" no body.
 * Ex: { "action": "list", "search": "Joao" }
 */
export const patientServiceHttp = onRequest(
    {
        region: 'southamerica-east1',
        memory: '512MiB',
        maxInstances: 15, // Aumentado ligeiramente para suportar mais tráfego unificado
        cpu: 1,
        concurrency: 80,
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        cors: CORS_ORIGINS,
        invoker: 'public',
    },
    async (req, res) => {
        const action = req.body?.action || req.query?.action;

        if (action === 'ping') {
            res.status(200).send('pong');
            return;
        }

        logger.info(`[PatientService] Executing action: ${action}`);

        switch (action) {
            case 'list':
                return listPatientsHttp(req, res);
            case 'get':
                return getPatientHttp(req, res);
            case 'create':
                return createPatientHttp(req, res);
            case 'update':
                return updatePatientHttp(req, res);
            case 'delete':
                return deletePatientHttp(req, res);
            case 'stats':
                return getPatientStatsHttp(req, res);
            default:
                res.status(400).json({ 
                    error: `Ação inválida: ${action}. Use: list, get, create, update, delete, stats.` 
                });
        }
    }
);

/**
 * Handler unificado para chamadas Callable (Firebase SDK)
 */
export const patientService = onCall(
    {
        region: 'southamerica-east1',
        memory: '512MiB',
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    },
    async (request) => {
        const action = request.data?.action;

        if (!action) {
            throw new HttpsError('invalid-argument', 'Propriedade "action" é obrigatória.');
        }

        if (action === 'ping') {
            return { status: 'ok', service: 'patientService' };
        }

        // Importação dinâmica dos handlers originais para manter compatibilidade
        const { 
            listPatientsHandler, 
            getPatientHandler, 
            createPatientHandler, 
            updatePatientHandler, 
            deletePatientHandler,
            getPatientStatsHandler 
        } = await import('./patients');

        switch (action) {
            case 'list': return listPatientsHandler(request);
            case 'get': return getPatientHandler(request);
            case 'create': return createPatientHandler(request);
            case 'update': return updatePatientHandler(request);
            case 'delete': return deletePatientHandler(request);
            case 'stats': return getPatientStatsHandler(request);
            default:
                throw new HttpsError('invalid-argument', `Ação desconhecida: ${action}`);
        }
    }
);
