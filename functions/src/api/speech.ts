/**
 * Cloud Speech-to-Text API Endpoint
 *
 * HTTP endpoint for speech transcription
 * Free tier: 60 minutes/month
 *
 * @route api/speech
 * @method onRequest
 */

import { onRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { getSpeechToTextClient } from '../lib/speech-to-text';
import { logger } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface TranscriptionRequest {
  audioData: string;
  mimeType: string;
  languageCode?: string;
  context?: 'medical' | 'general' | 'technical';
  includeAlternatives?: boolean;
  includeWordOffsets?: boolean;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export const transcribeAudioHandler = async (req: any, res: any) => {
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
    const body = req.body as TranscriptionRequest;

    // Validate request
    if (!body.audioData) {
      throw new HttpsError('invalid-argument', 'audioData is required');
    }
    if (!body.mimeType) {
      throw new HttpsError('invalid-argument', 'mimeType is required');
    }

    const languageCode = body.languageCode || 'pt-BR';
    const context = body.context || 'medical';

    logger.info('Starting transcription', {
      mimeType: body.mimeType,
      languageCode,
      context,
      audioLength: body.audioData.length,
    });

    const client = getSpeechToTextClient();

    // Transcribe with appropriate context
    let result;
    if (context === 'medical') {
      result = await client.transcribeWithMedicalContext(
        body.audioData,
        body.mimeType,
        languageCode
      );
    } else {
      result = await client.transcribeAudio(body.audioData, body.mimeType, {
        languageCode,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: body.includeWordOffsets || false,
        profanityFilter: true,
      });
    }

    // Build response
    const response: {
      transcription: string;
      confidence: number;
      languageCode: string;
      alternatives?: Array<{ transcription: string; confidence: number }>;
      words?: Array<{ word: string; startTime: number; endTime: number; confidence: number }>;
    } = {
      transcription: result.transcription,
      confidence: result.confidence,
      languageCode: result.languageCode,
    };

    // Include alternatives if requested
    if (body.includeAlternatives && result.alternatives) {
      response.alternatives = result.alternatives;
    }

    // Include word offsets if requested and available
    if (body.includeWordOffsets && result.words) {
      response.words = result.words;
    }

    logger.info('Transcription completed', {
      transcriptionLength: result.transcription.length,
      confidence: result.confidence,
    });

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.json(response);
  } catch (error: any) {
    logger.error('Transcription failed:', error);

    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'TRANSCRIPTION_FAILED',
    });
  }
};

export const transcribeAudio = onRequest(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 10,
    cors: true,
  },
  transcribeAudioHandler
);

// ============================================================================
// LONG AUDIO TRANSCRIPTION
// ============================================================================

interface LongAudioRequest {
  audioUri: string;
  languageCode?: string;
  context?: 'medical' | 'general';
}

export const transcribeLongAudioHandler = async (req: any, res: any) => {
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
    const body = req.body as LongAudioRequest;

    if (!body.audioUri) {
      throw new HttpsError('invalid-argument', 'audioUri is required');
    }

    const languageCode = body.languageCode || 'pt-BR';
    const context = body.context || 'medical';

    logger.info('Starting long audio transcription', {
      audioUri: body.audioUri,
      languageCode,
      context,
    });

    const client = getSpeechToTextClient();
    const result = await client.transcribeLongAudio(
      body.audioUri,
      languageCode,
      context
    );

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.json({
      transcription: result.transcription,
      confidence: result.confidence,
      languageCode: result.languageCode,
    });
  } catch (error: any) {
    logger.error('Long audio transcription failed:', error);

    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'LONG_TRANSCRIPTION_FAILED',
    });
  }
};

export const transcribeLongAudio = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 5,
    cors: true,
  },
  transcribeLongAudioHandler
);
