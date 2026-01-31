/**
 * Firebase AI Logic Integration
 *
 * Main integration file for Firebase AI Logic service.
 */

import { initializeRemoteConfig, REMOTE_CONFIG_KEYS } from '@/lib/firebase/remote-config';
import { initAppCheck, getAppCheckToken } from '@/lib/firebase/app-check';
import { AIUsageMonitor as UsageMonitor } from '@/lib/ai/usage-tracker';
import { ClinicalPromptBuilder } from '@/lib/ai/prompts/clinical-prompts';
import { fisioLogger as logger } from '@/lib/errors/logger';

// AI Model Types (local definitions since shared-api was removed)
export enum AIModelType {
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  GEMINI_PRO = 'gemini-pro',
}

export enum AIFeatureCategory {
  CLINICAL_ANALYSIS = 'clinical_analysis',
  EXERCISE_SUGGESTION = 'exercise_suggestion',
  EXERCISE_RECOMMENDATION = 'exercise_recommendation',
  SOAP_GENERATION = 'soap_generation',
  MOVEMENT_ANALYSIS = 'movement_analysis',
  REPORT_GENERATION = 'report_generation',
  TREATMENT_PLANNING = 'treatment_planning',
  PATIENT_CHAT = 'patient_chat',
  PROGRESS_ANALYSIS = 'progress_analysis',
  QUICK_SUGGESTIONS = 'quick_suggestions',
}

export interface AIRequestOptions {
  model?: AIModelType;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIUsageRecord {
  id: string;
  userId: string;
  feature: AIFeatureCategory;
  model: AIModelType;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  duration: number;
  timestamp: Date;
  success?: boolean;
}

export const MODEL_CONFIGS = {
  [AIModelType.GEMINI_2_5_FLASH]: {
    name: 'Gemini 2.5 Flash',
    maxTokens: 8192,
    defaultMaxTokens: 2048,
  },
  [AIModelType.GEMINI_2_5_PRO]: {
    name: 'Gemini 2.5 Pro',
    maxTokens: 16384,
    defaultMaxTokens: 4096,
  },
  [AIModelType.GEMINI_1_5_FLASH]: {
    name: 'Gemini 1.5 Flash',
    maxTokens: 8192,
    defaultMaxTokens: 2048,
  },
  [AIModelType.GEMINI_PRO]: {
    name: 'Gemini Pro',
    maxTokens: 30720,
    defaultMaxTokens: 4096,
  },
};

// AI Model Factory (local stub)
class AIModelFactory {
  static getModel(modelType: AIModelType, ai: any): any {
    // Stub implementation - returns a mock model
    return {
      modelType,
      generate: async (prompt: string, options?: AIRequestOptions) => {
        logger.warn(`AI Model ${modelType} called but not implemented`, { prompt: prompt.substring(0, 100) }, 'ai-model-factory');
        return {
          content: '',
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        };
      },
    };
  }
}

// Stub for getFirebaseAI
function getFirebaseAI() {
  return {
    model: 'gemini-2.5-flash',
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  };
}

// Stub for FirebaseAIModel
interface FirebaseAIModel {
  modelType: AIModelType;
  generate(prompt: string, options?: AIRequestOptions): Promise<{
    content: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  }>;
}

// Temporary stub for AIRemoteConfig compatibility
const AIRemoteConfig = {
  isAIEnabled: () => true,
  isFeatureEnabled: (feature: string) => true,
  getModelForFeature: (feature: string) => 'gemini-2.5-flash' as const,
  getMaxTokens: () => 8192,
  getDefaultMaxTokens: () => 2048,
  getRequestTimeout: () => 30000,
  getRateLimit: (period: string) => period === 'hour' ? 100 : 1000,
  getBudgetLimit: (period: string) => period === 'daily' ? 50 : 1000,
  isFunctionCallingEnabled: () => true,
  isStreamingEnabled: () => true,
  isMultimodalEnabled: () => true,
};

/**
 * AI request context
 */
export interface AIRequestContext {
  userId: string;
  feature: AIFeatureCategory;
  metadata?: Record<string, unknown>;
}

/**
 * AI service result
 */
export interface AIServiceResult<T = string> {
  content: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
    duration: number;
  };
  model: AIModelType;
  timestamp: Date;
}

/**
 * AI service error
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * Firebase AI Logic Service class
 */
export class FirebaseAIService {
  private static instance: FirebaseAIService;
  private initialized = false;
  private models: Map<AIModelType, FirebaseAIModel> = new Map();

  private constructor() {}

  static getInstance(): FirebaseAIService {
    if (!FirebaseAIService.instance) {
      FirebaseAIService.instance = new FirebaseAIService();
    }
    return FirebaseAIService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await initializeRemoteConfig();
      try {
        initAppCheck();
      } catch (error) {
        logger.warn('App Check initialization failed', error, 'firebase-ai');
      }

      const ai = getFirebaseAI();
      if (!ai) throw new Error('Firebase AI Logic service not available');

      for (const modelType of Object.values(AIModelType)) {
        try {
          const model = AIModelFactory.getModel(modelType, ai);
          this.models.set(modelType, model);
        } catch (error) {
          logger.warn(`Failed to initialize model ${modelType}`, error, 'firebase-ai');
        }
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize Firebase AI Service', error, 'firebase-ai');
    }
  }

  async generate(
    prompt: string,
    context: AIRequestContext,
    options?: AIRequestOptions
  ): Promise<AIServiceResult<string>> {
    await this.ensureInitialized();
    const startTime = Date.now();

    try {
      const modelType = options?.model || AIModelType.FLASH;
      const model = this.getModel(modelType);

      const response = await model.generate(prompt, options);
      const duration = Date.now() - startTime;

      return {
        content: response.content,
        usage: {
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          totalTokens: response.totalTokens,
          estimatedCost: response.estimatedCost,
          duration,
        },
        model: modelType,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new AIServiceError(
        `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_ERROR',
        error
      );
    }
  }

  private getModel(modelType: AIModelType): FirebaseAIModel {
    const model = this.models.get(modelType);
    if (!model) throw new AIServiceError(`Model ${modelType} is not available`, 'MODEL_NOT_AVAILABLE');
    return model;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) await this.initialize();
  }

  isReady(): boolean {
    return this.initialized && this.models.size > 0;
  }
}

export function getAIService(): FirebaseAIService {
  return FirebaseAIService.getInstance();
}

export const AI = {
  generate: (prompt: string, context: AIRequestContext, options?: AIRequestOptions) =>
    getAIService().generate(prompt, context, options),
  isReady: () => getAIService().isReady(),
  initialize: () => getAIService().initialize(),
};

export function useAI() {
  return {
    generate: AI.generate,
    isReady: AI.isReady,
  };
}
