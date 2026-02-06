/**
 * API Endpoint: /api/v1/evaluate
 * Endpoint genérico para avaliações via HTTP
 */


/**
 * Endpoint HTTP para avaliações
 * Suporta GET (listar/buscar) e POST (criar)
 */
/**
 * Handler HTTP para avaliações
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from '../lib/logger';
import { CORS_ORIGINS } from '../init';

export const apiEvaluateHandler = async (req: any, res: any) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { method, query, body } = req;

    // Router básico baseado no método
    if (method === 'GET') {
      // Listar assessments ou buscar assessment específico
      const { patientId, templateId, assessmentId } = query;

      if (assessmentId) {
        res.json({
          message: 'Buscar assessment específico',
          assessmentId,
          note: 'Implementar chamada à getAssessment',
        });
        return;
      }

      if (patientId) {
        res.json({
          message: 'Listar assessments do paciente',
          patientId,
          note: 'Implementar chamada à listAssessments',
        });
        return;
      }

      if (templateId) {
        res.json({
          message: 'Buscar template de avaliação',
          templateId,
          note: 'Implementar chamada à getAssessmentTemplate',
        });
        return;
      }

      // Listar todos os templates
      res.json({
        message: 'Listar todos os templates de avaliação',
        note: 'Implementar chamada à listAssessmentTemplates',
      });
      return;
    }

    if (method === 'POST') {
      // Criar nova avaliação
      res.json({
        message: 'Criar nova avaliação',
        data: body,
        note: 'Implementar chamada à createAssessment',
      });
      return;
    }

    if (method === 'PUT') {
      // Atualizar avaliação
      const { assessmentId } = query;

      res.json({
        message: 'Atualizar avaliação',
        assessmentId,
        data: body,
        note: 'Implementar chamada à updateAssessment',
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
    return;
  } catch (error: any) {
    logger.error('Erro em apiEvaluate:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
    });
  }
};

export const apiEvaluate = onRequest({
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
  cors: CORS_ORIGINS,
  invoker: 'public',
}, apiEvaluateHandler);
