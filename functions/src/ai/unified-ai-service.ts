/**
 * AI Service Unificado - Fase 2 de Otimização
 *
 * Consolida múltiplas funções AI em um único serviço
 * Reduz de 13 funções separadas para 1 função unificada
 * Economia: ~R$ 15-20/mês em custos de infraestrutura
 */

import { onCall, onRequest } from 'firebase-functions/v2/https';
import { CORS_ORIGINS } from '../init';
import { AI_FUNCTION, withCors } from '../lib/function-config';

// ============================================================================
// AI HANDLERS IMPORT
// ============================================================================

// Handlers de flow-wrappers
const exerciseGeneratorHandler = async (request: any) => {
  const { exerciseGeneratorHandler } = await import('./flow-wrappers');
  return exerciseGeneratorHandler(request);
};

const clinicalAnalysisHandler = async (request: any) => {
  const { clinicalAnalysisHandler } = await import('./flow-wrappers');
  return clinicalAnalysisHandler(request);
};

const exerciseSuggestionHandler = async (request: any) => {
  const { exerciseSuggestionHandler } = await import('./flow-wrappers');
  return exerciseSuggestionHandler(request);
};

const soapGenerationHandler = async (request: any) => {
  const { soapGenerationHandler } = await import('./flow-wrappers');
  return soapGenerationHandler(request);
};

const analyzeProgressHandler = async (request: any) => {
  const { analyzeProgressHandler } = await import('./flow-wrappers');
  return analyzeProgressHandler(request);
};

// Handlers de movement-analysis
const movementAnalysisHandler = async (request: any) => {
  const { movementAnalysisHandler } = await import('./movement-analysis');
  return movementAnalysisHandler(request);
};

// Handlers de clinical-chat
const aiClinicalChatHandler = async (request: any) => {
  const { aiClinicalChatHandler } = await import('./clinical-chat');
  return aiClinicalChatHandler(request);
};

const aiExerciseRecommendationChatHandler = async (request: any) => {
  const { aiExerciseRecommendationChatHandler } = await import('./clinical-chat');
  return aiExerciseRecommendationChatHandler(request);
};

const aiSoapNoteChatHandler = async (request: any) => {
  const { aiSoapNoteChatHandler } = await import('./clinical-chat');
  return aiSoapNoteChatHandler(request);
};

const aiGetSuggestionsHandler = async (request: any) => {
  const { aiGetSuggestionsHandler } = await import('./clinical-chat');
  return aiGetSuggestionsHandler(request);
};

// Handlers de groq-service
const aiFastProcessingHandler = async (request: any) => {
  const { aiFastProcessingHandler } = await import('./groq-service');
  return aiFastProcessingHandler(request);
};

// ============================================================================
// UNIFIED AI SERVICE (Callable)
// ============================================================================

/**
 * AI Service Unificado - Callable
 *
 * Uma única função que roteia para todos os handlers AI baseado na ação
 * Reduz infraestrutura de 13 serviços Cloud Run para 1
 */
export const aiServiceHandler = async (request: any) => {
  const { action, ...params } = request.data;

  if (!action) {
    throw new Error('action é obrigatório');
  }

  // Roteamento para o handler apropriado
  switch (action) {
    // Flow Wrappers
    case 'generateExercisePlan':
      return exerciseGeneratorHandler({ data: params });
    case 'clinicalAnalysis':
      return clinicalAnalysisHandler({ data: params });
    case 'exerciseSuggestion':
      return exerciseSuggestionHandler({ data: params });
    case 'soapGeneration':
      return soapGenerationHandler({ data: params });
    case 'analyzeProgress':
      return analyzeProgressHandler({ data: params });

    // Movement Analysis
    case 'movementAnalysis':
      return movementAnalysisHandler({ data: params });

    // Clinical Chat
    case 'clinicalChat':
      return aiClinicalChatHandler({ data: params });
    case 'exerciseRecommendationChat':
      return aiExerciseRecommendationChatHandler({ data: params });
    case 'soapNoteChat':
      return aiSoapNoteChatHandler({ data: params });
    case 'getSuggestions':
      return aiGetSuggestionsHandler({ data: params });

    // Fast Processing
    case 'fastProcessing':
      return aiFastProcessingHandler({ data: params });

    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }
};

export const aiService = onCall(
  AI_FUNCTION,
  aiServiceHandler
);

// ============================================================================
// UNIFIED AI SERVICE (HTTP)
// ============================================================================

/**
 * AI Service Unificado - HTTP
 *
 * Versão HTTP para chamadas fetch do frontend com suporte a CORS
 */
export const aiServiceHttpHandler = async (req: any, res: any) => {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, ...params } = body;

    if (!action) {
      res.status(400).json({ error: 'action é obrigatório' });
      return;
    }

    // Simula estrutura de request do callable
    const mockRequest = {
      data: params,
      auth: req.user, // Se disponível via middleware
    };

    let result;

    // Roteamento
    switch (action) {
      case 'generateExercisePlan':
        result = await exerciseGeneratorHandler(mockRequest);
        break;
      case 'clinicalAnalysis':
        result = await clinicalAnalysisHandler(mockRequest);
        break;
      case 'exerciseSuggestion':
        result = await exerciseSuggestionHandler(mockRequest);
        break;
      case 'soapGeneration':
        result = await soapGenerationHandler(mockRequest);
        break;
      case 'analyzeProgress':
        result = await analyzeProgressHandler(mockRequest);
        break;
      case 'movementAnalysis':
        result = await movementAnalysisHandler(mockRequest);
        break;
      case 'clinicalChat':
        result = await aiClinicalChatHandler(mockRequest);
        break;
      case 'exerciseRecommendationChat':
        result = await aiExerciseRecommendationChatHandler(mockRequest);
        break;
      case 'soapNoteChat':
        result = await aiSoapNoteChatHandler(mockRequest);
        break;
      case 'getSuggestions':
        result = await aiGetSuggestionsHandler(mockRequest);
        break;
      case 'fastProcessing':
        result = await aiFastProcessingHandler(mockRequest);
        break;
      default:
        res.status(400).json({ error: `Ação desconhecida: ${action}` });
        return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[aiServiceHttp] Error:', error);
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
};

export const aiServiceHttp = onRequest(
  { ...AI_FUNCTION, ...withCors(AI_FUNCTION, CORS_ORIGINS) },
  aiServiceHttpHandler
);
