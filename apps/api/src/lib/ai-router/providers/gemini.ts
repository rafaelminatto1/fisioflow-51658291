import { AiProvider, ProviderContext } from './index'
import { AiRequestOptions, AiResponse, AiModelConfig } from '../types'
import { callGemini } from '../../ai-gemini'

export class GeminiProvider implements AiProvider {
  /**
   * Execute a request against Google Gemini
   */
  async execute(
    config: AiModelConfig,
    options: AiRequestOptions,
    context: ProviderContext
  ): Promise<AiResponse> {
    const start = Date.now()
    const { env } = context
    
    if (!env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is missing in environment variables')
    }

    let fullPrompt = options.prompt
    if (options.systemPrompt) {
      fullPrompt = `System instructions:\n${options.systemPrompt}\n\nUser prompt:\n${options.prompt}`
    }

    let aiContext: "clinical" | "general" | "exercise" = "clinical"
    if (options.taskType === 'exercise-search' || options.taskType === 'hep-generation') {
      aiContext = "exercise"
    } else if (options.taskType === 'chat-assistant') {
      aiContext = "general"
    }

    const result = await callGemini(
      env.GOOGLE_AI_API_KEY,
      fullPrompt,
      config.model,
      env.FISIOFLOW_AI_GATEWAY_URL,
      env.CF_AI_GATEWAY_TOKEN,
      aiContext
    )

    return {
      content: result,
      model: config.model,
      provider: 'gemini',
      latencyMs: Date.now() - start
    }
  }
}
