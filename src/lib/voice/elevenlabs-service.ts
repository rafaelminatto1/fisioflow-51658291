/**
 * ElevenLabs Voice Service for FisioFlow
 *
 * Generates high-quality text-to-speech audio for exercise instructions
 * in Portuguese using ElevenLabs API.
 *
 * Features:
 * - Portuguese voice synthesis
 * - Exercise instructions narration
 * - Patient education audio
 * - Voice cloning for custom branded voices
 *
 * @see https://elevenlabs.io/docs
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: 'generated' | 'cloned' | 'premade';
  description?: string;
  labels?: Record<string, string>;
}

export interface TTSOptions {
  voiceId?: string;
  model?: 'eleven_multilingual_v2' | 'eleven_turbo_v2';
  stability?: number; // 0-1, higher = more stable
  similarityBoost?: number; // 0-1, higher = more similar to original voice
  style?: number; // 0-1, exaggerate voice style
  useSpeakerBoost?: boolean;
}

export interface AudioGenerationResult {
  success: boolean;
  audioUrl?: string;
  audioBlob?: Blob;
  duration?: number;
  size?: number;
  error?: string;
}

export interface VoiceInstructionOptions extends TTSOptions {
  exerciseName: string;
  instructions: string;
  includeCount?: boolean;
  includeRest?: boolean;
  tempo?: 'slow' | 'normal' | 'fast';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Portuguese voices available on ElevenLabs
const PORTUGUESE_VOICES: Record<string, string> = {
  // Brazilian Portuguese - Female
  'marcela': 'NhTgj9YQTV8TfbE4XEU',  // Marcela - warm, friendly
  'marcia': 'PqDHcBB9WQKyRqRdHCj',  // Marcia - professional

  // Brazilian Portuguese - Male
  'carlos': 'OQx5BnUzQ6CJhKoJAYf',  // Carlos - clear, authoritative
  'antonio': 'wHoD4Vg7PAjXs3BXsVE', // Antonio - gentle, calm
};

// Default voices for different contexts
const DEFAULT_VOICES = {
  exerciseInstructions: 'marcela',  // Friendly female for exercises
  patientEducation: 'marcia',      // Professional for education
  maleAlternative: 'carlos',        // Male option
  calmAlternative: 'antonio',      // Calm voice
};

// ============================================================================
// ELEVENLABS SERVICE
// ============================================================================

class ElevenLabsServiceClass {
  private apiKey: string | null = null;

  constructor() {
    // Support multiple environment variable naming conventions
    // Client-side (Vite): VITE_ELEVENLABS_API_KEY
    // Server-side (Node): ELEVENLABS_API_KEY
    this.apiKey =
      import.meta.env.VITE_ELEVENLABS_API_KEY ||
      (typeof process !== 'undefined' && process.env?.ELEVENLABS_API_KEY) ||
      null;

    if (!this.apiKey && import.meta.env.DEV) {
      console.warn(
        '[ElevenLabs] API key not configured. ' +
        'Add VITE_ELEVENLABS_API_KEY to your .env file. ' +
        'Get your key at: https://elevenlabs.io/app/settings/api-keys'
      );
    }
  }

  /**
   * Set API key dynamically (useful for multi-tenant)
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Generate text-to-speech audio
   */
  async generateAudio(
    text: string,
    options: TTSOptions = {}
  ): Promise<AudioGenerationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'ElevenLabs API key not configured',
      };
    }

    const {
      voiceId = PORTUGUESE_VOICES[DEFAULT_VOICES.exerciseInstructions],
      model = 'eleven_multilingual_v2',
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0.0,
      useSpeakerBoost = true,
    } = options;

    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail?.message || 'Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Get audio duration
      const duration = await this.getAudioDuration(audioBlob);

      return {
        success: true,
        audioUrl,
        audioBlob,
        duration,
        size: audioBlob.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate exercise instruction audio
   */
  async generateExerciseInstructions(
    options: VoiceInstructionOptions
  ): Promise<AudioGenerationResult> {
    const {
      exerciseName,
      instructions,
      includeCount = true,
      includeRest = true,
      tempo = 'normal',
      ...ttsOptions
    } = options;

    // Build spoken instructions based on tempo
    const tempoInstructions = this.buildTempoInstructions(tempo);

    // Generate the spoken text
    const spokenText = this.buildExerciseSpokenText(
      exerciseName,
      instructions,
      includeCount,
      includeRest,
      tempoInstructions
    );

    return this.generateAudio(spokenText, {
      ...ttsOptions,
      voiceId: ttsOptions.voiceId || PORTUGUESE_VOICES[DEFAULT_VOICES.exerciseInstructions],
    });
  }

  /**
   * Generate patient education audio
   */
  async generatePatientEducation(
    title: string,
    content: string[],
    options: TTSOptions = {}
  ): Promise<AudioGenerationResult> {
    const spokenText = `${title}. ${content.join(' ')}`;

    return this.generateAudio(spokenText, {
      ...options,
      voiceId: options.voiceId || PORTUGUESE_VOICES[DEFAULT_VOICES.patientEducation],
    });
  }

  /**
   * Stream audio (for real-time playback)
   */
  async *streamAudio(
    text: string,
    options: TTSOptions = {}
  ): AsyncGenerator<Uint8Array> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const {
      voiceId = PORTUGUESE_VOICES[DEFAULT_VOICES.exerciseInstructions],
      model = 'eleven_multilingual_v2',
      stability = 0.5,
      similarityBoost = 0.75,
    } = options;

    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || 'Failed to stream audio');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    return data.voices;
  }

  /**
   * Check if ElevenLabs service is configured and healthy
   */
  async checkHealth(): Promise<{ configured: boolean; healthy: boolean; voicesAvailable?: number; error?: string }> {
    const configured = !!this.apiKey;

    if (!configured) {
      return {
        configured: false,
        healthy: false,
        error: 'API key not configured',
      };
    }

    try {
      const voices = await this.getVoices();
      return {
        configured: true,
        healthy: true,
        voicesAvailable: voices.length,
      };
    } catch (error) {
      return {
        configured: true,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get audio duration from blob
   */
  private async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(blob);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(audio.src);
        resolve(0);
      });
    });
  }

  /**
   * Build exercise spoken text with appropriate pacing
   */
  private buildExerciseSpokenText(
    exerciseName: string,
    instructions: string,
    includeCount: boolean,
    includeRest: boolean,
    tempoInstructions: string
  ): string {
    let text = `Vamos fazer ${exerciseName}. ${instructions}. `;

    if (tempoInstructions) {
      text += `${tempoInstructions} `;
    }

    if (includeCount) {
      text += `Faça 3 séries de 10 repetições. `;
    }

    if (includeRest) {
      text += `Descanse 30 segundos entre as séries.`;
    }

    return text;
  }

  /**
   * Build tempo-specific instructions
   */
  private buildTempoInstructions(tempo: 'slow' | 'normal' | 'fast'): string {
    switch (tempo) {
      case 'slow':
        return 'Mova-se devagar e com controle. Foque na forma correta.';
      case 'fast':
        return 'Mantenha um ritmo constante, mas não sacrifique a forma pela velocidade.';
      case 'normal':
      default:
        return '';
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const elevenlabsService = new ElevenLabsServiceClass();

// Convenience functions
export async function generateExerciseAudio(options: VoiceInstructionOptions) {
  return elevenlabsService.generateExerciseInstructions(options);
}

export async function generateEducationAudio(
  title: string,
  content: string[],
  options?: TTSOptions
) {
  return elevenlabsService.generatePatientEducation(title, content, options);
}

export async function streamExerciseAudio(
  text: string,
  options?: TTSOptions
) {
  return elevenlabsService.streamAudio(text, options);
}

/**
 * Check ElevenLabs service health
 * Useful for startup checks and admin dashboards
 */
export async function checkElevenLabsHealth() {
  return elevenlabsService.checkHealth();
}

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!(
    import.meta.env.VITE_ELEVENLABS_API_KEY ||
    (typeof process !== 'undefined' && process.env?.ELEVENLABS_API_KEY)
  );
}

// Re-export types
export type {
  ElevenLabsVoice,
  TTSOptions,
  AudioGenerationResult,
  VoiceInstructionOptions,
};

// Voice constants
export { PORTUGUESE_VOICES, DEFAULT_VOICES };
