import { WorkersAINova3STT } from "@cloudflare/voice";

type AiBinding = ConstructorParameters<typeof WorkersAINova3STT>[0];

/**
 * Nova-3 em pt-BR (Flux é focado em inglês/voice-agents — por isso o scribe v2
 * nunca saiu da flag). Nova-3 é o recomendado pela doc para ditado (withVoiceInput).
 *
 * SEM keyterms: keyterm prompting do Nova-3 é EN-only na Deepgram. Com
 * language=pt-BR + keyterm, a conexão WS abre normalmente mas NENHUM evento
 * Results é emitido — a transcrição fica silenciosamente vazia (confirmado em
 * 11/07/2026 via A/B direto no WS do @cf/deepgram/nova-3). Glossário clínico
 * só poderá voltar se a Deepgram liberar keyterms multilíngues.
 */
export const SCRIBE_NOVA3_OPTIONS = {
  language: "pt-BR",
  punctuate: true,
  smartFormat: true,
} as const;

export function createScribeTranscriber(ai: AiBinding): WorkersAINova3STT {
  return new WorkersAINova3STT(ai, SCRIBE_NOVA3_OPTIONS);
}
