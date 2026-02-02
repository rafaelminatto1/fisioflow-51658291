/**
 * Cloud Speech-to-Text Integration
 *
 * Provides professional speech transcription with medical context
 * Free tier: 60 minutes/month
 *
 * @module lib/speech-to-text
 */

import { protos } from '@google-cloud/speech';
import { getLogger } from './logger';

const logger = getLogger('speech-to-text');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
const SPEECH_ENABLED = process.env.CLOUD_SPEECH_ENABLED !== 'false';

// Medical terms in Portuguese for better transcription accuracy
const MEDICAL_PHRASES_PT = [
  // General physiotherapy terms
  'fisioterapia', 'terapia', 'tratamento', 'sessão', 'paciente', 'terapeuta',
  'avaliação', 'evolução', 'diagnóstico', 'prognóstico', 'anamnese',

  // Body parts and movements
  'coluna', 'vertebral', 'cervical', 'torácica', 'lombar', 'sacral', 'cóccix',
  'ombro', 'cotovelo', 'punho', 'mão', 'dedo', 'quiro',
  'quadril', 'joelho', 'tornozelo', 'pé', 'podal',
  'flexão', 'extensão', 'abdução', 'adução', 'rotação', 'circundução',
  'pronação', 'supinação', 'eversão', 'inversão', 'dorsiflexão', 'plantiflexão',

  // Conditions and symptoms
  'dor', 'edema', 'inchaço', 'inflamação', 'contratura', 'espasmo',
  'fraqueza', 'paresia', 'plegia', 'parestesia', 'formigamento', 'adormecimento',
  'limitação', 'rigidez', 'instabilidade', 'hiper mobilidade', 'laxidão',

  // Assessment terms
  'amplitude de movimento', 'ADM', 'ganho de movimento', 'range of motion',
  'força muscular', 'graduação de força', 'escala de oxford', 'escala de lovett',
  'reflexos', 'reflexo tendinoso', 'reflexo osteotendinoso', 'rotuliano',
  'aquileu', 'bicipital', 'tricipital', 'patelar',

  // Treatment techniques
  'exercício', 'alongamento', 'stretching', 'fortalecimento', 'musculação',
  'mobilização', 'manipulação', 'massagem', 'liberação miofascial',
  'ultrassom', 'tens', 'corrente galvânica', 'diatermia', 'crioterapia', 'termoterapia',
  'tração', 'distração', 'pompage', 'mulligan', 'maitland', 'kaltenborn',

  // Posture and gait
  'postura', 'postural', 'escoliose', 'hiperlordose', 'cifose', 'lordose',
  'marcha', 'passada', 'base de suporte', 'balanceio', 'antepé', 'retropé',
  'cata', 'ataxia', 'dismetria', 'claudicação',

  // SOAP notes
  'subjetivo', 'objetivo', 'avaliação', 'plano', 'SOAP',
  'queixa principal', 'QP', 'história da doença atual', 'HDA',
  'antecedentes', 'história patológica', 'HP', 'história familiar',

  // Exercise related
  'série', 'repetição', 'reps', 'descanso', 'intervalo', 'carga',
  'isometria', 'isotônico', 'concêntrico', 'excêntrico',
  'propriocepção', 'equilíbrio', 'coordenação', 'agilidade', 'resistência',

  // Pain assessment
  'escala visual analógica', 'EVA', 'escala numérica', 'diagrama corporal',
  'localização', 'irradiação', 'intensidade', 'duração', 'frequência', 'característica',

  // Functional assessment
  'atividades de vida diária', 'AVD', 'atividades instrumentais', 'AIVD',
  'escala de berg', 'tineti', 'timed up and go', 'TUG', 'caminhada de 6 minutos',
];

// ============================================================================
// TYPES
// ============================================================================

export type AudioEncoding =
  | 'LINEAR16'
  | 'FLAC'
  | 'MP3'
  | 'OGG_OPUS'
  | 'SPEEX_WITH_HEADER_BYTE'
  | 'AMR'
  | 'AMR_WB'
  | 'OGG_OPUS';

export type SpeechContext = 'medical' | 'general' | 'technical';

export interface TranscriptionOptions {
  languageCode?: string;
  enableAutomaticPunctuation?: boolean;
  enableWordTimeOffsets?: boolean;
  profanityFilter?: boolean;
  speechContexts?: Array<{
    phrases: string[];
    boost?: number;
  }>;
  maxAlternatives?: number;
}

export interface TranscriptionResult {
  transcription: string;
  confidence: number;
  languageCode: string;
  alternatives?: Array<{
    transcription: string;
    confidence: number;
  }>;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}

// ============================================================================
// SPEECH-TO-TEXT CLIENT CLASS
// ============================================================================

/**
 * Cloud Speech-to-Text Client
 */
export class SpeechToTextClient {
  private client: protos.google.cloud.speech.v1.SpeechClient;

  constructor() {
    this.client = new protos.google.cloud.speech.v1.SpeechClient({
      projectId: PROJECT_ID,
    });
    logger.info('Speech-to-Text client initialized');
  }

  /**
   * Get audio encoding from MIME type
   */
  private getEncodingFromMimeType(mimeType: string): AudioEncoding {
    const encodingMap: Record<string, AudioEncoding> = {
      'audio/webm': 'WEBM_OPUS',
      'audio/ogg': 'OGG_OPUS',
      'audio/flac': 'FLAC',
      'audio/wav': 'LINEAR16',
      'audio/wave': 'LINEAR16',
      'audio/x-wav': 'LINEAR16',
      'audio/mpeg': 'MP3',
      'audio/mp3': 'MP3',
      'audio/mp4': 'FLAC',
      'audio/x-m4a': 'FLAC',
    };
    return encodingMap[mimeType.toLowerCase()] || 'LINEAR16';
  }

  /**
   * Get sample rate for audio format
   */
  private getSampleRate(mimeType: string): number {
    // Default sample rates (adjust based on recording setup)
    if (mimeType.includes('flac')) {
      return 16000; // FLAC typically uses lower sample rates
    }
    if (mimeType.includes('mp3')) {
      return 16000;
    }
    return 48000; // Default for web recordings
  }

  /**
   * Convert Google Cloud time to milliseconds
   */
  private convertTime(time?: { seconds?: number; nanos?: number }): number {
    if (!time) return 0;
    return (time.seconds || 0) * 1000 + (time.nanos || 0) / 1_000_000;
  }

  /**
   * Get speech contexts based on context type
   */
  private getSpeechContexts(context: SpeechContext): Array<{ phrases: string[]; boost: number }> {
    if (context === 'medical') {
      return [
        {
          phrases: MEDICAL_PHRASES_PT,
          boost: 2.0, // Boost recognition of medical terms
        },
      ];
    }
    return [];
  }

  /**
   * Transcribe audio data
   */
  async transcribeAudio(
    audioData: Buffer | string,
    mimeType: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const {
      languageCode = 'pt-BR',
      enableAutomaticPunctuation = true,
      enableWordTimeOffsets = true,
      profanityFilter = false,
      speechContexts = [],
      maxAlternatives = 1,
    } = options;

    try {
      logger.info('Starting transcription', {
        mimeType,
        languageCode,
        audioLength: typeof audioData === 'string' ? audioData.length : audioData.length,
      });

      const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
        config: {
          encoding: this.getEncodingFromMimeType(mimeType),
          sampleRateHertz: this.getSampleRate(mimeType),
          languageCode,
          enableAutomaticPunctuation,
          enableWordTimeOffsets,
          profanityFilter,
          speechContexts,
          maxAlternatives,
          model: 'medical_dictation', // Use medical dictation model for better accuracy
        },
        audio: {
          content: typeof audioData === 'string' ? audioData : audioData.toString('base64'),
        },
      };

      const [response] = await this.client.recognize(request);

      if (!response.results || response.results.length === 0) {
        throw new Error('No transcription results returned');
      }

      const result = response.results[0];
      const alternatives = result.alternatives || [];

      if (alternatives.length === 0) {
        throw new Error('No transcription alternatives returned');
      }

      const best = alternatives[0];
      if (!best.transcript) {
        throw new Error('Empty transcription returned');
      }

      // Build response
      const transcriptionResult: TranscriptionResult = {
        transcription: best.transcript,
        confidence: best.confidence || 0,
        languageCode,
        alternatives: alternatives.slice(1).map((alt) => ({
          transcription: alt.transcript || '',
          confidence: alt.confidence || 0,
        })),
      };

      // Add word-level timestamps if available
      if (best.words && best.words.length > 0) {
        transcriptionResult.words = best.words.map((word) => ({
          word: word.word || '',
          startTime: this.convertTime(word.startTime),
          endTime: this.convertTime(word.endTime),
          confidence: word.confidence || 0,
        }));
      }

      logger.info('Transcription completed', {
        length: transcriptionResult.transcription.length,
        confidence: transcriptionResult.confidence,
      });

      return transcriptionResult;
    } catch (error) {
      logger.error('Transcription failed:', error);
      throw new Error(`Speech-to-Text failed: ${(error as Error).message}`);
    }
  }

  /**
   * Transcribe with medical context (for physiotherapy consultations)
   */
  async transcribeWithMedicalContext(
    audioData: Buffer | string,
    mimeType: string,
    languageCode: string = 'pt-BR'
  ): Promise<TranscriptionResult> {
    return this.transcribeAudio(audioData, mimeType, {
      languageCode,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      profanityFilter: true,
      speechContexts: this.getSpeechContexts('medical'),
    });
  }

  /**
   * Transcribe a long audio file using async recognition
   */
  async transcribeLongAudio(
    audioUri: string,
    languageCode: string = 'pt-BR',
    context: SpeechContext = 'medical'
  ): Promise<TranscriptionResult> {
    try {
      logger.info('Starting long audio transcription', { audioUri });

      const request: protos.google.cloud.speech.v1.ILongRunningRecognizeRequest = {
        config: {
          encoding: 'FLAC',
          sampleRateHertz: 16000,
          languageCode,
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          speechContexts: this.getSpeechContexts(context),
        },
        audio: {
          uri: audioUri,
        },
      };

      const [operation] = await this.client.longRunningRecognize(request);

      // Wait for operation to complete
      const [response] = await operation.promise();

      if (!response.results || response.results.length === 0) {
        throw new Error('No transcription results returned');
      }

      // Combine all results
      const transcript = response.results
        .map((result) => result.alternatives?.[0]?.transcript || '')
        .join(' ');

      const confidence = response.results[0]?.alternatives?.[0]?.confidence || 0;

      return {
        transcription: transcript,
        confidence,
        languageCode,
      };
    } catch (error) {
      logger.error('Long audio transcription failed:', error);
      throw new Error(`Long audio transcription failed: ${(error as Error).message}`);
    }
  }

  /**
   * Stream audio for real-time transcription
   */
  async *streamTranscription(
    audioStream: AsyncIterable<Buffer>,
    mimeType: string,
    languageCode: string = 'pt-BR'
  ): AsyncGenerator<string> {
    logger.info('Starting streaming transcription');

    const request = {
      config: {
        encoding: this.getEncodingFromMimeType(mimeType) as any,
        sampleRateHertz: this.getSampleRate(mimeType),
        languageCode,
        enableAutomaticPunctuation: true,
        interimResults: true,
      },
    };

    // Note: Streaming requires a different client setup
    // This is a placeholder for future implementation
    yield '';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let sttClient: SpeechToTextClient | null = null;

/**
 * Get or create Speech-to-Text client (singleton)
 */
export function getSpeechToTextClient(): SpeechToTextClient {
  if (!sttClient) {
    sttClient = new SpeechToTextClient();
  }
  return sttClient;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transcribe consultation audio (with medical context)
 */
export async function transcribeConsultationAudio(
  audioData: string,
  mimeType: string
): Promise<string> {
  if (!SPEECH_ENABLED) {
    logger.warn('Cloud Speech-to-Text disabled');
    throw new Error('Cloud Speech-to-Text is disabled');
  }

  const client = getSpeechToTextClient();
  const result = await client.transcribeWithMedicalContext(audioData, mimeType);
  return result.transcription;
}

/**
 * Transcribe with options
 */
export async function transcribeAudio(
  audioData: string,
  mimeType: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  if (!SPEECH_ENABLED) {
    logger.warn('Cloud Speech-to-Text disabled');
    throw new Error('Cloud Speech-to-Text is disabled');
  }

  const client = getSpeechToTextClient();
  return client.transcribeAudio(audioData, mimeType, options);
}

/**
 * Check if Cloud Speech-to-Text is enabled
 */
export function isSpeechToTextEnabled(): boolean {
  return SPEECH_ENABLED;
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
