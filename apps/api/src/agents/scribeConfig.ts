import { WorkersAINova3STT } from "@cloudflare/voice";

type AiBinding = ConstructorParameters<typeof WorkersAINova3STT>[0];

/**
 * Glossário clínico de fisioterapia para keyterm boosting do Nova-3.
 * Termos que ASR genérico costuma errar em pt-BR clínico.
 */
export const SCRIBE_KEYTERMS = [
  "fisioterapia",
  "ombro",
  "joelho",
  "lombar",
  "cervical",
  "EVA",
  "ADM",
  "Mulligan",
  "Maitland",
  "neurodinâmica",
  "mobilização",
  "cinesioterapia",
  "propriocepção",
  "isometria",
  "alongamento",
  "fortalecimento",
  "cadeia cinética",
  "liberação miofascial",
  "ventosaterapia",
  "eletroterapia",
];

/**
 * Nova-3 em pt-BR (Flux é focado em inglês/voice-agents — por isso o scribe v2
 * nunca saiu da flag). Nova-3 é o recomendado pela doc para ditado (withVoiceInput).
 */
export const SCRIBE_NOVA3_OPTIONS = {
  language: "pt-BR",
  punctuate: true,
  smartFormat: true,
  keyterms: SCRIBE_KEYTERMS,
} as const;

export function createScribeTranscriber(ai: AiBinding): WorkersAINova3STT {
  return new WorkersAINova3STT(ai, SCRIBE_NOVA3_OPTIONS);
}
