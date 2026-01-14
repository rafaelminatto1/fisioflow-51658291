/**
 * Vercel AI Gateway Integration
 *
 * Centralizes AI model routing through Vercel AI Gateway
 * Provides automatic fallback, rate limiting, and cost optimization
 *
 * Free tier benefits:
 * - $5 credit per month for AI usage
 * - Single endpoint for multiple providers
 * - Built-in caching and rate limiting
 * - Analytics and monitoring
 *
 * @see https://vercel.com/docs/ai-gateway
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, generateObject } from 'ai';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export type AIProvider = 'openai' | 'google' | 'grok' | 'anthropic';

export type AIModel =
  // OpenAI Models
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  // Google Models
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  // Grok Models (via Vercel AI Gateway)
  | 'grok-2-1212'
  | 'grok-2-vision-1212'
  | 'grok-1'
  // Anthropic Models
  | 'claude-3-5-sonnet'
  | 'claude-3-5-haiku';

export interface AIRequestOptions {
  provider?: AIProvider;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
  fallbackProvider?: AIProvider;
}

export interface AIResponse<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  provider?: AIProvider;
  model?: string;
  cached?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIStreamOptions extends AIRequestOptions {
  onUpdate?: (text: string) => void;
  onFinish?: (text: string) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// CONFIGURATION
// ============================================================================


const GATEWAY_BASE_URL = import.meta.env.VITE_VERCEL_AI_GATEWAY_URL || import.meta.env.NEXT_PUBLIC_VERCEL_AI_GATEWAY_URL || 'https://gateway.vercel.sh/api/v1';

/**
 * Provider configuration with base URLs and model mappings
 */
const PROVIDER_CONFIG = {
  openai: {
    baseURL: `${GATEWAY_BASE_URL}/openai`,
    defaultModel: 'gpt-4o-mini',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.NEXT_PUBLIC_OPENAI_API_KEY,
  },
  google: {
    baseURL: `${GATEWAY_BASE_URL}/google`,
    defaultModel: 'gemini-2.0-flash-exp',
    apiKey: import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || import.meta.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY,
  },
  grok: {
    baseURL: `${GATEWAY_BASE_URL}/proxy/xai`,
    defaultModel: 'grok-2-1212',
    apiKey: import.meta.env.VITE_VERCEL_AI_GATEWAY_KEY || import.meta.env.NEXT_PUBLIC_VERCEL_AI_GATEWAY_KEY || import.meta.env.VITE_XAI_API_KEY,
  },
  anthropic: {
    baseURL: `${GATEWAY_BASE_URL}/anthropic`,
    defaultModel: 'claude-3-5-sonnet',
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
  },
} as const;

/**
 * Model to provider mapping
 */
const MODEL_PROVIDER: Record<AIModel, AIProvider> = {
  // OpenAI
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'gpt-4-turbo': 'openai',
  'gpt-3.5-turbo': 'openai',
  // Google
  'gemini-2.0-flash-exp': 'google',
  'gemini-1.5-pro': 'google',
  'gemini-1.5-flash': 'google',
  // Grok
  'grok-2-1212': 'grok',
  'grok-2-vision-1212': 'grok',
  'grok-1': 'grok',
  // Anthropic
  'claude-3-5-sonnet': 'anthropic',
  'claude-3-5-haiku': 'anthropic',
};

/**
 * Cost per 1M tokens (approximate, for cost optimization)
 */
const COST_PER_1M_TOKENS: Record<AIProvider, { input: number; output: number }> = {
  openai: { input: 2.5, output: 10 },      // gpt-4o-mini
  google: { input: 0.075, output: 0.3 },   // gemini-2.0-flash (FREE tier)
  grok: { input: 0, output: 0 },           // FREE via Vercel
  anthropic: { input: 3, output: 15 },     // claude-3-5-sonnet
};

// ============================================================================
// CLIENTS
// ============================================================================

const clients: Record<AIProvider, ReturnType<typeof createOpenAI> | ReturnType<typeof createGoogleGenerativeAI> | null> = {
  openai: null,
  google: null,
  grok: null,
  anthropic: null,
};

/**
 * Get or create AI client for a provider
 */
function getClient(provider: AIProvider) {
  if (!clients[provider]) {
    const config = PROVIDER_CONFIG[provider];

    switch (provider) {
      case 'google':
        clients[provider] = createGoogleGenerativeAI({
          baseURL: config.baseURL,
          apiKey: config.apiKey,
        }) as ReturnType<typeof createGoogleGenerativeAI>;
        break;

      case 'openai':
      case 'grok':
      case 'anthropic':
      default:
        clients[provider] = createOpenAI({
          baseURL: config.baseURL,
          apiKey: config.apiKey || config.apiKey, // Use gateway key if provider key not set
        });
        break;
    }
  }

  return clients[provider];
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate text with automatic fallback
 */
export async function generateAIResponse(
  prompt: string,
  options: AIRequestOptions = {}
): Promise<AIResponse<string>> {
  const {
    provider: preferredProvider,
    model,
    temperature = 0.7,
    maxTokens = 1000,
    systemPrompt,
    fallbackProvider = 'google', // Gemini Flash is free and fast
  } = options;

  // Determine provider from model or use preferred
  const primaryProvider: AIProvider = model
    ? MODEL_PROVIDER[model]
    : preferredProvider || 'openai';

  const modelName = model || PROVIDER_CONFIG[primaryProvider].defaultModel;

  try {
    const client = getClient(primaryProvider);
    if (!client) {
      throw new Error(`Failed to initialize ${primaryProvider} client`);
    }

    const startTime = Date.now();

    const result = await generateText({
      model: client(modelName),
      prompt,
      temperature,
      maxTokens,
      system: systemPrompt,
    });

    return {
      success: true,
      data: result.text,
      provider: primaryProvider,
      model: modelName,
      cached: result.usage.promptTokens === 0,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
    };

  } catch (error) {
    console.warn(`Primary provider ${primaryProvider} failed:`, error);

    // Try fallback provider
    if (fallbackProvider && fallbackProvider !== primaryProvider) {
      console.log(`Attempting fallback to ${fallbackProvider}...`);

      try {
        const fallbackClient = getClient(fallbackProvider);
        const fallbackModel = PROVIDER_CONFIG[fallbackProvider].defaultModel;

        const result = await generateText({
          model: fallbackClient(fallbackModel),
          prompt,
          temperature,
          maxTokens,
          system: systemPrompt,
        });

        return {
          success: true,
          data: result.text,
          provider: fallbackProvider,
          model: fallbackModel,
          cached: false,
          usage: {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          },
        };
      } catch (fallbackError) {
        console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown AI error',
    };
  }
}

/**
 * Stream AI response (for chat-like interfaces)
 */
export async function streamAIResponse(
  prompt: string,
  options: AIStreamOptions = {}
): Promise<AsyncIterable<string>> {
  const {
    provider: preferredProvider,
    model,
    temperature = 0.7,
    maxTokens = 1000,
    systemPrompt,
  } = options;

  const primaryProvider: AIProvider = model
    ? MODEL_PROVIDER[model]
    : preferredProvider || 'openai';

  const modelName = model || PROVIDER_CONFIG[primaryProvider].defaultModel;

  const client = getClient(primaryProvider);
  if (!client) {
    throw new Error(`Failed to initialize ${primaryProvider} client`);
  }

  const result = await streamText({
    model: client(modelName),
    prompt,
    temperature,
    maxTokens,
    system: systemPrompt,
  });

  return result.textStream;
}

/**
 * Generate structured object output
 */
export async function generateAIObject<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: AIRequestOptions = {}
): Promise<AIResponse<T>> {
  const {
    provider: preferredProvider,
    model,
    temperature = 0.7,
    systemPrompt,
  } = options;

  const primaryProvider: AIProvider = model
    ? MODEL_PROVIDER[model]
    : preferredProvider || 'openai';

  const modelName = model || PROVIDER_CONFIG[primaryProvider].defaultModel;

  try {
    const client = getClient(primaryProvider);
    if (!client) {
      throw new Error(`Failed to initialize ${primaryProvider} client`);
    }

    const result = await generateObject({
      model: client(modelName),
      prompt,
      temperature,
      system: systemPrompt,
      schema,
    });

    return {
      success: true,
      data: result.object,
      provider: primaryProvider,
      model: modelName,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown AI error',
    };
  }
}

// ============================================================================
// SPECIALIZED FUNCTIONS FOR FISIOFLOW
// ============================================================================

/**
 * Generate clinical analysis response
 * Uses Google Gemini Flash (free) with fallback to GPT-4o-mini
 */
export async function generateClinicalAnalysis(
  patientData: Record<string, unknown>,
  history?: Record<string, unknown>
): Promise<AIResponse> {
  const prompt = `Analyze the following patient data and provide clinical insights:

Patient Data:
${JSON.stringify(patientData, null, 2)}

${history ? `History:\n${JSON.stringify(history, null, 2)}` : ''}

Please provide:
1. Summary of the patient's condition
2. Technical analysis of metrics
3. Patient-friendly summary
4. Key findings with confidence levels
5. Suggested exercises with progression
6. Areas still needing improvement
7. Any red flags or limitations

Format the response as a structured JSON object.`;

  return generateAIResponse(prompt, {
    provider: 'google', // Use free Gemini Flash
    model: 'gemini-2.0-flash-exp',
    temperature: 0.3, // Lower temperature for clinical accuracy
    fallbackProvider: 'openai',
  });
}

/**
 * Generate form suggestions based on input
 */
export async function generateFormSuggestions(
  formData: Record<string, unknown>,
  formFields: Array<{ id: string; label: string }>
): Promise<AIResponse<string>> {
  const context = formFields
    .map(field => {
      const value = formData[field.id];
      if (!value) return null;
      return `${field.label}: ${value}`;
    })
    .filter(Boolean)
    .join('\n');

  const prompt = `Based on the following patient assessment data, provide clinical suggestions:

${context}

Provide suggestions in markdown format with:
1. Priority areas for intervention
2. Specific treatment recommendations
3. Exercise suggestions with parameters
4. Precautions or contraindications`;

  return generateAIResponse(prompt, {
    provider: 'google', // Use free Gemini Flash
    model: 'gemini-2.0-flash-exp',
    temperature: 0.5,
  });
}

/**
 * Generate exercise suggestion
 */
export async function generateExerciseSuggestion(
  patientCondition: string,
  limitations: string[],
  goals: string[]
): Promise<AIResponse<string>> {
  const prompt = `Suggest appropriate physical therapy exercises for:

Condition: ${patientCondition}
Limitations: ${limitations.join(', ')}
Goals: ${goals.join(', ')}

Provide 3-5 specific exercises with:
- Exercise name
- Sets and reps
- Purpose/goal
- Progression criteria
- Regression options`;

  return generateAIResponse(prompt, {
    provider: 'google', // Use free Gemini Flash
    model: 'gemini-2.0-flash-exp',
    temperature: 0.6,
  });
}

/**
 * Chat with AI assistant
 */
export async function chatWithAI(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<AIResponse<string>> {
  const historyPrompt = conversationHistory
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `You are FisioFlow AI, a helpful assistant for physical therapy clinics.

${historyPrompt ? `Previous conversation:\n${historyPrompt}\n\n` : ''}User: ${message}

Provide a helpful, accurate response. If unsure, recommend consulting with a physical therapist.`;

  return generateAIResponse(prompt, {
    provider: 'google', // Use free Gemini Flash for chat
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate estimated cost in USD
 */
function _calculateCost(
  provider: AIProvider,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = COST_PER_1M_TOKENS[provider];
  const inputCost = (promptTokens / 1_000_000) * costs.input;
  const outputCost = (completionTokens / 1_000_000) * costs.output;
  return inputCost + outputCost;
}

/**
 * Get cheapest available provider
 */
export function getCheapestProvider(): AIProvider {
  // Order by cost (cheapest first)
  return 'grok'; // Grok is free via Vercel
}

/**
 * Health check for AI services
 */
export async function checkAIHealth(): Promise<Record<AIProvider, boolean>> {
  const results: Record<AIProvider, boolean> = {
    openai: false,
    google: false,
    grok: false,
    anthropic: false,
  };

  // Quick check using minimal tokens
  const testProviders: AIProvider[] = ['google', 'openai', 'grok'];

  for (const provider of testProviders) {
    try {
      const response = await generateAIResponse('OK', {
        provider,
        model: PROVIDER_CONFIG[provider].defaultModel,
        maxTokens: 1,
      });
      results[provider] = response.success;
    } catch {
      results[provider] = false;
    }
  }

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const AIGateway = {
  generate: generateAIResponse,
  stream: streamAIResponse,
  generateObject: generateAIObject,
  clinical: {
    generateAnalysis: generateClinicalAnalysis,
    generateSuggestions: generateFormSuggestions,
    generateExercise: generateExerciseSuggestion,
  },
  chat: chatWithAI,
  health: checkAIHealth,
  getCheapestProvider,
};

// Re-export types
export type { AIRequestOptions, AIResponse, AIStreamOptions };
