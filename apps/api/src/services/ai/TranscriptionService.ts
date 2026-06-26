import type { Env } from "../../types/env";

/**
 * TranscriptionService - Converte áudio em texto usando Workers AI (Whisper Large V3 Turbo).
 * Ideal para evolução clínica por voz.
 *
 * Formato: base64 string (conforme docs oficiais Cloudflare para whisper-large-v3-turbo).
 */
export class TranscriptionService {
  constructor(private env: Env) {}

  /**
   * Transcreve um arquivo de áudio (ArrayBuffer) para texto.
   * Suporta formatos comuns como MP3, WAV, M4A.
   */
  async transcribe(audioBuffer: ArrayBuffer): Promise<string> {
    try {
      // Converter ArrayBuffer para base64 string (formato esperado pelo whisper-large-v3-turbo)
      const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

      const response = await this.env.AI.run("@cf/openai/whisper-large-v3-turbo", {
        audio: base64,
        language: "pt-BR",
      });

      return (response as any).text || "";
    } catch (error) {
      console.error("Erro TranscriptionService:", error);
      throw new Error("Falha ao transcrever áudio via Cloudflare Workers AI.");
    }
  }
}
