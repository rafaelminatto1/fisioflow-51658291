/**
 * Assessment Service Unificado - Fase 3 de Otimização
 *
 * Consolida múltiplas funções de avaliações em um único serviço
 * Reduz de 6 funções separadas para 1 função unificada
 */

import { onCall } from 'firebase-functions/v2/https';
import { STANDARD_FUNCTION } from '../lib/function-config';

// ============================================================================
// ASSESSMENT HANDLERS IMPORT
// ============================================================================

const listAssessmentsHandler = async (request: any) => {
  const { listAssessmentsHandler } = await import('./assessments');
  return listAssessmentsHandler(request);
};

const getAssessmentHandler = async (request: any) => {
  const { getAssessmentHandler } = await import('./assessments');
  return getAssessmentHandler(request);
};

const createAssessmentHandler = async (request: any) => {
  const { createAssessmentHandler } = await import('./assessments');
  return createAssessmentHandler(request);
};

const updateAssessmentHandler = async (request: any) => {
  const { updateAssessmentHandler } = await import('./assessments');
  return updateAssessmentHandler(request);
};

const listAssessmentTemplatesHandler = async (request: any) => {
  const { listAssessmentTemplatesHandler } = await import('./assessments');
  return listAssessmentTemplatesHandler(request);
};

const getAssessmentTemplateHandler = async (request: any) => {
  const { getAssessmentTemplateHandler } = await import('./assessments');
  return getAssessmentTemplateHandler(request);
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
export const assessmentServiceHandler = async (request: any) => {
  const { action, ...params } = request.data;

  if (!action) {
    throw new Error('action é obrigatório');
  }

  // Roteamento para o handler apropriado
  switch (action) {
    case 'list':
      return listAssessmentsHandler({ data: params });
    case 'get':
      return getAssessmentHandler({ data: params });
    case 'create':
      return createAssessmentHandler({ data: params });
    case 'update':
      return updateAssessmentHandler({ data: params });
    case 'listTemplates':
      return listAssessmentTemplatesHandler({ data: params });
    case 'getTemplate':
      return getAssessmentTemplateHandler({ data: params });
    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }
};

export const assessmentService = onCall(
  STANDARD_FUNCTION,
  assessmentServiceHandler
);
