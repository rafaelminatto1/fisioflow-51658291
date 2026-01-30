/**
 * Firebase AI Logic Integration
 *
 * Main integration file for Firebase AI Logic service.
 */

import { getFirebaseAI } from '@fisioflow/shared-api/firebase';
import {
  AIModelType,
  AIFeatureCategory,
  AIRequestOptions,
  AIUsageRecord,
  MODEL_CONFIGS,
} from '@fisioflow/shared-api/firebase/ai/config';
import {
  AIModelFactory,
  FirebaseAIModel,
  type AIResponse,
  type ChatMessage,
  type AIFunction,
  type AIStreamCallback
} from '@fisioflow/shared-api/firebase/ai/models';
import { initializeRemoteConfig, REMOTE_CONFIG_KEYS } from '@/lib/firebase/remote-config';
import { initAppCheck, getAppCheckToken } from '@/lib/firebase/app-check';
import { AIUsageMonitor as UsageMonitor } from '@/lib/ai/usage-tracker';
import { ClinicalPromptBuilder } from '@/lib/ai/prompts/clinical-prompts';
import { logger } from '@/lib/errors/logger';

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