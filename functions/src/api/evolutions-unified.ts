/**
 * Unified Evolution Service (SOAP)
 * Consolida todas as operações de prontuário e evolução.
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { CORS_ORIGINS, setCorsHeaders } from '../lib/cors';
import { logger } from '../lib/logger';
import { 
  listEvolutionsHttp,
  getEvolutionHttp,
  createEvolutionHttp,
  updateEvolutionHttp,
  deleteEvolutionHttp
} from './evolutions';

export const evolutionServiceHttp = onRequest(
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

    logger.info(`[EvolutionService] Action: ${action}`);

    switch (action) {
      case 'list': return listEvolutionsHttp(req, res);
      case 'get': return getEvolutionHttp(req, res);
      case 'create': return createEvolutionHttp(req, res);
      case 'update': return updateEvolutionHttp(req, res);
      case 'delete': return deleteEvolutionHttp(req, res);
      default: res.status(400).json({ error: 'Ação de evolução inválida.' });
    }
  }
);

export const evolutionService = onCall(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
  },
  async (request) => {
    const action = request.data?.action;

    if (action === 'ping') {
        return { status: 'ok', service: 'evolutionService' };
    }

    const { 
      listEvolutionsHandler,
      getEvolutionHandler,
      createEvolutionHandler,
      updateEvolutionHandler,
      deleteEvolutionHandler 
    } = await import('./evolutions');

    switch (action) {
      case 'list': return listEvolutionsHandler(request);
      case 'get': return getEvolutionHandler(request);
      case 'create': return createEvolutionHandler(request);
      case 'update': return updateEvolutionHandler(request);
      case 'delete': return deleteEvolutionHandler(request);
      default: throw new HttpsError('invalid-argument', 'Ação inválida.');
    }
  }
);
