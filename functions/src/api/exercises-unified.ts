/**
 * Exercise Service Unificado - Fase 3 de Otimização
 *
 * Consolida múltiplas funções de exercícios em um único serviço
 * Reduz de 10 funções separadas para 1 função unificada
 */

import { onCall } from 'firebase-functions/v2/https';
import { STANDARD_FUNCTION } from '../lib/function-config';

// ============================================================================
// EXERCISE HANDLERS IMPORT
// ============================================================================

const listExercisesHandler = async (request: any) => {
  const { listExercisesHandler } = await import('./exercises');
  return listExercisesHandler(request);
};

const getExerciseHandler = async (request: any) => {
  const { getExerciseHandler } = await import('./exercises');
  return getExerciseHandler(request);
};

const searchSimilarExercisesHandler = async (request: any) => {
  const { searchSimilarExercisesHandler } = await import('./exercises');
  return searchSimilarExercisesHandler(request);
};

const getExerciseCategoriesHandler = async (request: any) => {
  const { getExerciseCategoriesHandler } = await import('./exercises');
  return getExerciseCategoriesHandler(request);
};

const getPrescribedExercisesHandler = async (request: any) => {
  const { getPrescribedExercisesHandler } = await import('./exercises');
  return getPrescribedExercisesHandler(request);
};

const logExerciseHandler = async (request: any) => {
  const { logExerciseHandler } = await import('./exercises');
  return logExerciseHandler(request);
};

const createExerciseHandler = async (request: any) => {
  const { createExerciseHandler } = await import('./exercises');
  return createExerciseHandler(request);
};

const updateExerciseHandler = async (request: any) => {
  const { updateExerciseHandler } = await import('./exercises');
  return updateExerciseHandler(request);
};

const deleteExerciseHandler = async (request: any) => {
  const { deleteExerciseHandler } = await import('./exercises');
  return deleteExerciseHandler(request);
};

const mergeExercisesHandler = async (request: any) => {
  const { mergeExercisesHandler } = await import('./exercises');
  return mergeExercisesHandler(request);
};

// ============================================================================
// UNIFIED EXERCISE SERVICE
// ============================================================================

/**
 * Exercise Service Unificado
 *
 * Uma única função que roteia para todos os handlers de exercícios
 * Ações disponíveis: list, get, searchSimilar, getCategories, getPrescribed,
 *                   log, create, update, delete, merge
 */
export const exerciseServiceHandler = async (request: any) => {
  const { action, ...params } = request.data;

  if (!action) {
    throw new Error('action é obrigatório');
  }

  // Roteamento para o handler apropriado
  switch (action) {
    case 'list':
      return listExercisesHandler({ data: params });
    case 'get':
      return getExerciseHandler({ data: params });
    case 'searchSimilar':
      return searchSimilarExercisesHandler({ data: params });
    case 'getCategories':
      return getExerciseCategoriesHandler({ data: params });
    case 'getPrescribed':
      return getPrescribedExercisesHandler({ data: params });
    case 'log':
      return logExerciseHandler({ data: params });
    case 'create':
      return createExerciseHandler({ data: params });
    case 'update':
      return updateExerciseHandler({ data: params });
    case 'delete':
      return deleteExerciseHandler({ data: params });
    case 'merge':
      return mergeExercisesHandler({ data: params });
    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }
};

export const exerciseService = onCall(
  STANDARD_FUNCTION,
  exerciseServiceHandler
);
