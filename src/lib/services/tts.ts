/**
 * Text-to-Speech Service
 *
 * Client-side service for speech synthesis using Cloud Functions
 *
 * @module lib/services/tts
 */

import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export type SynthesisType = 'accessibility' | 'exercise' | 'countdown' | 'encouragement';

export interface SynthesisOptions {
  text?: string;
  exerciseName?: string;
  instruction?: string;
  type?: SynthesisType;
  languageCode?: string;
  countFrom?: number;
}

// ============================================================================
// TEXT-TO-SPEECH SERVICE
// ============================================================================

class TextToSpeechService {
  private readonly baseUrl: string;

  constructor() {
    // Use the Firebase Functions URL
    this.baseUrl = import.meta.env.VITE_API_BASE_URL ||
      'https://southamerica-east1-fisioflow-migration.cloudfunctions.net';
  }

  /**
   * Synthesize speech
   */
  async synthesize(options: SynthesisOptions): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/synthesizeTTS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Synthesis failed');
      }

      const audioBlob = await response.blob();
      return audioBlob;
    } catch (error) {
      logger.error('TTS synthesis failed:', error);
      throw new Error(
        `Falha na síntese de voz: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Synthesize exercise instruction
   */
  async synthesizeExercise(
    exerciseName: string,
    instruction: string,
    languageCode: string = 'pt-BR'
  ): Promise<Blob> {
    return this.synthesize({
      type: 'exercise',
      exerciseName,
      instruction,
      languageCode,
    });
  }

  /**
   * Synthesize for accessibility
   */
  async synthesizeAccessibility(
    text: string,
    languageCode: string = 'pt-BR'
  ): Promise<Blob> {
    return this.synthesize({
      type: 'accessibility',
      text,
      languageCode,
    });
  }

  /**
   * Synthesize countdown
   */
  async synthesizeCountdown(startFrom: number = 3): Promise<Blob> {
    return this.synthesize({
      type: 'countdown',
      countFrom: startFrom,
    });
  }

  /**
   * Synthesize encouragement message
   */
  async synthesizeEncouragement(
    message: string = 'Ótimo trabalho! Continue assim.',
    languageCode: string = 'pt-BR'
  ): Promise<Blob> {
    return this.synthesize({
      type: 'encouragement',
      text: message,
      languageCode,
    });
  }

  /**
   * Get audio URL from blob
   */
  static getAudioUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revoke audio URL
   */
  static revokeAudioUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Play audio from blob
   */
  static async playAudio(blob: Blob): Promise<HTMLAudioElement> {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    await audio.play();

    // Clean up URL after audio finishes
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(url);
    });

    return audio;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let ttsServiceInstance: TextToSpeechService | null = null;

export function getTextToSpeechService(): TextToSpeechService {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TextToSpeechService();
  }
  return ttsServiceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const textToSpeechService = getTextToSpeechService();

// Convenience exports
export async function synthesizeExercise(
  exerciseName: string,
  instruction: string,
  languageCode?: string
): Promise<Blob> {
  return textToSpeechService.synthesizeExercise(exerciseName, instruction, languageCode);
}

export async function synthesizeAccessibility(
  text: string,
  languageCode?: string
): Promise<Blob> {
  return textToSpeechService.synthesizeAccessibility(text, languageCode);
}

export async function playSynthesizedAudio(blob: Blob): Promise<HTMLAudioElement> {
  return TextToSpeechService.playAudio(blob);
}

export { TextToSpeechService as TTS };
