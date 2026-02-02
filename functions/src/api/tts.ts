/**
 * Cloud Text-to-Speech API Endpoint
 *
 * HTTP endpoint for speech synthesis
 * Free tier: 4 million characters/month
 *
 * @route api/tts
 * @method onRequest
 */

import { onRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { getTextToSpeechClient } from '../lib/text-to-speech';
import { logger } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface TTSRequest {
  text: string;
  exerciseName?: string;
  instruction?: string;
  type?: 'accessibility' | 'exercise' | 'countdown' | 'encouragement';
  languageCode?: string;
  countFrom?: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export const synthesizeTTS = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 10,
    cors: true,
  },
  async (req, res) => {
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
      const body = req.body as TTSRequest;

      // Validate request
      if (!body.text && !body.exerciseName && !body.instruction) {
        throw new HttpsError('invalid-argument', 'text, exerciseName, or instruction is required');
      }

      const type = body.type || 'accessibility';
      const languageCode = body.languageCode || 'pt-BR';

      const client = getTextToSpeechClient();
      let audioBuffer: Buffer;

      switch (type) {
        case 'exercise':
          if (!body.exerciseName || !body.instruction) {
            throw new HttpsError('invalid-argument', 'exerciseName and instruction are required for exercise type');
          }
          audioBuffer = await client.synthesizeExerciseInstruction(
            body.exerciseName,
            body.instruction,
            languageCode
          );
          break;

        case 'countdown':
          audioBuffer = await client.synthesizeCountdown(body.countFrom || 3);
          break;

        case 'encouragement':
          audioBuffer = await client.synthesizeEncouragement(body.text, languageCode);
          break;

        case 'accessibility':
        default:
          if (!body.text) {
            throw new HttpsError('invalid-argument', 'text is required for accessibility type');
          }
          audioBuffer = await client.synthesizeAccessibility(body.text, languageCode);
          break;
      }

      // Set response headers
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Content-Type', 'audio/mpeg');
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.set('Content-Length', audioBuffer.length.toString());

      logger.info(`TTS synthesis completed`, {
        type,
        languageCode,
        audioLength: audioBuffer.length,
      });

      res.send(audioBuffer);
    } catch (error) {
      logger.error('TTS synthesis failed:', error);

      res.set('Access-Control-Allow-Origin', '*');
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TTS_SYNTHESIS_FAILED',
      });
    }
  }
);

