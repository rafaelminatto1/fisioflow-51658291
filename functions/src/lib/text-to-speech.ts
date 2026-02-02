/**
 * Cloud Text-to-Speech Integration
 *
 * Provides speech synthesis for accessibility and exercise instructions
 * Free tier: 4 million characters/month (standard voices)
 *
 * @module lib/text-to-speech
 */

import { TextToSpeechClient as GoogleTTSClient, protos } from '@google-cloud/text-to-speech';
import { getLogger } from './logger';

const logger = getLogger('text-to-speech');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
const TTS_ENABLED = process.env.CLOUD_TTS_ENABLED !== 'false';

// ============================================================================
// TYPES
// ============================================================================

export type VoiceGender = 'MALE' | 'FEMALE' | 'NEUTRAL';
export type AudioEncoding = 'MP3' | 'OGG_OPUS' | 'LINEAR16';

export interface SynthesisOptions {
  languageCode?: string;
  voiceGender?: VoiceGender;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  audioEncoding?: AudioEncoding;
  enableTimepoints?: boolean;
}

export interface SynthesisResult {
  audioContent: Buffer;
  timepoints?: Array<{
    tagName: string;
    timeSeconds: number;
  }>;
}

// ============================================================================
// TEXT-TO-SPEECH CLIENT CLASS
// ============================================================================

/**
 * Cloud Text-to-Speech Client
 */
export class TextToSpeechClient {
  private client: GoogleTTSClient;

  constructor() {
    this.client = new GoogleTTSClient({
      projectId: PROJECT_ID,
    });
    logger.info('Text-to-Speech client initialized');
  }

  /**
   * Map our audio encoding to Google's enum
   */
  private getAudioEncoding(encoding: AudioEncoding): protos.google.cloud.texttospeech.v1.AudioEncoding {
    const encodingMap: Record<AudioEncoding, protos.google.cloud.texttospeech.v1.AudioEncoding> = {
      'MP3': protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
      'OGG_OPUS': protos.google.cloud.texttospeech.v1.AudioEncoding.OGG_OPUS,
      'LINEAR16': protos.google.cloud.texttospeech.v1.AudioEncoding.LINEAR16,
    };
    return encodingMap[encoding] || protos.google.cloud.texttospeech.v1.AudioEncoding.MP3;
  }

  /**
   * Map gender to SSML voice gender
   */
  private getSSMLGender(gender?: VoiceGender): protos.google.cloud.texttospeech.v1.SsmlVoiceGender {
    const genderMap: Record<VoiceGender, protos.google.cloud.texttospeech.v1.SsmlVoiceGender> = {
      'MALE': protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE,
      'FEMALE': protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
      'NEUTRAL': protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL,
    };
    return genderMap[gender || 'NEUTRAL'];
  }

  /**
   * Synthesize speech from plain text
   */
  async synthesize(
    text: string,
    options: SynthesisOptions = {}
  ): Promise<SynthesisResult> {
    const {
      languageCode = 'pt-BR',
      voiceGender = 'NEUTRAL',
      speakingRate = 1.0,
      pitch = 0.0,
      volumeGainDb = 0.0,
      audioEncoding = 'MP3',
    } = options;

    try {
      logger.info('Synthesizing speech', {
        textLength: text.length,
        languageCode,
      });

      const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: {
          text,
        },
        voice: {
          languageCode,
          ssmlGender: this.getSSMLGender(voiceGender),
        },
        audioConfig: {
          audioEncoding: this.getAudioEncoding(audioEncoding),
          speakingRate,
          pitch,
          volumeGainDb,
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content in response');
      }

      const result: SynthesisResult = {
        audioContent: Buffer.from(response.audioContent),
      };

      const timepoints = (response as { timepoints?: Array<{ tagName?: string | null; timeSeconds?: number | null }> }).timepoints;
      if (timepoints && timepoints.length > 0) {
        result.timepoints = timepoints.map((tp: { tagName?: string | null; timeSeconds?: number | null }) => ({
          tagName: tp.tagName || '',
          timeSeconds: tp.timeSeconds || 0,
        }));
      }

      logger.info('Speech synthesis completed', {
        audioLength: result.audioContent.length,
      });

      return result;
    } catch (error) {
      logger.error('Speech synthesis failed:', error);
      throw new Error(`Text-to-Speech failed: ${(error as Error).message}`);
    }
  }

  /**
   * Synthesize speech from SSML
   */
  async synthesizeWithSSML(
    ssml: string,
    languageCode: string = 'pt-BR',
    audioEncoding: AudioEncoding = 'MP3'
  ): Promise<SynthesisResult> {
    try {
      logger.info('Synthesizing SSML', {
        ssmlLength: ssml.length,
        languageCode,
      });

      const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: {
          ssml,
        },
        voice: {
          languageCode,
          ssmlGender: this.getSSMLGender('NEUTRAL'),
        },
        audioConfig: {
          audioEncoding: this.getAudioEncoding(audioEncoding),
          speakingRate: 1.0,
          pitch: 0.0,
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content in response');
      }

      return {
        audioContent: Buffer.from(response.audioContent),
      };
    } catch (error) {
      logger.error('SSML synthesis failed:', error);
      throw new Error(`SSML synthesis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Synthesize exercise instruction with SSML
   */
  async synthesizeExerciseInstruction(
    exerciseName: string,
    instruction: string,
    languageCode: string = 'pt-BR'
  ): Promise<Buffer> {
    const ssml = `
      <speak>
        <p>
          <s>Exercício: <emphasis level="strong">${exerciseName}</emphasis></s>
          <s><break time="500ms"/>${instruction}</s>
          <s><break time="300ms"/>Prepare-se para começar.</s>
          <s><break time="1s"/>Inicie.</s>
        </p>
      </speak>
    `;

    const result = await this.synthesizeWithSSML(ssml, languageCode);
    return result.audioContent;
  }

  /**
   * Synthesize for accessibility (slower, clearer speech)
   */
  async synthesizeAccessibility(
    text: string,
    languageCode: string = 'pt-BR'
  ): Promise<Buffer> {
    const result = await this.synthesize(text, {
      languageCode,
      speakingRate: 0.9, // Slower for better comprehension
      pitch: 0.0,
      audioEncoding: 'MP3',
    });
    return result.audioContent;
  }

  /**
   * Synthesize countdown
   */
  async synthesizeCountdown(
    startFrom: number = 3,
    languageCode: string = 'pt-BR'
  ): Promise<Buffer> {
    const numbers = Array.from({ length: startFrom }, (_, i) => startFrom - i);
    const ssml = `<speak>${numbers.map((n) => `<s>${n}</s><break time="1000ms"/>`).join('')}</speak>`;

    const result = await this.synthesizeWithSSML(ssml, languageCode);
    return result.audioContent;
  }

  /**
   * Synthesize encouragement message
   */
  async synthesizeEncouragement(
    message: string = 'Ótimo trabalho! Continue assim.',
    languageCode: string = 'pt-BR'
  ): Promise<Buffer> {
    const ssml = `
      <speak>
        <p>
          <s><emphasis level="strong">${message}</emphasis></s>
        </p>
      </speak>
    `;

    const result = await this.synthesizeWithSSML(ssml, languageCode);
    return result.audioContent;
  }

  /**
   * List available voices for a language
   */
  async listVoices(languageCode: string = 'pt-BR'): Promise<
    Array<{
      name: string;
      gender: string;
      languageCodes: string[];
    }>
  > {
    try {
      const [response] = await this.client.listVoices({
        languageCode,
      });

      return (
        response.voices?.map((voice: { name?: string | null; ssmlGenderName?: string | null; languageCodes?: string[] | null }) => ({
          name: voice.name || '',
          gender: voice.ssmlGenderName || '',
          languageCodes: voice.languageCodes || [],
        })) || []
      );
    } catch (error) {
      logger.error('Failed to list voices:', error);
      return [];
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let ttsClient: TextToSpeechClient | null = null;

/**
 * Get or create Text-to-Speech client (singleton)
 */
export function getTextToSpeechClient(): TextToSpeechClient {
  if (!ttsClient) {
    ttsClient = new TextToSpeechClient();
  }
  return ttsClient;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Synthesize exercise instruction
 */
export async function synthesizeForExercise(
  exerciseName: string,
  instruction: string
): Promise<Buffer> {
  if (!TTS_ENABLED) {
    logger.warn('Cloud Text-to-Speech disabled');
    throw new Error('Cloud Text-to-Speech is disabled');
  }

  const client = getTextToSpeechClient();
  return client.synthesizeExerciseInstruction(exerciseName, instruction);
}

/**
 * Synthesize for accessibility
 */
export async function synthesizeForAccessibility(
  text: string,
  languageCode: string = 'pt-BR'
): Promise<Buffer> {
  if (!TTS_ENABLED) {
    logger.warn('Cloud Text-to-Speech disabled');
    throw new Error('Cloud Text-to-Speech is disabled');
  }

  const client = getTextToSpeechClient();
  return client.synthesizeAccessibility(text, languageCode);
}

/**
 * Synthesize countdown
 */
export async function synthesizeCountdown(startFrom: number = 3): Promise<Buffer> {
  if (!TTS_ENABLED) {
    logger.warn('Cloud Text-to-Speech disabled');
    throw new Error('Cloud Text-to-Speech is disabled');
  }

  const client = getTextToSpeechClient();
  return client.synthesizeCountdown(startFrom);
}

/**
 * Check if Cloud Text-to-Speech is enabled
 */
export function isTextToSpeechEnabled(): boolean {
  return TTS_ENABLED;
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): string[] {
  return [
    'pt-BR', // Portuguese (Brazil)
    'en-US', // English (US)
    'es-ES', // Spanish
    'fr-FR', // French
  ];
}
