export type AiTaskType = 
  | 'voice-scribe'        // Real-time voice transcription → needs speed
  | 'clinical-note'       // Complex clinical note generation → needs quality  
  | 'digital-twin'        // Patient digital twin summary → needs reasoning
  | 'embedding'           // Vector embeddings → needs efficiency
  | 'exercise-search'     // Semantic exercise search → needs relevance
  | 'hep-generation'      // Home exercise program generation
  | 'soap-summary'        // SOAP note summarization
  | 'chat-assistant'      // General clinical chat
  | 'image-analysis'      // Biomechanics image analysis

export interface AiModelConfig {
  provider: 'workers-ai' | 'gemini' | 'openai' | 'anthropic'
  model: string
  maxTokens?: number
  temperature?: number
  fallback?: AiModelConfig
}

export type AiRouterConfig = {
  [key in AiTaskType]: AiModelConfig
}

export interface AiRequestOptions {
  taskType: AiTaskType
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface AiResponse {
  content: string
  model: string
  provider: string
  tokensUsed?: number
  latencyMs: number
}
