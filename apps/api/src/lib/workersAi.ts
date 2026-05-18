/**
 * Registry centralizado dos modelos Workers AI.
 *
 * Why: changelog Cloudflare 2026-05-08 deprecia 18 modelos em 30/05/2026.
 * Manter strings hardcoded espalhadas pelo código tornou auditorias frágeis.
 * Toda referência a modelo deve passar por `WORKERS_AI_MODELS`.
 *
 * Política: a variante `-fast` permanece ativa após a deprecação — substituímos
 * `@cf/meta/llama-3.1-8b-instruct` por `@cf/meta/llama-3.1-8b-instruct-fast`
 * (mesma família, formato de saída idêntico, latência inferior).
 *
 * Linter futuro: ver `apps/api/src/__tests__/ai-models.test.ts` que falha se
 * qualquer string deprecada reaparecer em apps/api/src/.
 */
export const WORKERS_AI_MODELS = {
  /** Llama 3.1 8B — JSON mode, prompts curtos, baixa latência. Substitui o legado deprecado. */
  llama_3_1_8b: "@cf/meta/llama-3.1-8b-instruct-fast",
  /** Llama 3.3 70B — raciocínio clínico, sumarização longa. */
  llama_3_3_70b: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  /** Llama 4 Scout — multimodal (visão), análise de imagens clínicas. */
  llama_4_scout: "@cf/meta/llama-4-scout-17b-16e-instruct",
  /** Llama Guard 3 — moderação de saída. */
  llama_guard: "@cf/meta/llama-guard-3-8b",
  /** Whisper turbo — transcrição PT-BR. */
  whisper: "@cf/openai/whisper-large-v3-turbo",
  /** Nova-3 — STT alternativa de baixa latência. */
  nova_3: "@cf/deepgram/nova-3",
  /** Aura-2 ES — TTS PT-BR (espanhol similar). */
  aura_2: "@cf/deepgram/aura-2-es",
  /** BGE M3 — embeddings 1024d multi-língua. */
  embeddings_bge_m3: "@cf/baai/bge-m3",
  /** BGE base EN — embeddings 768d, índice clínico legado. */
  embeddings_bge_base: "@cf/baai/bge-base-en-v1.5",
  /** Reranker BGE para hybrid search. */
  reranker: "@cf/baai/bge-reranker-base",
  /** Tradução M2M-100. */
  translate: "@cf/meta/m2m100-1.2b",
} as const;

/** Lista dos modelos deprecados em 2026-05-30 (para o teste de regressão). */
export const DEPRECATED_MODELS_2026_05_30 = [
  "@cf/moonshotai/kimi-k2.5",
  "@hf/meta-llama/meta-llama-3-8b-instruct",
  "@cf/meta/llama-3-8b-instruct",
  "@cf/meta/llama-3-8b-instruct-awq",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-awq",
  "@cf/meta/llama-3.1-70b-instruct",
  "@cf/meta/llama-2-7b-chat-int8",
  "@cf/meta/llama-2-7b-chat-fp16",
  "@cf/mistral/mistral-7b-instruct-v0.1",
  "@hf/mistral/mistral-7b-instruct-v0.2",
  "@hf/google/gemma-7b-it",
  "@cf/google/gemma-3-12b-it",
  "@hf/nousresearch/hermes-2-pro-mistral-7b",
  "@cf/microsoft/phi-2",
  "@cf/defog/sqlcoder-7b-2",
  "@cf/unum/uform-gen2-qwen-500m",
  "@cf/facebook/bart-large-cnn",
] as const;

export type WorkersAiModelKey = keyof typeof WORKERS_AI_MODELS;
