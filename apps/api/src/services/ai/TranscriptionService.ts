import type { Env } from "../../types/env";

/**
 * TranscriptionService - Converte áudio em texto usando Workers AI (Whisper).
 * Ideal para evolução clínica por voz.
 */
export class TranscriptionService {
  constructor(private env: Env) {}

  /**
   * Transcreve um arquivo de áudio (Blob ou ArrayBuffer) para texto.
   * Suporta formatos comuns como MP3, WAV, M4A.
   */
  async transcribe(audioBuffer: ArrayBuffer): Promise<string> {
    try {
      const response = await this.env.AI.run("@cf/openai/whisper", {
        audio: [...new Uint8Array(audioBuffer)],
      });

      return response.text || "";
    } catch (error) {
      console.error("Erro TranscriptionService:", error);
      throw new Error("Falha ao transcrever áudio via Cloudflare Workers AI.");
    }
  }
}
