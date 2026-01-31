/**
 * Firebase AI Live API Configuration
 *
 * Types and configuration for real-time audio/video AI sessions.
 * Local stub definitions to replace @fisioflow/shared-api/firebase/ai/live-config
 */

/**
 * Live session configuration
 */
export interface LiveSessionConfig {
  /** Session ID */
  sessionId: string;

  /** Model to use */
  model: string;

  /** Language code */
  language: string;

  /** System instruction */
  systemInstruction?: string;

  /** Audio configuration */
  audio: {
    /** Input sample rate in Hz */
    inputSampleRate: number;

    /** Output sample rate in Hz */
    outputSampleRate: number;

    /** Number of audio channels */
    channels: number;
  };

  /** Video configuration (optional) */
  video?: {
    /** Enable video */
    enabled: boolean;

    /** Video width */
    width: number;

    /** Video height */
    height: number;

    /** Frame rate for video capture */
    frameRate: number;
  };
}

/**
 * Live session state
 */
export interface LiveSessionState {
  /** Is session active */
  isActive: boolean;

  /** Is AI speaking */
  isSpeaking: boolean;

  /** Is listening for audio */
  isListening: boolean;

  /** Has error occurred */
  hasError: boolean;

  /** Error message */
  errorMessage?: string;

  /** Session start time */
  startTime?: number;

  /** Session duration */
  duration?: number;
}

/**
 * Live session callbacks
 */
export interface LiveSessionCallbacks {
  /** Audio received callback */
  onAudioReceived?: (audio: ArrayBuffer) => void;

  /** Transcript received callback */
  onTranscript: (text: string, isFinal: boolean) => void;

  /** Session started callback */
  onSessionStart: () => void;

  /** Session ended callback */
  onSessionEnd: () => void;

  /** Error callback */
  onError: (error: Error) => void;

  /** Speaking started callback */
  onSpeakingStart?: () => void;

  /** Speaking ended callback */
  onSpeakingEnd?: () => void;

  /** Listening started callback */
  onListeningStart?: () => void;

  /** Listening ended callback */
  onListeningEnd?: () => void;

  /** Generic event callback */
  onEvent?: (event: LiveAPIEvent) => void;
}

/**
 * Audio chunk data
 */
export interface AudioChunk {
  /** PCM audio data */
  data: ArrayBuffer;

  /** Sample rate in Hz */
  sampleRate: number;

  /** Number of channels */
  channels: number;

  /** Timestamp */
  timestamp: number;
}

/**
 * Video frame data
 */
export interface VideoFrame {
  /** Base64 encoded image data */
  data: string;

  /** Frame width */
  width: number;

  /** Frame height */
  height: number;

  /** Timestamp */
  timestamp: number;

  /** Frame number */
  frameNumber: number;
}

/**
 * Live API event
 */
export interface LiveAPIEvent {
  /** Event type */
  type: string;

  /** Event data */
  [key: string]: unknown;
}

/**
 * Default voice assistant configuration
 */
export const DEFAULT_VOICE_ASSISTANT_CONFIG: LiveSessionConfig = {
  sessionId: '',
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  language: 'pt-BR',
  systemInstruction: `Você é um assistente de voz para fisioterapeutas e pacientes.

DIRETRIZES:
- Fale em português brasileiro claro e simpático
- Não faça diagnósticos médicos definitivos
- Sugira exercícios apenas dentro do contexto de fisioterapia
- Em caso de sintomas graves, recomende atendimento médico imediato
- Mantenha respostas concisas (máximo 2-3 frases)`,
  audio: {
    inputSampleRate: 16000,
    outputSampleRate: 24000,
    channels: 1,
  },
};

/**
 * Default exercise coach configuration
 */
export const DEFAULT_EXERCISE_COACH_CONFIG: LiveSessionConfig = {
  sessionId: '',
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  language: 'pt-BR',
  systemInstruction: `Você é um treinador de exercícios de fisioterapia.

DIRETRIZES:
- Conte as repetições em voz alta
- Forneça feedback sobre a forma do exercício
- Dê encorajamento ao paciente
- Fale em português brasileiro
- Mantenha instruções curtas e claras`,
  audio: {
    inputSampleRate: 16000,
    outputSampleRate: 24000,
    channels: 1,
  },
  video: {
    enabled: true,
    width: 640,
    height: 480,
    frameRate: 1,
  },
};

/**
 * Generate a unique session ID
 */
export function generateSessionId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a Live API event
 */
export function createLiveAPIEvent(type: string, data: Record<string, unknown>): LiveAPIEvent {
  return {
    type,
    ...data,
  };
}

/**
 * Convert audio chunk to base64
 */
export function audioChunkToBase64(chunk: AudioChunk): string {
  const uint8Array = new Uint8Array(chunk.data);
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to audio chunk
 */
export function base64ToAudioChunk(
  base64: string,
  sampleRate: number,
  channels: number
): AudioChunk {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return {
    data: bytes.buffer,
    sampleRate,
    channels,
    timestamp: Date.now(),
  };
}

/**
 * Format session duration
 */
export function formatSessionDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
