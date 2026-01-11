/**
 * Vercel Function for AI Transcription
 * Using Node.js runtime for better performance and OpenAI compatibility
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface TranscribeRequest {
  audioUrl: string;
  language?: string;
}

interface TranscribeResponse {
  transcription: string;
  language: string;
  duration?: number;
  confidence?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { audioUrl, language = 'pt-BR' }: TranscribeRequest = await req.json();

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'audioUrl is required' },
        { status: 400 }
      );
    }

    // Download audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio file');
    }

    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type });

    // Call OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', language);

    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data: TranscribeResponse = await openaiResponse.json();

    return NextResponse.json({
      transcription: data.transcription,
      language: data.language,
      duration: data.duration,
      confidence: data.confidence,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      {
        error: 'Transcription failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
