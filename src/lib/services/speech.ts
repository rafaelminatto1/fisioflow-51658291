/**
 * Speech-to-Text Service
 *
 * Client-side service for speech transcription using Cloud Functions
 *
 * @module lib/services/speech
 */


// ============================================================================
// TYPES
// ============================================================================

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/integrations/firebase/app';

export interface TranscriptionOptions {
  audioData: string;
  mimeType: string;
  languageCode?: string;
  context?: 'medical' | 'general' | 'technical';
  includeAlternatives?: boolean;
  includeWordOffsets?: boolean;
}

export interface TranscriptionResult {
  transcription: string;
  confidence: number;
  languageCode: string;
  alternatives?: Array<{ transcription: string; confidence: number }>;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}

export interface LongAudioTranscriptionOptions {
  audioUri: string;
  languageCode?: string;
  context?: 'medical' | 'general';
}

// ============================================================================
// SPEECH-TO-TEXT SERVICE
// ============================================================================

class SpeechToTextService {
  /**
   * Transcribe audio data
   */
  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      const transcribeFn = httpsCallable<
        TranscriptionOptions,
        TranscriptionResult
      >(functions, 'transcribeAudio');

      const result = await transcribeFn(options);

      if (!result.data) {
        throw new Error('No transcription result returned');
      }

      return result.data;
    } catch (error) {
      console.error('Speech transcription failed:', error);
      throw new Error(
        `Falha na transcrição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Transcribe long audio file (from GCS)
   */
  async transcribeLongAudio(
    options: LongAudioTranscriptionOptions
  ): Promise<{ transcription: string; confidence: number }> {
    try {
      const transcribeFn = httpsCallable<
        LongAudioTranscriptionOptions,
        { transcription: string; confidence: number }
      >(functions, 'transcribeLongAudio');

      const result = await transcribeFn(options);

      if (!result.data) {
        throw new Error('No transcription result returned');
      }

      return result.data;
    } catch (error) {
      console.error('Long audio transcription failed:', error);
      throw new Error(
        `Falha na transcrição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Transcribe consultation audio (with medical context)
   */
  async transcribeConsultation(audioData: string, mimeType: string): Promise<string> {
    const result = await this.transcribe({
      audioData,
      mimeType,
      languageCode: 'pt-BR',
      context: 'medical',
      includeAlternatives: false,
      includeWordOffsets: true,
    });

    return result.transcription;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let speechServiceInstance: SpeechToTextService | null = null;

export function getSpeechToTextService(): SpeechToTextService {
  if (!speechServiceInstance) {
    speechServiceInstance = new SpeechToTextService();
  }
  return speechServiceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const speechToTextService = getSpeechToTextService();

// Convenience exports
export async function transcribeAudio(
  audioData: string,
  mimeType: string,
  options?: Partial<TranscriptionOptions>
): Promise<TranscriptionResult> {
  return speechToTextService.transcribe({
    audioData,
    mimeType,
    ...options,
  });
}

export async function transcribeConsultation(
  audioData: string,
  mimeType: string
): Promise<string> {
  return speechToTextService.transcribeConsultation(audioData, mimeType);
}
