/**
 * Cloud Translation API Integration
 *
 * Provides multi-language support for international expansion
 * Free tier: 500,000 characters/month
 *
 * @module lib/translation
 */

import { TranslationServiceClient, protos } from '@google-cloud/translate';
import { getLogger } from './logger';

type ITranslateTextRequest = protos.google.cloud.translation.v3.ITranslateTextRequest;
type IDetectLanguageRequest = protos.google.cloud.translation.v3.IDetectLanguageRequest;
type IGetSupportedLanguagesRequest = protos.google.cloud.translation.v3.IGetSupportedLanguagesRequest;
type ITranslateDocumentRequest = protos.google.cloud.translation.v3.ITranslateDocumentRequest;

const logger = getLogger('translation');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
const LOCATION = 'global'; // Use global for v2 API
const TRANSLATION_ENABLED = process.env.CLOUD_TRANSLATION_ENABLED !== 'false';

// Medical glossary for better translation accuracy
const MEDICAL_TERNS = {
  'fisioterapia': {
    en: 'physiotherapy',
    es: 'fisioterapia',
  },
  'terapeuta': {
    en: 'therapist',
    es: 'terapeuta',
  },
  'paciente': {
    en: 'patient',
    es: 'paciente',
  },
  'exercício': {
    en: 'exercise',
    es: 'ejercicio',
  },
  'tratamento': {
    en: 'treatment',
    es: 'tratamiento',
  },
  'sessão': {
    en: 'session',
    es: 'sesión',
  },
  'avaliação': {
    en: 'assessment',
    es: 'evaluación',
  },
  'evolução': {
    en: 'evolution',
    es: 'evolución',
  },
  'dor': {
    en: 'pain',
    es: 'dolor',
  },
  'edema': {
    en: 'edema',
    es: 'edema',
  },
  // Add more terms as needed
};

// ============================================================================
// TYPES
// ============================================================================

export interface TranslationOptions {
  format?: 'text' | 'html';
  model?: 'base' | 'nmt';
  mimeType?: string;
}

export interface TranslationResult {
  translation: string;
  detectedLanguageCode?: string;
  confidence?: number;
}

export interface DetectedLanguage {
  languageCode: string;
  confidence: number;
}

// ============================================================================
// TRANSLATION CLIENT CLASS
// ============================================================================

/**
 * Cloud Translation API Client (v3)
 */
export class TranslationClient {
  private client: TranslationServiceClient;

  constructor() {
    this.client = new TranslationServiceClient({
      projectId: PROJECT_ID,
    });
    logger.info('Translation client initialized');
  }

  /**
   * Translate text or array of texts
   */
  async translate(
    text: string | string[],
    targetLanguage: string,
    options: TranslationOptions = {}
  ): Promise<TranslationResult | TranslationResult[]> {
    const { model = 'nmt', mimeType = 'text/plain' } = options;

    try {
      const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;
      const texts = Array.isArray(text) ? text : [text];

      logger.info('Translating text', {
        textCount: texts.length,
        targetLanguage,
        totalChars: texts.join('').length,
      });

      const request: ITranslateTextRequest = {
        parent,
        contents: texts,
        mimeType,
        targetLanguageCode: targetLanguage,
        model: model === 'nmt'
          ? `projects/${PROJECT_ID}/locations/${LOCATION}/models/general/nmt`
          : undefined,
      };

      const [response] = await this.client.translateText(request);

      if (!response.translations || response.translations.length === 0) {
        throw new Error('No translations returned');
      }

      // Process results
      if (Array.isArray(text)) {
        return response.translations.map((t: { translatedText?: string | null; detectedLanguageCode?: string | null }) => ({
          translation: t.translatedText || '',
          detectedLanguageCode: t.detectedLanguageCode || undefined,
        }));
      }

      const translation = response.translations[0];
      return {
        translation: translation.translatedText || '',
        detectedLanguageCode: translation.detectedLanguageCode || undefined,
      };
    } catch (error) {
      logger.error('Translation failed:', error);
      throw new Error(`Translation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Translate with glossary (for better medical term accuracy)
   */
  async translateWithGlossary(
    text: string,
    targetLanguage: string,
    glossaryId: string
  ): Promise<TranslationResult> {
    try {
      const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

      logger.info('Translating with glossary', {
        targetLanguage,
        glossaryId,
      });

      const request: ITranslateTextRequest = {
        parent,
        contents: [text],
        mimeType: 'text/plain',
        targetLanguageCode: targetLanguage,
        glossaryConfig: {
          glossary: `projects/${PROJECT_ID}/locations/${LOCATION}/glossaries/${glossaryId}`,
        },
      };

      const [response] = await this.client.translateText(request);

      const translation = response.translations?.[0];
      if (!translation) {
        throw new Error('No translation returned');
      }

      return {
        translation: translation.translatedText || '',
        detectedLanguageCode: translation.detectedLanguageCode || undefined,
      };
    } catch (error) {
      logger.error('Translation with glossary failed:', error);
      throw new Error(`Translation with glossary failed: ${(error as Error).message}`);
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<DetectedLanguage> {
    try {
      const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

      const request: IDetectLanguageRequest = {
        parent,
        content: text,
      };

      const [response] = await this.client.detectLanguage(request);

      const detection = response.languages?.[0];
      if (!detection) {
        throw new Error('No language detected');
      }

      return {
        languageCode: detection.languageCode || 'und',
        confidence: detection.confidence || 0,
      };
    } catch (error) {
      logger.error('Language detection failed:', error);
      throw new Error(`Language detection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(displayLanguageCode: string = 'pt'): Promise<
    Array<{
      languageCode: string;
      displayName: string;
      supportSource: boolean;
      supportTarget: boolean;
    }>
  > {
    try {
      const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

      const request: IGetSupportedLanguagesRequest = {
        parent,
        displayLanguageCode,
      };

      const [response] = await this.client.getSupportedLanguages(request);

      return (
        response.languages?.map((lang: { languageCode?: string | null; displayName?: string | null; supportSource?: boolean | null; supportTarget?: boolean | null }) => ({
          languageCode: lang.languageCode || '',
          displayName: lang.displayName || '',
          supportSource: lang.supportSource || false,
          supportTarget: lang.supportTarget || false,
        })) || []
      );
    } catch (error) {
      logger.error('Failed to get supported languages:', error);
      return [];
    }
  }

  /**
   * Translate document (for translating files)
   */
  async translateDocument(
    inputUri: string,
    outputUri: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<void> {
    try {
      const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

      logger.info('Translating document', {
        inputUri,
        outputUri,
        targetLanguage,
      });

      const request: ITranslateDocumentRequest = {
        parent,
        targetLanguageCode: targetLanguage,
        documentInputConfig: {
          gcsSource: {
            inputUri,
          },
        },
        documentOutputConfig: {
          gcsDestination: {
            outputUriPrefix: outputUri,
          },
        },
        sourceLanguageCode: sourceLanguage,
      };

      await this.client.translateDocument(request);

      logger.info('Document translation completed');
    } catch (error) {
      logger.error('Document translation failed:', error);
      throw new Error(`Document translation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Batch translate (for multiple texts)
   */
  async batchTranslate(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string[]> {
    try {
      const results = await this.translate(texts, targetLanguage, {
        model: 'nmt',
      });

      return Array.isArray(results)
        ? results.map((r) => r.translation)
        : [results.translation];
    } catch (error) {
      logger.error('Batch translation failed:', error);
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let translationClient: TranslationClient | null = null;

/**
 * Get or create Translation client (singleton)
 */
export function getTranslationClient(): TranslationClient {
  if (!translationClient) {
    translationClient = new TranslationClient();
  }
  return translationClient;
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON TRANSLATIONS
// ============================================================================

/**
 * Translate to Portuguese
 */
export async function translateToPortuguese(
  text: string,
  sourceLanguage?: string
): Promise<string> {
  if (!TRANSLATION_ENABLED) {
    logger.warn('Cloud Translation disabled');
    return text;
  }

  const client = getTranslationClient();
  const result = await client.translate(text, 'pt-BR', { model: 'nmt' });
  return (result as TranslationResult).translation;
}

/**
 * Translate from Portuguese
 */
export async function translateFromPortuguese(
  text: string,
  targetLanguage: string
): Promise<string> {
  if (!TRANSLATION_ENABLED) {
    logger.warn('Cloud Translation disabled');
    return text;
  }

  const client = getTranslationClient();
  const result = await client.translate(text, targetLanguage, { model: 'nmt' });
  return (result as TranslationResult).translation;
}

/**
 * Translate medical text (with glossary if available)
 */
export async function translateMedicalText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'pt'
): Promise<string> {
  if (!TRANSLATION_ENABLED) {
    logger.warn('Cloud Translation disabled');
    return text;
  }

  const client = getTranslationClient();

  // Try to use glossary first
  const glossaryId = `medical-${sourceLanguage}-${targetLanguage}`;
  try {
    const result = await client.translateWithGlossary(text, targetLanguage, glossaryId);
    return result.translation;
  } catch {
    // Fallback to regular translation if glossary not found
    logger.debug(`Glossary ${glossaryId} not found, using regular translation`);
    const result = await client.translate(text, targetLanguage, { model: 'nmt' });
    return (result as TranslationResult).translation;
  }
}

/**
 * Detect language of text
 */
export async function detectLanguage(text: string): Promise<{
  languageCode: string;
  confidence: number;
}> {
  if (!TRANSLATION_ENABLED) {
    logger.warn('Cloud Translation disabled');
    return { languageCode: 'und', confidence: 0 };
  }

  const client = getTranslationClient();
  return client.detectLanguage(text);
}

/**
 * Check if Cloud Translation is enabled
 */
export function isTranslationEnabled(): boolean {
  return TRANSLATION_ENABLED;
}

/**
 * Get supported languages
 */
export async function getSupportedLanguages(): Promise<
  Array<{
    languageCode: string;
    displayName: string;
  }>
> {
  if (!TRANSLATION_ENABLED) {
    return [
      { languageCode: 'pt-BR', displayName: 'Português (Brasil)' },
      { languageCode: 'en-US', displayName: 'English (US)' },
      { languageCode: 'es-ES', displayName: 'Español' },
    ];
  }

  const client = getTranslationClient();
  const languages = await client.getSupportedLanguages('pt');
  return languages.map((lang) => ({
    languageCode: lang.languageCode,
    displayName: lang.displayName,
  }));
}

/**
 * Translate exercise instructions
 */
export async function translateExercise(
  exerciseName: string,
  instructions: string,
  targetLanguage: string
): Promise<{
  translatedName: string;
  translatedInstructions: string;
}> {
  const client = getTranslationClient();

  const [translatedName, translatedInstructions] = await Promise.all([
    client.translate(exerciseName, targetLanguage),
    client.translate(instructions, targetLanguage),
  ]);

  return {
    translatedName: (translatedName as TranslationResult).translation,
    translatedInstructions: (translatedInstructions as TranslationResult).translation,
  };
}

/**
 * Get medical term translation
 */
export function getMedicalTermTranslation(
  term: string,
  targetLanguage: string
): string | undefined {
  const key = term.toLowerCase();
  const lang = targetLanguage.split('-')[0];
  const entry = (MEDICAL_TERNS as Record<string, { en: string; es: string }>)[key];
  return entry?.[lang as 'en' | 'es'];
}
