/**
 * Firebase AI Logic Model Instances
 *
 * Provides typed instances for Gemini models with proper configuration.
 * Implements Firebase SDK v11+ patterns with error handling.
 *
 * @module firebase/ai/models
 */

import { AIModelType, AIFeatureCategory, AIRequestOptions, MODEL_CONFIGS } from './config';

// Type for Firebase AI instance
type FirebaseAIInstance = {
  generateContent(options: unknown): Promise<unknown>;
  generateContentStream(options: unknown): AsyncIterable<unknown>;
};

/**
 * AI response structure
 */
export interface AIResponse<T = unknown> {
  /** Generated content */
  content: T;

  /** Input tokens consumed */
  inputTokens: number;

  /** Output tokens consumed */
  outputTokens: number;

  /** Total tokens */
  totalTokens: number;

  /** Request duration in milliseconds */
  duration: number;

  /** Model used */
  model: AIModelType;

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Finish reason */
  finishReason?: string;
}

/**
 * Streaming response callback
 */
export type AIStreamCallback = (chunk: string, done: boolean) => void | Promise<void>;

/**
 * Chat message structure
 */
export interface ChatMessage {
  /** Message role */
  role: 'user' | 'model' | 'system';

  /** Message content */
  content: string;

  /** Optional additional data */
  metadata?: Record<string, unknown>;
}

/**
 * Function calling definition
 */
export interface AIFunction {
  /** Function name */
  name: string;

  /** Function description */
  description: string;

  /** Function parameters schema */
  parameters?: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      properties?: Record<string, unknown>;
      required?: string[];
      items?: Record<string, unknown>;
    }>;
    required?: string[];
  };
}

/**
 * Function call result
 */
export interface AIFunctionCall {
  /** Function name */
  name: string;

  /** Parsed arguments */
  args: Record<string, unknown>;
}

/**
 * Model instance interface
 */
export interface IAIModel {
  /** Generate completion */
  generate(
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;

  /** Generate chat completion */
  generateChat(
    messages: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;

  /** Generate with function calling */
  generateWithFunctions(
    prompt: string,
    functions: AIFunction[],
    options?: AIRequestOptions
  ): Promise<AIResponse<AIFunctionCall | string>>;

  /** Generate streaming completion */
  generateStream(
    prompt: string,
    callback: AIStreamCallback,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;

  /** Generate multimodal completion */
  generateMultimodal(
    content: Array<{ type: 'text' | 'image'; data: string }>,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;
}

/**
 * Base AI Model class
 */
abstract class BaseAIModel implements IAIModel {
  constructor(protected modelType: AIModelType) {}

  /**
   * Get model configuration
   */
  protected getConfig() {
    return MODEL_CONFIGS[this.modelType];
  }

  /**
   * Merge options with defaults
   */
  protected mergeOptions(options?: AIRequestOptions): Required<AIRequestOptions> {
    const config = this.getConfig();
    return {
      model: options?.model || this.modelType,
      temperature: options?.temperature ?? config.temperature,
      maxOutputTokens: options?.maxOutputTokens ?? config.maxOutputTokens,
      topK: options?.topK ?? 40,
      topP: options?.topP ?? 0.95,
      timeout: options?.timeout ?? config.requestTimeout,
      stream: options?.stream ?? false,
    };
  }

  /**
   * Track request metrics
   */
  protected trackMetrics(
    inputTokens: number,
    outputTokens: number,
    duration: number
  ): { totalTokens: number; estimatedCost: number } {
    const config = this.getConfig();
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost =
      (inputTokens / 1_000_000) * config.costPerMillionInputTokens +
      (outputTokens / 1_000_000) * config.costPerMillionOutputTokens;

    return { totalTokens, estimatedCost };
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  protected estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  abstract generate(
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;

  abstract generateChat(
    messages: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;

  abstract generateWithFunctions(
    prompt: string,
    functions: AIFunction[],
    options?: AIRequestOptions
  ): Promise<AIResponse<AIFunctionCall | string>>;

  abstract generateStream(
    prompt: string,
    callback: AIStreamCallback,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;

  abstract generateMultimodal(
    content: Array<{ type: 'text' | 'image'; data: string }>,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;
}

/**
 * Firebase AI Logic Model Implementation
 */
export class FirebaseAIModel extends BaseAIModel {
  private aiInstance: FirebaseAIInstance;

  constructor(modelType: AIModelType, aiInstance: FirebaseAIInstance) {
    super(modelType);
    this.aiInstance = aiInstance;
  }

  /**
   * Generate completion
   */
  async generate(
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    try {
      // Prepare generation config
      const generationConfig = {
        temperature: mergedOptions.temperature,
        maxOutputTokens: mergedOptions.maxOutputTokens,
        topK: mergedOptions.topK,
        topP: mergedOptions.topP,
      };

      // Generate content
      const result = await Promise.race([
        this.aiInstance.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
        this.createTimeout(mergedOptions.timeout),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Extract response
      const content = result.response?.text() || '';
      const usage = result.response?.usageMetadata;

      const inputTokens = usage?.promptTokenCount || this.estimateTokens(prompt);
      const outputTokens = usage?.candidatesTokenCount || this.estimateTokens(content);
      const { totalTokens, estimatedCost } = this.trackMetrics(inputTokens, outputTokens, duration);

      return {
        content,
        inputTokens,
        outputTokens,
        totalTokens,
        duration,
        model: this.modelType,
        estimatedCost,
        finishReason: result.response?.candidates?.[0]?.finishReason,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.createError(error, duration);
    }
  }

  /**
   * Generate chat completion
   */
  async generateChat(
    messages: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    try {
      // Convert messages to Firebase format
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }],
        }));

      const generationConfig = {
        temperature: mergedOptions.temperature,
        maxOutputTokens: mergedOptions.maxOutputTokens,
        topK: mergedOptions.topK,
        topP: mergedOptions.topP,
      };

      // Add system instruction if present
      const systemInstruction = messages.find(m => m.role === 'system')?.content;

      const result = await Promise.race([
        this.aiInstance.generateContent({
          systemInstruction,
          contents,
          generationConfig,
        }),
        this.createTimeout(mergedOptions.timeout),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      const content = result.response?.text() || '';
      const usage = result.response?.usageMetadata;

      const inputTokens = usage?.promptTokenCount ||
        this.estimateTokens(messages.map(m => m.content).join('\n'));
      const outputTokens = usage?.candidatesTokenCount || this.estimateTokens(content);
      const { totalTokens, estimatedCost } = this.trackMetrics(inputTokens, outputTokens, duration);

      return {
        content,
        inputTokens,
        outputTokens,
        totalTokens,
        duration,
        model: this.modelType,
        estimatedCost,
        finishReason: result.response?.candidates?.[0]?.finishReason,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.createError(error, duration);
    }
  }

  /**
   * Generate with function calling
   */
  async generateWithFunctions(
    prompt: string,
    functions: AIFunction[],
    options?: AIRequestOptions
  ): Promise<AIResponse<AIFunctionCall | string>> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    try {
      const tools = [{
        functionDeclarations: functions.map(f => ({
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        })),
      }];

      const generationConfig = {
        temperature: mergedOptions.temperature,
        maxOutputTokens: mergedOptions.maxOutputTokens,
      };

      const result = await Promise.race([
        this.aiInstance.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools,
          generationConfig,
        }),
        this.createTimeout(mergedOptions.timeout),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      const functionCall = result.response?.candidates?.[0]?.content?.parts?.[0]?.functionCall;

      let content: AIFunctionCall | string;
      let outputTokens = 0;

      if (functionCall) {
        content = {
          name: functionCall.name,
          args: functionCall.args,
        };
        outputTokens = this.estimateTokens(JSON.stringify(content));
      } else {
        content = result.response?.text() || '';
        outputTokens = this.estimateTokens(content);
      }

      const inputTokens = this.estimateTokens(prompt);
      const { totalTokens, estimatedCost } = this.trackMetrics(inputTokens, outputTokens, duration);

      return {
        content,
        inputTokens,
        outputTokens,
        totalTokens,
        duration,
        model: this.modelType,
        estimatedCost,
        finishReason: result.response?.candidates?.[0]?.finishReason,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.createError(error, duration);
    }
  }

  /**
   * Generate streaming completion
   */
  async generateStream(
    prompt: string,
    callback: AIStreamCallback,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    try {
      const generationConfig = {
        temperature: mergedOptions.temperature,
        maxOutputTokens: mergedOptions.maxOutputTokens,
        topK: mergedOptions.topK,
        topP: mergedOptions.topP,
      };

      const result = await this.aiInstance.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      let fullContent = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullContent += chunkText;
          await callback(chunkText, false);
        }
      }

      await callback('', true);

      const endTime = Date.now();
      const duration = endTime - startTime;

      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = this.estimateTokens(fullContent);
      const { totalTokens, estimatedCost } = this.trackMetrics(inputTokens, outputTokens, duration);

      return {
        content: fullContent,
        inputTokens,
        outputTokens,
        totalTokens,
        duration,
        model: this.modelType,
        estimatedCost,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.createError(error, duration);
    }
  }

  /**
   * Generate multimodal completion
   */
  async generateMultimodal(
    content: Array<{ type: 'text' | 'image'; data: string }>,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    try {
      const parts = content.map(item => {
        if (item.type === 'text') {
          return { text: item.data };
        } else {
          // Assume base64 image data
          return {
            inlineData: {
              mimeType: 'image/jpeg',
              data: item.data,
            },
          };
        }
      });

      const generationConfig = {
        temperature: mergedOptions.temperature,
        maxOutputTokens: mergedOptions.maxOutputTokens,
      };

      const result = await Promise.race([
        this.aiInstance.generateContent({
          contents: [{ role: 'user', parts }],
          generationConfig,
        }),
        this.createTimeout(mergedOptions.timeout),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      const responseContent = result.response?.text() || '';

      const inputTokens = this.estimateTokens(
        content.filter(c => c.type === 'text').map(c => c.data).join(' ')
      );
      const outputTokens = this.estimateTokens(responseContent);
      const { totalTokens, estimatedCost } = this.trackMetrics(inputTokens, outputTokens, duration);

      return {
        content: responseContent,
        inputTokens,
        outputTokens,
        totalTokens,
        duration,
        model: this.modelType,
        estimatedCost,
        finishReason: result.response?.candidates?.[0]?.finishReason,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.createError(error, duration);
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Create enhanced error
   */
  private createError(error: unknown, duration: number): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const enhancedError = new Error(`AI request failed: ${message}`);
    (enhancedError as any).duration = duration;
    (enhancedError as any).originalError = error;
    return enhancedError;
  }
}

/**
 * Model factory
 */
export class AIModelFactory {
  private static instances: Map<AIModelType, FirebaseAIModel> = new Map();

  /**
   * Get or create model instance
   */
  static getModel(modelType: AIModelType, aiInstance: FirebaseAIInstance): FirebaseAIModel {
    if (!this.instances.has(modelType)) {
      this.instances.set(modelType, new FirebaseAIModel(modelType, aiInstance));
    }
    return this.instances.get(modelType)!;
  }

  /**
   * Clear all instances
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}
