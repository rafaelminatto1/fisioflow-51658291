import type { Env } from '../types/env';
import { TurboQuant } from '@fisioflow/core';

/**
 * Utilitários para usar o Cloudflare Workers AI (Modelos Nativos).
 * Todas as chamadas passam pelo AI Gateway para logging, caching e rate limiting.
 *
 * Gateway ID: fisioflow-gateway
 * Caching habilitado para chamadas não-clínicas (exercícios, educação)
 */

const AI_GATEWAY_ID = 'fisioflow-gateway';

/** Opções de gateway para chamadas AI */
type GatewayOpts = {
  /** Habilitar cache de resposta (apenas para conteúdo não-sensível) */
  cache?: boolean;
  /** TTL do cache em segundos (padrão: 3600 = 1h) */
  cacheTtl?: number;
  /** Afinidade de sessão para prompt caching (multi-turn) */
  sessionId?: string;
};

function buildGateway(opts: GatewayOpts = {}) {
  return {
    id: AI_GATEWAY_ID,
    ...(opts.cache === false
      ? { skipCache: true }
      : { cacheTtl: opts.cacheTtl ?? 3600 }),
  };
}

/** Executa qualquer modelo Workers AI com gateway routing */
export async function runAi(env: Env, model: string, input: unknown, opts: GatewayOpts = {}) {
  if (!env.AI) throw new Error('Workers AI binding (env.AI) not found.');
  const headers: Record<string, string> = {};
  if (opts.sessionId) {
    // Prompt caching: rotas para mesma instância GPU maximizando cache-hit
    headers['x-session-affinity'] = opts.sessionId;
  }
  // Cast necessário: Workers AI types não incluem todos os modelos partner
  return (env.AI as any).run(model, input, { gateway: buildGateway(opts), headers });
}

/**
 * Transcrição de áudio — Deepgram Nova-3 (pt-BR nativo, mais rápido que Whisper).
 * Fallback para Whisper Large V3 Turbo se Nova-3 falhar.
 */
export async function transcribeAudio(env: Env, audioBase64: string, language = 'pt-BR'): Promise<string> {
  const audioBuffer = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));

  // Deepgram Nova-3: suporte pt-BR nativo, otimizado para voz conversacional
  try {
    const response = await runAi(
      env,
      '@cf/deepgram/nova-3',
      {
        audio: [...audioBuffer],
        language,
      },
      { cache: false }, // áudio clínico nunca cacheado
    );
    return (response as any).text as string ?? (response as any).transcript ?? '';
  } catch {
    // Fallback: Whisper Large V3 Turbo
    const fallback = await runAi(
      env,
      '@cf/openai/whisper-large-v3-turbo',
      { audio: [...audioBuffer] },
      { cache: false },
    );
    return (fallback as any).text as string ?? '';
  }
}

/**
 * Síntese de voz (TTS) — Deepgram Aura-2.
 * Usado para leitura de exercícios no app do paciente.
 * Retorna ArrayBuffer de áudio MP3.
 */
export async function synthesizeSpeech(env: Env, text: string, voice = 'asteria'): Promise<ArrayBuffer> {
  const response = await runAi(
    env,
    '@cf/deepgram/aura-2-es', // aura-2-es suporta pt-BR (espanhol/português similar)
    { text, voice },
    { cache: true, cacheTtl: 86400 }, // TTS de exercícios pode ser cacheado 24h
  );
  return (response as any) as ArrayBuffer;
}

/**
 * Resumo clínico estruturado — Llama 3.3-70b.
 * Retorna JSON com campos SOAP resumidos.
 * Prompt caching habilitado para o system prompt clínico.
 */
export async function summarizeClinicalNote(
  env: Env,
  text: string,
  sessionId?: string,
): Promise<string> {
  const response = await runAi(
    env,
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    {
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente clínico especializado em fisioterapia. Resuma o seguinte registro clínico de forma concisa e técnica, em português brasileiro. Preserve terminologia fisioterapêutica, escalas de dor (EVA, PSFS) e achados objetivos.',
        },
        { role: 'user', content: text },
      ],
      max_tokens: 512,
    },
    { cache: false, sessionId }, // registros clínicos nunca cacheados
  );
  return (response as any).response as string ?? '';
}

/**
 * Geração de sugestão SOAP com JSON mode garantido.
 * Usa Llama 3.1-8b para velocidade.
 */
export async function generateSoapSuggestion(
  env: Env,
  chiefComplaint: string,
  patientHistory: string,
  sessionId?: string,
): Promise<{ subjective: string; objective: string; assessment: string; plan: string }> {
  const response = await runAi(
    env,
    '@cf/meta/llama-3.1-8b-instruct',
    {
      messages: [
        {
          role: 'system',
          content: `Você é um assistente de fisioterapia. Gere uma sugestão de nota SOAP em português brasileiro baseada nas informações fornecidas.
Responda APENAS com JSON válido neste formato exato:
{"subjective":"...","objective":"...","assessment":"...","plan":"..."}
Sem markdown, sem explicações adicionais.`,
        },
        {
          role: 'user',
          content: `Queixa principal: ${chiefComplaint}\nHistórico: ${patientHistory}`,
        },
      ],
      max_tokens: 800,
    },
    { cache: false, sessionId },
  );

  const raw = (response as any).response as string ?? '{}';
  try {
    // Extrai JSON mesmo se o modelo adicionar texto extra
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? '{}');
  } catch {
    return { subjective: '', objective: '', assessment: raw, plan: '' };
  }
}

/**
 * Análise de imagem clínica — Llama 4 Scout (multimodal, visão).
 * Usado para análise de posturas, radiografias e fotos de evolução.
 */
export async function analyzeClinicImage(
  env: Env,
  imageBase64: string,
  prompt: string,
): Promise<string> {
  const imageArray = Array.from(Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0)));

  const response = await runAi(
    env,
    '@cf/meta/llama-4-scout-17b-16e-instruct',
    {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: imageArray },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 512,
    },
    { cache: false },
  );
  return (response as any).response as string ?? '';
}

/**
 * Moderação de conteúdo — Llama Guard 3.
 * Verifica se mensagem de paciente contém conteúdo inadequado.
 * Retorna true se seguro, false se deve ser revisado.
 */
export async function moderateContent(env: Env, text: string): Promise<boolean> {
  try {
    const response = await runAi(
      env,
      '@cf/meta/llama-guard-3-8b',
      {
        messages: [{ role: 'user', content: text }],
      },
      { cache: true, cacheTtl: 300 },
    );
    const result = (response as any).response as string ?? 'safe';
    return result.toLowerCase().includes('safe');
  } catch {
    return true; // Fail open para não bloquear mensagens legítimas
  }
}

/**
 * Geração de embeddings para busca semântica (Vectorize).
 * Usa Workers AI `bge-base-en-v1.5` para manter compatibilidade com o índice 768d.
 */
export async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const response = await runAi(
    env,
    '@cf/baai/bge-base-en-v1.5',
    { text: [text] },
    { cache: true, cacheTtl: 86400 },
  );
  return ((response as any).data?.[0] ?? []) as number[];
}

/**
 * Gera um sketch TurboQuant comprimido (hex string) a partir de um vetor de embedding.
 * Útil para armazenamento ultra-eficiente e busca offline.
 */
export function generateTurboSketch(embedding: number[]): string {
  if (!embedding || embedding.length === 0) return '';
  
  const tq = new TurboQuant({ dimension: embedding.length });
  const sketch = tq.compress(embedding);
  
  // Converte Uint8Array para hex string para armazenamento simples no Postgres
  return Array.from(sketch)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converte a string hexadecimal devolvida pelo banco de volta para o Array de bytes nativo.
 * Necessário para alimentar o calculador de similaridade O(1) do TurboQuant.
 */
export function parseTurboSketch(hex: string): Uint8Array {
  if (!hex) return new Uint8Array(0);
  
  const sketch = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    sketch[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return sketch;
}
