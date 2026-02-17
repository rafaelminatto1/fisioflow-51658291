/**
 * Assessment Service Unificado - Fase 3 de Otimização
 *
 * Consolida múltiplas funções de avaliações em um único serviço
 * Reduz de 6 funções separadas para 1 função unificada
 */

import { onCall } from 'firebase-functions/v2/https';
import { STANDARD_FUNCTION } from '../lib/function-config';

// ============================================================================
// ASSESSMENT HANDLERS IMPORT (Direct - no dynamic imports)
// ============================================================================

import {
  listAssessmentsHttp,
  getAssessmentHttp,
  createAssessmentHttp,
  updateAssessmentHttp,
  listAssessmentTemplatesHttp,
  getAssessmentTemplateHttp
} from './assessments';

// Helper to convert HTTP handler to callable format
const httpToCallable = (httpHandler: any) => async (request: any) => {
  // Mock req/res objects for the HTTP handler
  const req = {
    method: 'POST',
    headers: {
      authorization: request.auth ? `Bearer ${request.auth.token}` : undefined
    },
    body: request.data
  };

  let responseData: any;
  const res = {
    status: (code: number) => ({
      json: (data: any) => { responseData = data; return res; },
      send: (data: any) => { responseData = data; return res; }
    }),
    json: (data: any) => { responseData = data; return res; },
    send: (data: any) => { responseData = data; return res; }
  };

  await httpHandler(req, res);
  return responseData;
};

// ============================================================================
// UNIFIED ASSESSMENT SERVICE
// ============================================================================

/**
 * Assessment Service Unificado
 *
 * Uma única função que roteia para todos os handlers de avaliações
 * Ações disponíveis: list, get, create, update, listTemplates, getTemplate
 */
/**
 * Assessment Service Unificado
 *
 * Uma única função que roteia para todos os handlers de avaliações
 * Ações disponíveis: list, get, create, update, listTemplates, getTemplate
 */
export const assessmentServiceHandler = async (request: any) => {
  const { action, ...params } = request.data;

  if (!action) {
    throw new Error('action é obrigatório');
  }

  // Roteamento para o handler apropriado
  switch (action) {
    case 'list':
      return await httpToCallable(listAssessmentsHttp)({ data: params });
    case 'get':
      return await httpToCallable(getAssessmentHttp)({ data: params });
    case 'create':
      return await httpToCallable(createAssessmentHttp)({ data: params });
    case 'update':
      return await httpToCallable(updateAssessmentHttp)({ data: params });
    case 'listTemplates':
      return await httpToCallable(listAssessmentTemplatesHttp)({ data: params });
    case 'getTemplate':
      return await httpToCallable(getAssessmentTemplateHttp)({ data: params });
    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }
};

export const assessmentService = onCall(
  STANDARD_FUNCTION,
  assessmentServiceHandler
);
