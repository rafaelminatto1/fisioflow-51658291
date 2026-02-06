/**
 * Cloud Translation API Endpoint
 *
 * HTTP endpoint for text translation
 * Free tier: 500,000 characters/month
 *
 * @route api/translation
 * @method onRequest
 */

import { onRequest, HttpsError } from 'firebase-functions/v2/https';

  getTranslationClient,
  detectLanguage as detectLang,
} from '../lib/translation';
import { logger } from '../lib/logger';
import { CORS_ORIGINS } from '../init';

// ============================================================================
// TYPES
// ============================================================================

interface TranslationRequest {
  text: string | string[];
  targetLanguage: string;
  sourceLanguage?: string;
  format?: 'text' | 'html';
  model?: 'base' | 'nmt';
}

interface DetectLanguageRequest {
  text: string;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export const translateHandler = async (req: any, res: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body as TranslationRequest;

    // Validate request
    if (!body.text) {
      throw new HttpsError('invalid-argument', 'text is required');
    }
    if (!body.targetLanguage) {
      throw new HttpsError('invalid-argument', 'targetLanguage is required');
    }

    const client = getTranslationClient();

    // Calculate character count for logging
    const textArray = Array.isArray(body.text) ? body.text : [body.text];
    const charCount = textArray.join('').length;

    logger.info('Starting translation', {
      textCount: textArray.length,
      charCount,
      targetLanguage: body.targetLanguage,
      sourceLanguage: body.sourceLanguage,
    });

    // Translate
    const result = await client.translate(body.text, body.targetLanguage, {
      format: body.format || 'text',
      model: body.model || 'nmt',
    });

    // Build response
    if (Array.isArray(body.text)) {
      const translations = (result as Array<{ translation: string; detectedLanguageCode?: string }>).map(
        (r) => ({
          translation: r.translation,
          detectedLanguageCode: r.detectedLanguageCode,
        })
      );

      res.set('Access-Control-Allow-Origin', '*');
      res.set('Content-Type', 'application/json');
      res.json({
        translations,
        charCount,
        targetLanguage: body.targetLanguage,
      });
    } else {
      const singleResult = result as { translation: string; detectedLanguageCode?: string };

      res.set('Access-Control-Allow-Origin', '*');
      res.set('Content-Type', 'application/json');
      res.json({
        translation: singleResult.translation,
        detectedLanguageCode: singleResult.detectedLanguageCode,
        charCount,
        targetLanguage: body.targetLanguage,
      });
    }

    logger.info('Translation completed', {
      charCount,
      targetLanguage: body.targetLanguage,
    });
  } catch (error: any) {
    logger.error('Translation failed:', error);

    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'TRANSLATION_FAILED',
    });
  }
};

export const translate = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 10,
    cors: CORS_ORIGINS,
    invoker: 'public',
  },
  translateHandler
);

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

export const detectLanguageHandler = async (req: any, res: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body as DetectLanguageRequest;

    if (!body.text) {
      throw new HttpsError('invalid-argument', 'text is required');
    }

    logger.info('Detecting language', {
      textLength: body.text.length,
    });

    const result = await detectLang(body.text);

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.json({
      languageCode: result.languageCode,
      confidence: result.confidence,
    });
  } catch (error: any) {
    logger.error('Language detection failed:', error);

    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'LANGUAGE_DETECTION_FAILED',
    });
  }
};

export const detectLanguage = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 10,
    cors: CORS_ORIGINS,
    invoker: 'public',
  },
  detectLanguageHandler
);

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

export const getSupportedLanguagesHandler = async (req: any, res: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const displayLanguage = (req.query.display as string) || 'pt';

    logger.info('Getting supported languages', { displayLanguage });

    const client = getTranslationClient();
    const languages = await client.getSupportedLanguages(displayLanguage);

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.json({
      languages: languages.map((lang) => ({
        code: lang.languageCode,
        name: lang.displayName,
        supportSource: lang.supportSource,
        supportTarget: lang.supportTarget,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to get supported languages:', error);

    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'LANGUAGES_FAILED',
    });
  }
};

export const getSupportedLanguages = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 10,
    cors: CORS_ORIGINS,
    invoker: 'public',
  },
  getSupportedLanguagesHandler
);

// ============================================================================
// EXERCISE TRANSLATION
// ============================================================================

interface ExerciseTranslationRequest {
  exerciseName: string;
  instructions: string;
  targetLanguage: string;
}

export const translateExerciseHandler = async (req: any, res: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body as ExerciseTranslationRequest;

    if (!body.exerciseName || !body.instructions || !body.targetLanguage) {
      throw new HttpsError(
        'invalid-argument',
        'exerciseName, instructions, and targetLanguage are required'
      );
    }

    logger.info('Translating exercise', {
      exerciseName: body.exerciseName,
      targetLanguage: body.targetLanguage,
    });

    const client = getTranslationClient();

    const [translatedName, translatedInstructions] = await Promise.all([
      client.translate(body.exerciseName, body.targetLanguage, { model: 'nmt' }),
      client.translate(body.instructions, body.targetLanguage, { model: 'nmt' }),
    ]);

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.json({
      exerciseName: (translatedName as { translation: string }).translation,
      instructions: (translatedInstructions as { translation: string }).translation,
      targetLanguage: body.targetLanguage,
    });
  } catch (error: any) {
    logger.error('Exercise translation failed:', error);

    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'EXERCISE_TRANSLATION_FAILED',
    });
  }
};

export const translateExercise = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 10,
    cors: CORS_ORIGINS,
    invoker: 'public',
  },
  translateExerciseHandler
);
