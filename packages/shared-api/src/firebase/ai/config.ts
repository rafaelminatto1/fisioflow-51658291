/**
 * Firebase AI Logic Configuration
 *
 * Central configuration for Firebase AI Logic service integration.
 * Supports Gemini 2.5 Flash, Flash-Lite, and Pro models with proper typing.
 *
 * @module firebase/ai/config
 */

import { getFirebaseAI } from '../index';

/**
 * Supported AI model types for different use cases
 */
export enum AIModelType {
  /** Gemini 2.5 Flash - Fast, efficient for most tasks */
  FLASH = 'gemini-2.5-flash',

  /** Gemini 2.5 Flash-Lite - Ultra-fast, lightweight tasks */
  FLASH_LITE = 'gemini-2.5-flash-lite',

  /** Gemini 2.5 Pro - Most capable, complex reasoning */
  PRO = 'gemini-2.5-pro',

  /** Legacy model for backward compatibility */
  FLASH_LEGACY = 'gemini-1.5-flash',

  /** Legacy Pro model for backward compatibility */
  PRO_LEGACY = 'gemini-1.5-pro',
}

/**
 * AI feature categories for routing to appropriate models
 */
export enum AIFeatureCategory {
  /** Clinical document analysis and summarization */
  CLINICAL_ANALYSIS = 'clinical_analysis',

  /** Exercise recommendation and personalization */
  EXERCISE_RECOMMENDATION = 'exercise_recommendation',

  /** Treatment plan generation and optimization */
  TREATMENT_PLANNING = 'treatment_planning',

  /** Patient communication and chatbot */
  PATIENT_CHAT = 'patient_chat',

  /** Progress tracking and insights */
  PROGRESS_ANALYSIS = 'progress_analysis',

  /** Administrative and reporting tasks */
  ADMINISTRATIVE = 'administrative',

  /** Real-time suggestions and quick responses */
  QUICK_SUGGESTIONS = 'quick_suggestions',
}

/**
 * Model configuration with capabilities and limits
 */
export interface AIModelConfig {
  /** Model identifier */
  model: AIModelType;

  /** Maximum input tokens */
  maxInputTokens: number;

  /** Maximum output tokens */
  maxOutputTokens: number;

  /** Cost per 1M input tokens (USD) */
  costPerMillionInputTokens: number;

  /** Cost per 1M output tokens (USD) */
  costPerMillionOutputTokens: number;

  /** Recommended temperature (0-1) */
  temperature: number;

  /** Maximum concurrent requests */
  maxConcurrentRequests: number;

  /** Request timeout in milliseconds */
  requestTimeout: number;

  /** Supported features */
  capabilities: string[];
}

/**
 * Model configurations for all supported models
 */
export const MODEL_CONFIGS: Record<AIModelType, AIModelConfig> = {
  [AIModelType.FLASH]: {
    model: AIModelType.FLASH,
    maxInputTokens: 1_000_000,
    maxOutputTokens: 8_192,
    costPerMillionInputTokens: 0.075,
    costPerMillionOutputTokens: 0.30,
    temperature: 0.7,
    maxConcurrentRequests: 10,
    requestTimeout: 30000,
    capabilities: [
      'multimodal',
      'function-calling',
      'code-generation',
      'long-context',
      'grounding',
    ],
  },

  [AIModelType.FLASH_LITE]: {
    model: AIModelType.FLASH_LITE,
    maxInputTokens: 1_000_000,
    maxOutputTokens: 8_192,
    costPerMillionInputTokens: 0.075,
    costPerMillionOutputTokens: 0.15,
    temperature: 0.7,
    maxConcurrentRequests: 20,
    requestTimeout: 15000,
    capabilities: [
      'multimodal',
      'function-calling',
      'code-generation',
      'long-context',
    ],
  },

  [AIModelType.PRO]: {
    model: AIModelType.PRO,
    maxInputTokens: 1_000_000,
    maxOutputTokens: 8_192,
    costPerMillionInputTokens: 1.25,
    costPerMillionOutputTokens: 5.00,
    temperature: 0.7,
    maxConcurrentRequests: 5,
    requestTimeout: 60000,
    capabilities: [
      'multimodal',
      'function-calling',
      'code-generation',
      'long-context',
      'grounding',
      'complex-reasoning',
      'advanced-analysis',
    ],
  },

  [AIModelType.FLASH_LEGACY]: {
    model: AIModelType.FLASH_LEGACY,
    maxInputTokens: 1_000_000,
    maxOutputTokens: 8_192,
    costPerMillionInputTokens: 0.15,
    costPerMillionOutputTokens: 0.60,
    temperature: 0.7,
    maxConcurrentRequests: 10,
    requestTimeout: 30000,
    capabilities: [
      'multimodal',
      'function-calling',
      'code-generation',
    ],
  },

  [AIModelType.PRO_LEGACY]: {
    model: AIModelType.PRO_LEGACY,
    maxInputTokens: 2_000_000,
    maxOutputTokens: 8_192,
    costPerMillionInputTokens: 3.50,
    costPerMillionOutputTokens: 10.50,
    temperature: 0.7,
    maxConcurrentRequests: 5,
    requestTimeout: 60000,
    capabilities: [
      'multimodal',
      'function-calling',
      'code-generation',
      'complex-reasoning',
    ],
  },
};

/**
 * Default model mappings for feature categories
 */
export const FEATURE_MODEL_MAPPING: Record<AIFeatureCategory, AIModelType> = {
  [AIFeatureCategory.CLINICAL_ANALYSIS]: AIModelType.PRO,
  [AIFeatureCategory.EXERCISE_RECOMMENDATION]: AIModelType.FLASH,
  [AIFeatureCategory.TREATMENT_PLANNING]: AIModelType.PRO,
  [AIFeatureCategory.PATIENT_CHAT]: AIModelType.FLASH_LITE,
  [AIFeatureCategory.PROGRESS_ANALYSIS]: AIModelType.FLASH,
  [AIFeatureCategory.ADMINISTRATIVE]: AIModelType.FLASH,
  [AIFeatureCategory.QUICK_SUGGESTIONS]: AIModelType.FLASH_LITE,
};

/**
 * AI request options interface
 */
export interface AIRequestOptions {
  /** Override default model */
  model?: AIModelType;

  /** Temperature (0-1, default from config) */
  temperature?: number;

  /** Maximum output tokens */
  maxOutputTokens?: number;

  /** Top-k sampling parameter */
  topK?: number;

  /** Top-p (nucleus) sampling parameter */
  topP?: number;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable streaming response */
  stream?: boolean;

  /** Safety settings */
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
}

/**
 * Default AI request options
 */
export const DEFAULT_AI_OPTIONS: AIRequestOptions = {
  temperature: 0.7,
  maxOutputTokens: 2048,
  topK: 40,
  topP: 0.95,
  timeout: 30000,
  stream: false,
};

/**
 * AI usage record for cost tracking
 */
export interface AIUsageRecord {
  /** Unique identifier */
  id: string;

  /** User or organization ID */
  userId: string;

  /** Feature category */
  feature: AIFeatureCategory;

  /** Model used */
  model: AIModelType;

  /** Input tokens consumed */
  inputTokens: number;

  /** Output tokens consumed */
  outputTokens: number;

  /** Total tokens */
  totalTokens: number;

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Request duration in milliseconds */
  duration: number;

  /** Timestamp */
  timestamp: Date;

  /** Request success status */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * AI configuration singleton
 */
class AIConfigManager {
  private static instance: AIConfigManager;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  /**
   * Initialize AI configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize Firebase AI Logic service
      // This will be handled by the main integration file
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize AI config:', error);
      throw error;
    }
  }

  /**
   * Get model for feature category
   */
  getModelForFeature(feature: AIFeatureCategory): AIModelType {
    return FEATURE_MODEL_MAPPING[feature] || AIModelType.FLASH;
  }

  /**
   * Get model configuration
   */
  getModelConfig(model: AIModelType): AIModelConfig {
    return MODEL_CONFIGS[model];
  }

  /**
   * Calculate request cost
   */
  calculateCost(
    model: AIModelType,
    inputTokens: number,
    outputTokens: number
  ): number {
    const config = MODEL_CONFIGS[model];
    const inputCost = (inputTokens / 1_000_000) * config.costPerMillionInputTokens;
    const outputCost = (outputTokens / 1_000_000) * config.costPerMillionOutputTokens;
    return inputCost + outputCost;
  }

  /**
   * Validate request options
   */
  validateOptions(options: AIRequestOptions, model: AIModelType): void {
    const config = MODEL_CONFIGS[model];

    if (options.maxOutputTokens && options.maxOutputTokens > config.maxOutputTokens) {
      throw new Error(
        `maxOutputTokens exceeds model limit of ${config.maxOutputTokens}`
      );
    }

    if (options.temperature !== undefined &&
        (options.temperature < 0 || options.temperature > 1)) {
      throw new Error('Temperature must be between 0 and 1');
    }

    if (options.topK !== undefined && (options.topK < 1 || options.topK > 40)) {
      throw new Error('topK must be between 1 and 40');
    }

    if (options.topP !== undefined &&
        (options.topP < 0 || options.topP > 1)) {
      throw new Error('topP must be between 0 and 1');
    }
  }
}

/**
 * Export singleton instance
 */
export const aiConfig = AIConfigManager.getInstance();

/**
 * Export utility functions
 */
export const AIConfig = {
  /**
   * Get model for feature
   */
  getModelForFeature: (feature: AIFeatureCategory): AIModelType => {
    return aiConfig.getModelForFeature(feature);
  },

  /**
   * Get model configuration
   */
  getModelConfig: (model: AIModelType): AIModelConfig => {
    return aiConfig.getModelConfig(model);
  },

  /**
   * Calculate request cost
   */
  calculateCost: (
    model: AIModelType,
    inputTokens: number,
    outputTokens: number
  ): number => {
    return aiConfig.calculateCost(model, inputTokens, outputTokens);
  },

  /**
   * Validate options
   */
  validateOptions: (options: AIRequestOptions, model: AIModelType): void => {
    aiConfig.validateOptions(options, model);
  },
};
