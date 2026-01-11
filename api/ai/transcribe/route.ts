/**
 * Vercel Function for AI Transcription
 * Using Node.js runtime for better performance and OpenAI compatibility
 */

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { audioUrl, language = 'pt-BR' }: TranscribeRequest = await req.json();

    if (!audioUrl) {
      return jsonResponse({ error: 'audioUrl is required' }, 400);
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

    return jsonResponse({
      transcription: data.transcription,
      language: data.language,
      duration: data.duration,
      confidence: data.confidence,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return jsonResponse(
      {
        error: 'Transcription failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
