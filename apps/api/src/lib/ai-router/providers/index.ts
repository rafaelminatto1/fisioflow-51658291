import { AiRequestOptions, AiResponse, AiModelConfig } from '../types'

export interface ProviderContext {
  env: any
}

export interface AiProvider {
  execute(
    config: AiModelConfig,
    options: AiRequestOptions,
    context: ProviderContext
  ): Promise<AiResponse>
}

export * from './workers-ai'
export * from './gemini'

