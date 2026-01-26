/**
 * Firebase AI Logic Integration
 *
 * Main integration file for Firebase AI Logic service.
 * Provides unified interface for AI features with proper error handling,
 * usage tracking, and model selection.
 *
 * @module integrations/firebase/ai
 */

import { getFirebaseAI } from '@fisioflow/shared-api/firebase';
import {
  AIModelType,
  AIFeatureCategory,
  AIRequestOptions,
  AIUsageRecord,
  MODEL_CONFIGS,
} from '@fisioflow/shared-api/firebase/ai/config';
import { AIModelFactory, FirebaseAIModel, type AIResponse, type ChatMessage, type AIFunction, type AIStreamCallback } from '@fisioflow/shared-api/firebase/ai/models';
import { AIRemoteConfig, initializeAIRemoteConfig } from '@/lib/firebase/remote-config';
import { initializeAppCheck, getAppCheckToken } from '@/lib/firebase/app-check';
import { AIUsageMonitor as UsageMonitor } from '@/lib/ai/usage-tracker';
import { ClinicalPromptBuilder } from '@/lib/ai/prompts/clinical-prompts';

/**
 * AI request context
 */
interface AIRequestContext {
  /** User or organization ID */
  userId: string;

  /** Feature category */
  feature: AIFeatureCategory;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * AI service result
 */
export interface AIServiceResult<T = string> {
  /** Generated content */
  content: T;

  /** Usage information */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
    duration: number;
  };

  /** Model used */
  model: AIModelType;

  /** Timestamp */
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

  /**
   * Get singleton instance
   */
  static getInstance(): FirebaseAIService {
    if (!FirebaseAIService.instance) {
      FirebaseAIService.instance = new FirebaseAIService();
    }
    return FirebaseAIService.instance;
  }

  /**
   * Initialize AI service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize Remote Config
      await initializeAIRemoteConfig();

      // Initialize App Check (if available)
      try {
        await initializeAppCheck();
      } catch (error) {
        console.warn('App Check initialization failed, continuing without it:', error);
      }

      // Initialize Firebase AI Logic
      const ai = getFirebaseAI();
      if (!ai) {
        throw new Error('Firebase AI Logic service not available');
      }

      // Create model instances
      for (const modelType of Object.values(AIModelType)) {
        try {
          const model = AIModelFactory.getModel(modelType, ai);
          this.models.set(modelType, model);
        } catch (error) {
          console.warn(`Failed to initialize model ${modelType}:`, error);
        }
      }

      this.initialized = true;
      console.log('Firebase AI Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase AI Service:', error);
      throw new AIServiceError(
        `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR',
        error
      );
    }
  }

  /**
   * Generate completion
   */
  async generate(
    prompt: string,
    context: AIRequestContext,
    options?: AIRequestOptions
  ): Promise<AIServiceResult<string>> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      // Check if feature is enabled
      if (!AIRemoteConfig.isAIEnabled() || !AIRemoteConfig.isFeatureEnabled(context.feature)) {
        throw new AIServiceError(
          `AI feature ${context.feature} is not enabled`,
          'FEATURE_DISABLED'
        );
      }

      // Get model for feature
      const modelType = options?.model || AIRemoteConfig.getModelForFeature(context.feature);
      const model = this.getModel(modelType);

      // Validate options
      const config = MODEL_CONFIGS[modelType];
      const maxTokens = options?.maxOutputTokens || AIRemoteConfig.getMaxTokens();
      if (maxTokens > config.maxOutputTokens) {
        throw new AIServiceError(
          `maxOutputTokens exceeds model limit of ${config.maxOutputTokens}`,
          'INVALID_OPTION'
        );
      }

      // Check rate limit
      const rateLimit = await UsageMonitor.checkRateLimit(
        context.userId,
        'hour',
        AIRemoteConfig.getRateLimit('hour')
      );

      if (rateLimit.isLimited) {
        throw new AIServiceError(
          `Rate limit exceeded: ${rateLimit.currentCount}/${rateLimit.limit} requests`,
          'RATE_LIMIT_EXCEEDED'
        );
      }

      // Check budget limit
      const budgetLimit = await UsageMonitor.checkBudgetLimit(
        context.userId,
        'daily',
        AIRemoteConfig.getBudgetLimit('daily')
      );

      if (budgetLimit.isExceeded) {
        throw new AIServiceError(
          `Budget exceeded: $${budgetLimit.currentSpend.toFixed(2)}/$${budgetLimit.budget}`,
          'BUDGET_EXCEEDED'
        );
      }

      // Get App Check token
      let appCheckToken: string | undefined;
      try {
        appCheckToken = await getAppCheckToken();
      } catch (error) {
        console.warn('Failed to get App Check token, continuing without it');
      }

      // Prepare request options
      const requestOptions: AIRequestOptions = {
        ...options,
        model: modelType,
        temperature: options?.temperature ?? config.temperature,
        maxOutputTokens: options?.maxOutputTokens ?? AIRemoteConfig.getDefaultMaxTokens(),
        timeout: options?.timeout ?? AIRemoteConfig.getRequestTimeout(),
      };

      // Generate response
      const response = await model.generate(prompt, requestOptions);
      const endTime = Date.now();

      // Record usage
      const usageRecord: Omit<AIUsageRecord, 'id'> = {
        userId: context.userId,
        feature: context.feature,
        model: modelType,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
        estimatedCost: response.estimatedCost,
        duration: response.duration,
        timestamp: new Date(),
        success: true,
        metadata: {
          ...context.metadata,
          appCheckToken,
        },
      };

      await UsageMonitor.recordUsage(usageRecord);

      return {
        content: response.content,
        usage: {
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          totalTokens: response.totalTokens,
          estimatedCost: response.estimatedCost,
          duration: response.duration,
        },
        model: modelType,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed usage
      try {
        const usageRecord: Omit<AIUsageRecord, 'id'> = {
          userId: context.userId,
          feature: context.feature,
          model: options?.model || AIModelType.FLASH,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          duration,
          timestamp: new Date(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: context.metadata,
        };

        await UsageMonitor.recordUsage(usageRecord);
      } catch (recordError) {
        console.error('Failed to record error usage:', recordError);
      }

      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_ERROR',
        error
      );
    }
  }

  /**
   * Generate chat completion
   */
  async generateChat(
    messages: ChatMessage[],
    context: AIRequestContext,
    options?: AIRequestOptions
  ): Promise<AIServiceResult<string>> {
    await this.ensureInitialized();

    // Add system prompt if not present
    const hasSystemMessage = messages.some(m => m.role === 'system');
    if (!hasSystemMessage) {
      messages.unshift({
        role: 'system',
        content: ClinicalPromptBuilder.getSystemPrompt(context.feature),
      });
    }

    const modelType = options?.model || AIRemoteConfig.getModelForFeature(context.feature);
    const model = this.getModel(modelType);

    const response = await model.generateChat(messages, options);

    return {
      content: response.content,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
        estimatedCost: response.estimatedCost,
        duration: response.duration,
      },
      model: modelType,
      timestamp: new Date(),
    };
  }

  /**
   * Generate with function calling
   */
  async generateWithFunctions(
    prompt: string,
    functions: AIFunction[],
    context: AIRequestContext,
    options?: AIRequestOptions
  ): Promise<AIServiceResult<AIFunction | string>> {
    await this.ensureInitialized();

    if (!AIRemoteConfig.isFunctionCallingEnabled()) {
      throw new AIServiceError(
        'Function calling is not enabled',
        'FEATURE_DISABLED'
      );
    }

    const modelType = options?.model || AIRemoteConfig.getModelForFeature(context.feature);
    const model = this.getModel(modelType);

    const response = await model.generateWithFunctions(prompt, functions, options);

    return {
      content: response.content,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
        estimatedCost: response.estimatedCost,
        duration: response.duration,
      },
      model: modelType,
      timestamp: new Date(),
    };
  }

  /**
   * Generate streaming completion
   */
  async generateStream(
    prompt: string,
    callback: AIStreamCallback,
    context: AIRequestContext,
    options?: AIRequestOptions
  ): Promise<AIServiceResult<string>> {
    await this.ensureInitialized();

    if (!AIRemoteConfig.isStreamingEnabled()) {
      throw new AIServiceError(
        'Streaming is not enabled',
        'FEATURE_DISABLED'
      );
    }

    const modelType = options?.model || AIRemoteConfig.getModelForFeature(context.feature);
    const model = this.getModel(modelType);

    const response = await model.generateStream(prompt, callback, options);

    return {
      content: response.content,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
        estimatedCost: response.estimatedCost,
        duration: response.duration,
      },
      model: modelType,
      timestamp: new Date(),
    };
  }

  /**
   * Generate multimodal completion
   */
  async generateMultimodal(
    content: Array<{ type: 'text' | 'image'; data: string }>,
    context: AIRequestContext,
    options?: AIRequestOptions
  ): Promise<AIServiceResult<string>> {
    await this.ensureInitialized();

    if (!AIRemoteConfig.isMultimodalEnabled()) {
      throw new AIServiceError(
        'Multimodal generation is not enabled',
        'FEATURE_DISABLED'
      );
    }

    const modelType = options?.model || AIRemoteConfig.getModelForFeature(context.feature);
    const model = this.getModel(modelType);

    const response = await model.generateMultimodal(content, options);

    return {
      content: response.content,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
        estimatedCost: response.estimatedCost,
        duration: response.duration,
      },
      model: modelType,
      timestamp: new Date(),
    };
  }

  /**
   * Generate using clinical prompt
   */
  async generateClinical(
    feature: AIFeatureCategory,
    input: unknown,
    context: AIRequestContext,
    options?: AIRequestOptions
  ): Promise<AIServiceResult<string>> {
    const prompt = ClinicalPromptBuilder.getPrompt(feature, input);
    return this.generate(prompt, context, options);
  }

  /**
   * Get model instance
   */
  private getModel(modelType: AIModelType): FirebaseAIModel {
    const model = this.models.get(modelType);
    if (!model) {
      throw new AIServiceError(
        `Model ${modelType} is not available`,
        'MODEL_NOT_AVAILABLE'
      );
    }
    return model;
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized && this.models.size > 0;
  }

  /**
   * Get available models
   */
  getAvailableModels(): AIModelType[] {
    return Array.from(this.models.keys());
  }
}

/**
 * Get AI service instance
 */
export function getAIService(): FirebaseAIService {
  return FirebaseAIService.getInstance();
}

/**
 * Initialize AI service
 */
export async function initializeAIService(): Promise<void> {
  const service = getAIService();
  await service.initialize();
}

/**
 * Export convenience functions
 */
export const AI = {
  generate: (prompt: string, context: AIRequestContext, options?: AIRequestOptions) =>
    getAIService().generate(prompt, context, options),

  generateChat: (messages: ChatMessage[], context: AIRequestContext, options?: AIRequestOptions) =>
    getAIService().generateChat(messages, context, options),

  generateWithFunctions: (
    prompt: string,
    functions: AIFunction[],
    context: AIRequestContext,
    options?: AIRequestOptions
  ) => getAIService().generateWithFunctions(prompt, functions, context, options),

  generateStream: (
    prompt: string,
    callback: AIStreamCallback,
    context: AIRequestContext,
    options?: AIRequestOptions
  ) => getAIService().generateStream(prompt, callback, context, options),

  generateMultimodal: (
    content: Array<{ type: 'text' | 'image'; data: string }>,
    context: AIRequestContext,
    options?: AIRequestOptions
  ) => getAIService().generateMultimodal(content, context, options),

  generateClinical: (
    feature: AIFeatureCategory,
    input: unknown,
    context: AIRequestContext,
    options?: AIRequestOptions
  ) => getAIService().generateClinical(feature, input, context, options),

  isReady: () => getAIService().isReady(),

  getAvailableModels: () => getAIService().getAvailableModels(),

  initialize: () => initializeAIService(),
};

/**
 * React hook for AI service
 */
export function useAI() {
  return {
    generate: AI.generate,
    generateChat: AI.generateChat,
    generateClinical: AI.generateClinical,
    isReady: AI.isReady,
    getAvailableModels: AI.getAvailableModels,
  };
}

/**
 * Export types
 */
export type { AIRequestContext, AIServiceResult };
export type { AIResponse, ChatMessage, AIFunction, AIStreamCallback } from '@fisioflow/shared-api/firebase/ai/models';
