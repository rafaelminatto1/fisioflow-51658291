/**
 * Exercise Service Unificado - Fase 3 de Otimização
 *
 * Consolida múltiplas funções de exercícios em um único serviço
 * Reduz de 10 funções separadas para 1 função unificada
 */

import { onCall } from 'firebase-functions/v2/https';
import { STANDARD_FUNCTION } from '../lib/function-config';

// ============================================================================
// EXERCISE HANDLERS IMPORT (Direct - no dynamic imports)
// ============================================================================

import {
  listExercisesHandler,
  getExerciseHandler,
  searchSimilarExercisesHandler,
  getExerciseCategoriesHandler,
  getPrescribedExercisesHandler,
  logExerciseHandler,
  createExerciseHandler,
  updateExerciseHandler,
  deleteExerciseHandler,
  mergeExercisesHandler
} from './exercises';

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
      return await listExercisesHandler({ data: params });
    case 'get':
      return await getExerciseHandler({ data: params });
    case 'searchSimilar':
      return await searchSimilarExercisesHandler({ data: params });
    case 'getCategories':
      return await getExerciseCategoriesHandler({ data: params });
    case 'getPrescribed':
      return await getPrescribedExercisesHandler({ data: params });
    case 'log':
      return await logExerciseHandler({ data: params });
    case 'create':
      return await createExerciseHandler({ data: params });
    case 'update':
      return await updateExerciseHandler({ data: params });
    case 'delete':
      return await deleteExerciseHandler({ data: params });
    case 'merge':
      return await mergeExercisesHandler({ data: params });
    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }
};

export const exerciseService = onCall(
  STANDARD_FUNCTION,
  exerciseServiceHandler
);
