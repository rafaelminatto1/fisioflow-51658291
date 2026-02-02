/**
 * Translation Service
 *
 * Client-side service for text translation using Cloud Functions
 *
 * @module lib/services/translation
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface TranslationOptions {
  text: string | string[];
  targetLanguage: string;
  sourceLanguage?: string;
  format?: 'text' | 'html';
  model?: 'base' | 'nmt';
}

export interface TranslationResult {
  translation: string;
  translations?: Array<{ translation: string }>;
  detectedLanguageCode?: string;
  charCount?: number;
}

export interface DetectLanguageResult {
  languageCode: string;
  confidence: number;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  supportSource: boolean;
  supportTarget: boolean;
}

// ============================================================================
// TRANSLATION SERVICE
// ============================================================================

class TranslationService {
  /**
   * Translate text
   */
  async translate(options: TranslationOptions): Promise<TranslationResult> {
    try {
      const translateFn = httpsCallable<TranslationOptions, TranslationResult>(
        functions,
        'translate'
      );

      const result = await translateFn(options);

      if (!result.data) {
        throw new Error('No translation result returned');
      }

      return result.data;
    } catch (error) {
      logger.error('Translation failed:', error);
      throw new Error(
        `Falha na tradução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Translate to Portuguese
   */
  async translateToPortuguese(
    text: string,
    sourceLanguage?: string
  ): Promise<string> {
    const result = await this.translate({
      text,
      targetLanguage: 'pt-BR',
      sourceLanguage,
      model: 'nmt',
    });

    return result.translation;
  }

  /**
   * Translate from Portuguese
   */
  async translateFromPortuguese(
    text: string,
    targetLanguage: string
  ): Promise<string> {
    const result = await this.translate({
      text,
      sourceLanguage: 'pt-BR',
      targetLanguage,
      model: 'nmt',
    });

    return result.translation;
  }

  /**
   * Detect language
   */
  async detectLanguage(text: string): Promise<DetectLanguageResult> {
    try {
      const detectFn = httpsCallable<{ text: string }, DetectLanguageResult>(
        functions,
        'detectLanguage'
      );

      const result = await detectFn({ text });

      if (!result.data) {
        throw new Error('No language detection result returned');
      }

      return result.data;
    } catch (error) {
      logger.error('Language detection failed:', error);
      throw new Error(
        `Falha na detecção de idioma: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(displayLanguage: string = 'pt'): Promise<SupportedLanguage[]> {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL ||
          'https://southamerica-east1-fisioflow-migration.cloudfunctions.net'
        }/getSupportedLanguages?display=${displayLanguage}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch supported languages');
      }

      const data = await response.json();
      return data.languages || [];
    } catch (error) {
      logger.error('Failed to get supported languages:', error);
      return [
        { code: 'pt-BR', name: 'Português (Brasil)', supportSource: true, supportTarget: true },
        { code: 'en-US', name: 'English (US)', supportSource: true, supportTarget: true },
        { code: 'es-ES', name: 'Español', supportSource: true, supportTarget: true },
      ];
    }
  }

  /**
   * Translate exercise
   */
  async translateExercise(
    exerciseName: string,
    instructions: string,
    targetLanguage: string
  ): Promise<{ exerciseName: string; instructions: string }> {
    try {
      const translateFn = httpsCallable<
        {
          exerciseName: string;
          instructions: string;
          targetLanguage: string;
        },
        { exerciseName: string; instructions: string }
      >(functions, 'translateExercise');

      const result = await translateFn({
        exerciseName,
        instructions,
        targetLanguage,
      });

      if (!result.data) {
        throw new Error('No exercise translation result returned');
      }

      return result.data;
    } catch (error) {
      logger.error('Exercise translation failed:', error);
      throw new Error(
        `Falha na tradução do exercício: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let translationServiceInstance: TranslationService | null = null;

export function getTranslationService(): TranslationService {
  if (!translationServiceInstance) {
    translationServiceInstance = new TranslationService();
  }
  return translationServiceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const translationService = getTranslationService();

// Convenience exports
export async function translate(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  return translationService.translateFromPortuguese(text, targetLanguage);
}

export async function detectLanguage(
  text: string
): Promise<DetectLanguageResult> {
  return translationService.detectLanguage(text);
}

export async function getSupportedLanguages(): Promise<SupportedLanguage[]> {
  return translationService.getSupportedLanguages();
}

export async function translateExercise(
  exerciseName: string,
  instructions: string,
  targetLanguage: string
): Promise<{ exerciseName: string; instructions: string }> {
  return translationService.translateExercise(exerciseName, instructions, targetLanguage);
}
