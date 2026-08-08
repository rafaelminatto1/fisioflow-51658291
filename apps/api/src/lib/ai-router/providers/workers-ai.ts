import { AiProvider, ProviderContext } from './index'
import { AiRequestOptions, AiResponse, AiModelConfig } from '../types'

export class WorkersAiProvider implements AiProvider {
  /**
   * Execute a request against Cloudflare Workers AI
   */
  async execute(
    config: AiModelConfig,
    options: AiRequestOptions,
    context: ProviderContext
  ): Promise<AiResponse> {
    const start = Date.now()
    const { env } = context
    
    if (!env.AI) {
      throw new Error('AI binding is missing in environment variables')
    }

    // Embedding handling
    if (config.model.includes('bge-m3') || options.taskType === 'embedding' || options.taskType === 'exercise-search') {
      const response = await env.AI.run(config.model, {
        text: options.prompt
      })
      
      return {
        content: JSON.stringify(response.data || response),
        model: config.model,
        provider: 'workers-ai',
        latencyMs: Date.now() - start
      }
    }

    // Text generation handling
    const messages = []
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: options.prompt })

    const response = await env.AI.run(config.model, {
      messages,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature ?? config.temperature
    })

    return {
      content: response.response || (response as any).result || '',
      model: config.model,
      provider: 'workers-ai',
      latencyMs: Date.now() - start
    }
  }
}
