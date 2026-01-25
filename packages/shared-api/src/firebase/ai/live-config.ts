/**
 * Firebase AI Live API Configuration for FisioFlow Telemedicine
 *
 * Provides configuration and session management for Firebase AI Live API
 * using gemini-2.5-flash-native-audio-preview-12-2025 model.
 *
 * Features:
 * - Bidirectional audio streaming (16kHz input, 24kHz output)
 * - Video support (1 FPS for exercise coaching)
 * - Real-time voice assistant for telemedicine
 * - Exercise coaching with form analysis
 * - Portuguese language support
 *
 * @see https://firebase.google.com/docs/ai/realtime-audio
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Live API session configuration
 */
export interface LiveSessionConfig {
  /** API key for Firebase AI (optional if using Firebase app config) */
  apiKey?: string;

  /** Model ID to use */
  model: 'gemini-2.0-flash-exp' | 'gemini-2.5-flash-native-audio-preview-12-2025';

  /** Session identifier */
  sessionId: string;

  /** Language code (default: pt-BR for Portuguese) */
  language?: string;

  /** Audio configuration */
  audio: {
    /** Input sample rate in Hz (default: 16000) */
    inputSampleRate: number;

    /** Output sample rate in Hz (default: 24000) */
    outputSampleRate: number;

    /** Input audio format (default: raw PCM) */
    inputFormat: 'raw' | 'flac' | 'wav' | 'aac' | 'mp3' | 'webm';

    /** Output audio format (default: raw PCM) */
    outputFormat: 'raw' | 'flac' | 'wav' | 'aac' | 'mp3';
  };

  /** Video configuration (optional) */
  video?: {
    /** Video enabled */
    enabled: boolean;

    /** Frame rate in FPS (recommended: 1 for Live API) */
    frameRate: number;

    /** Video width (recommended: 768) */
    width: number;

    /** Video height (recommended: 768) */
    height: number;

    /** Video format */
    format: 'rgb' | 'rgba' | 'jpeg';
  };

  /** System instructions/context */
  systemInstruction?: string;

  /** Enable transcription logging */
  enableTranscription?: boolean;

  /** Session timeout in milliseconds (default: 5 minutes) */
  sessionTimeout?: number;
}

/**
 * Live API session state
 */
export interface LiveSessionState {
  /** Session is active */
  isActive: boolean;

  /** Currently speaking */
  isSpeaking: boolean;

  /** Currently listening */
  isListening: boolean;

  /** Error state */
  hasError: boolean;

  /** Last error message */
  errorMessage?: string;

  /** Session start time */
  startTime?: number;

  /** Session duration in milliseconds */
  duration?: number;
}

/**
 * Audio chunk from Live API
 */
export interface AudioChunk {
  /** Audio data as base64 or ArrayBuffer */
  data: string | ArrayBuffer;

  /** Sample rate */
  sampleRate: number;

  /** Number of channels */
  channels: number;

  /** Timestamp */
  timestamp: number;
}

/**
 * Video frame for exercise coaching
 */
export interface VideoFrame {
  /** Image data as base64 or ArrayBuffer */
  data: string | ArrayBuffer;

  /** Frame width */
  width: number;

  /** Frame height */
  height: number;

  /** Frame timestamp */
  timestamp: number;

  /** Frame number */
  frameNumber: number;
}

/**
 * Live API event types
 */
export type LiveAPIEventType =
  | 'session_started'
  | 'session_ended'
  | 'audio_started'
  | 'audio_ended'
  | 'transcript'
  | 'response'
  | 'error'
  | 'warning'
  | 'video_frame';

/**
 * Live API event
 */
export interface LiveAPIEvent {
  type: LiveAPIEventType;

  /** Event data */
  data?: unknown;

  /** Transcript text (for transcript events) */
  text?: string;

  /** Is final transcript */
  isFinal?: boolean;

  /** Error message (for error events) */
  error?: string;

  /** Warning message (for warning events) */
  warning?: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * Live API session callbacks
 */
export interface LiveSessionCallbacks {
  /** Called when audio is received from AI */
  onAudioReceived: (audio: AudioChunk) => void;

  /** Called when transcript is received */
  onTranscript: (text: string, isFinal: boolean) => void;

  /** Called when session starts */
  onSessionStart: () => void;

  /** Called when session ends */
  onSessionEnd: () => void;

  /** Called when an error occurs */
  onError: (error: Error) => void;

  /** Called when AI starts speaking */
  onSpeakingStart: () => void;

  /** Called when AI stops speaking */
  onSpeakingEnd: () => void;

  /** Called when user starts speaking */
  onListeningStart: () => void;

  /** Called when user stops speaking */
  onListeningEnd: () => void;

  /** Called for custom events */
  onEvent?: (event: LiveAPIEvent) => void;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default voice assistant configuration for telemedicine
 */
export const DEFAULT_VOICE_ASSISTANT_CONFIG: Partial<LiveSessionConfig> = {
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  language: 'pt-BR',
  audio: {
    inputSampleRate: 16000,
    outputSampleRate: 24000,
    inputFormat: 'raw',
    outputFormat: 'raw',
  },
  sessionTimeout: 5 * 60 * 1000, // 5 minutes
  enableTranscription: true,
  systemInstruction: `You are FisioFlow, a professional voice assistant for physical therapy telemedicine.

CONTEXT:
- You are helping during a telemedicine session between a patient and a physical therapist
- Your role is to facilitate communication and provide basic guidance
- You NEVER provide medical diagnoses - leave that to the professional therapist
- You speak Portuguese naturally and clearly

GUIDELINES:
1. Be friendly and professional
2. Help patients describe their symptoms clearly
3. Suggest basic exercises only when appropriate and clearly approved
4. Remind patients about proper breathing during exercises
5. Document key points for the therapist
6. If you're unsure about something, recommend consulting the therapist
7. Keep responses concise and clear
8. Use simple language patients can understand

SAFETY:
- Never suggest exercises that could be harmful
- Always remind patients to stop if they feel pain
- Document any pain mentions for the therapist
- In emergencies, direct patients to seek immediate help

Remember: You are an assistant, not a replacement for professional medical care.`,
};

/**
 * Default exercise coach configuration
 */
export const DEFAULT_EXERCISE_COACH_CONFIG: Partial<LiveSessionConfig> = {
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  language: 'pt-BR',
  audio: {
    inputSampleRate: 16000,
    outputSampleRate: 24000,
    inputFormat: 'raw',
    outputFormat: 'raw',
  },
  video: {
    enabled: true,
    frameRate: 1, // 1 FPS as recommended for Live API
    width: 768,
    height: 768,
    format: 'rgb',
  },
  sessionTimeout: 10 * 60 * 1000, // 10 minutes for exercise sessions
  enableTranscription: true,
  systemInstruction: `You are FisioFlow Exercise Coach, an AI assistant that helps patients perform physical therapy exercises correctly.

YOUR ROLE:
- Guide patients through their exercises step by step
- Count repetitions aloud as they perform them
- Correct form issues in real-time using video analysis
- Encourage proper breathing patterns
- Modify exercises if the patient is struggling

EXERCISE GUIDANCE:
1. Explain the exercise clearly before starting
2. Count each repetition aloud ("Um... dois... três...")
3. Provide form corrections: "Mantenha as costas retas", "Não deixe o joelho valgizar"
4. Encourage breathing: "Inspire ao descer, expire ao subir"
5. If form is poor, suggest modifications: "Tente com menos amplitude"
6. Motivate the patient: "Muito bem!", "Continue assim!"

REP COUNTING:
- Count repetitions in Portuguese: "Um", "Dois", "Três", etc.
- Announce sets: "Primeira série", "Segunda série"
- Remind of target: "Faltam 5 repetições"

FORM CORRECTION:
- Watch for common mistakes using video input
- Correct immediately but gently
- Explain why the correction matters
- Praise when form improves

SAFETY FIRST:
- Stop immediately if patient reports pain
- Remind patient to work within comfortable range
- Suggest stopping if form deteriorates from fatigue
- Never push beyond safe limits

Remember: You are coaching, not diagnosing. Safety is the priority.`,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique session ID
 */
export function generateSessionId(prefix = 'live'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Validate audio configuration
 */
export function validateAudioConfig(config: LiveSessionConfig['audio']): boolean {
  if (!config) return false;

  const validSampleRates = [8000, 16000, 24000, 44100, 48000];
  const validFormats = ['raw', 'flac', 'wav', 'aac', 'mp3', 'webm'];

  return (
    validSampleRates.includes(config.inputSampleRate) &&
    validSampleRates.includes(config.outputSampleRate) &&
    validFormats.includes(config.inputFormat) &&
    validFormats.includes(config.outputFormat)
  );
}

/**
 * Validate video configuration
 */
export function validateVideoConfig(config: LiveSessionConfig['video']): boolean {
  if (!config || !config.enabled) return true;

  const validFormats = ['rgb', 'rgba', 'jpeg'];

  return (
    config.frameRate >= 0.5 &&
    config.frameRate <= 5 &&
    config.width > 0 &&
    config.height > 0 &&
    validFormats.includes(config.format)
  );
}

/**
 * Create a default Live API event
 */
export function createLiveAPIEvent(
  type: LiveAPIEventType,
  data?: unknown
): LiveAPIEvent {
  return {
    type,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Convert audio chunk to base64
 */
export function audioChunkToBase64(chunk: AudioChunk): string {
  if (typeof chunk.data === 'string') {
    return chunk.data;
  }

  const bytes = new Uint8Array(chunk.data as ArrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to audio chunk
 */
export function base64ToAudioChunk(
  base64: string,
  sampleRate: number,
  channels: number = 1
): AudioChunk {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return {
    data: bytes.buffer,
    sampleRate,
    channels,
    timestamp: Date.now(),
  };
}

/**
 * Format session duration for display
 */
export function formatSessionDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Get the Live API endpoint for a model
 */
export function getLiveAPIEndpoint(
  model: LiveSessionConfig['model'],
  region = 'us-central1'
): string {
  const baseURL = 'https://firebaseremoteconfig.googleapis.com/v1';
  // Note: Actual endpoint will be provided by Firebase AI Live API
  // This is a placeholder for the correct endpoint
  return `${baseURL}/projects/-/live/${model}`;
}

/**
 * Build WebSocket URL for Live API session
 */
export function buildLiveAPIWebSocketURL(
  config: LiveSessionConfig
): string {
  const sessionId = encodeURIComponent(config.sessionId);
  const model = encodeURIComponent(config.model);

  // Note: This is a placeholder URL structure
  // Actual URL will be provided by Firebase AI Live API documentation
  return `wss://live.googleapis.com/v1/models/${model}:stream?session=${sessionId}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  DEFAULT_VOICE_ASSISTANT_CONFIG,
  DEFAULT_EXERCISE_COACH_CONFIG,
  generateSessionId,
  validateAudioConfig,
  validateVideoConfig,
  createLiveAPIEvent,
  audioChunkToBase64,
  base64ToAudioChunk,
  formatSessionDuration,
  getLiveAPIEndpoint,
  buildLiveAPIWebSocketURL,
};
