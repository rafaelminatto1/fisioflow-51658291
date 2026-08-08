import { AiRouterConfig } from './types'

export const defaultAiConfig: AiRouterConfig = {
  'voice-scribe': {
    provider: 'workers-ai',
    model: '@cf/meta/llama-3-8b-instruct',
    fallback: {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    }
  },
  'clinical-note': {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    temperature: 0.2
  },
  'digital-twin': {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    temperature: 0.4
  },
  'embedding': {
    provider: 'workers-ai',
    model: '@cf/baai/bge-m3'
  },
  'exercise-search': {
    provider: 'workers-ai',
    model: '@cf/baai/bge-m3'
  },
  'hep-generation': {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    temperature: 0.3
  },
  'soap-summary': {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    temperature: 0.1
  },
  'chat-assistant': {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    temperature: 0.7
  },
  'image-analysis': {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    temperature: 0.1
  }
}
