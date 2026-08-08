import { AiProvider, ProviderContext } from './providers'
import { WorkersAiProvider } from './providers/workers-ai'
import { GeminiProvider } from './providers/gemini'
import { AiRequestOptions, AiResponse, AiModelConfig } from './types'
import { defaultAiConfig } from './config'

export class AiRouter {
  private env: any
  private providers: Record<string, AiProvider>

  constructor(env: any) {
    this.env = env
    this.providers = {
      'workers-ai': new WorkersAiProvider(),
      'gemini': new GeminiProvider()
      // openai and anthropic can be added here
    }
  }

  /**
   * Routes the AI request to the appropriate provider based on the task type.
   */
  async route(options: AiRequestOptions): Promise<AiResponse> {
    const config = defaultAiConfig[options.taskType]
    if (!config) {
      throw new Error(`No configuration found for task type: ${options.taskType}`)
    }

    return this.executeWithFallback(config, options)
  }

  private async executeWithFallback(config: AiModelConfig, options: AiRequestOptions): Promise<AiResponse> {
    const provider = this.providers[config.provider]
    if (!provider) {
      throw new Error(`Provider not implemented: ${config.provider}`)
    }

    try {
      return await provider.execute(config, options, { env: this.env })
    } catch (error) {
      console.error(`AI Provider error (${config.provider}):`, error)
      
      if (config.fallback) {
        console.warn(`Falling back to ${config.fallback.provider}...`)
        return this.executeWithFallback(config.fallback, options)
      }
      
      throw error
    }
  }
}
