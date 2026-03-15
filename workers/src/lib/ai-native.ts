import type { Env } from '../types/env';

/**
 * Utilitários para usar o Cloudflare Workers AI (Modelos Nativos).
 */

export async function runAi(env: Env, model: string, input: any) {
  if (!env.AI) {
    throw new Error('Workers AI binding (env.AI) not found.');
  }
  return await env.AI.run(model, input);
}

/**
 * Transcrição de áudio usando OpenAI Whisper no Workers AI.
 */
export async function transcribeWithWhisper(env: Env, audioBase64: string) {
  const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
  
  const response = await runAi(env, '@cf/openai/whisper', {
    audio: [...audioBuffer]
  });
  
  return response.text;
}

/**
 * Resumo clínico usando Llama 3.1 no Workers AI.
 */
export async function summarizeClinicalNote(env: Env, text: string) {
  const response = await runAi(env, '@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'Você é um assistente de fisioterapia. Resuma o seguinte registro clínico de forma concisa e técnica.' },
      { role: 'user', content: text }
    ]
  });
  
  return response.response;
}
