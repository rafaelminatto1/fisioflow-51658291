/**
 * FisioFlow Voice Assistant for Telemedicine
 *
 * Real-time voice assistant using Firebase AI Live API with
 * gemini-2.5-flash-native-audio-preview-12-2025 model.
 *
 * Features:
 * - Bidirectional audio streaming (16kHz input, 24kHz output)
 * - Real-time transcription
 * - Portuguese language support
 * - Medical context awareness (never diagnoses)
 * - Exercise suggestions when appropriate
 * - Session documentation for therapists
 *
 * @see https://firebase.google.com/docs/ai/realtime-audio
 */

// ============================================================================
// IMPORTS
// ============================================================================

import {
  LiveSessionConfig,
  LiveSessionState,
  LiveSessionCallbacks,
  AudioChunk,
  LiveAPIEvent,
  generateSessionId,
  DEFAULT_VOICE_ASSISTANT_CONFIG,
  createLiveAPIEvent,
  audioChunkToBase64,
  base64ToAudioChunk,
  formatSessionDuration,
} from '@/lib/ai/live-config';
import { fisioLogger as logger } from '@/lib/errors/logger';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Voice assistant configuration
 */
export interface VoiceAssistantConfig {
  /** Patient ID */
  patientId?: string;

  /** Therapist ID */
  therapistId?: string;

  /** Appointment ID */
  appointmentId?: string;

  /** Custom system instructions */
  customInstructions?: string;

  /** Enable auto-recording of key points */
  enableKeyPointsRecording?: boolean;

  /** Voice gender (if supported) */
  voiceGender?: 'male' | 'female' | 'neutral';

  /** Speech rate (0.5 to 2.0) */
  speechRate?: number;
}

/**
 * Key point extracted from conversation
 */
export interface KeyPoint {
  /** Timestamp */
  timestamp: number;

  /** Category */
  category: 'symptom' | 'pain' | 'progress' | 'concern' | 'exercise' | 'other';

  /** Content */
  content: string;

  /** Importance (1-5) */
  importance: number;
}

/**
 * Voice assistant session data
 */
export interface VoiceAssistantSession {
  /** Session ID */
  sessionId: string;

  /** Configuration */
  config: LiveSessionConfig;

  /** State */
  state: LiveSessionState;

  /** Transcripts */
  transcripts: Array<{
    role: 'user' | 'assistant';
    text: string;
    timestamp: number;
    isFinal: boolean;
  }>;

  /** Key points extracted */
  keyPoints: KeyPoint[];

  /** Audio context */
  audioContext?: AudioContext;

  /** WebSocket connection */
  ws?: WebSocket;

  /** Media stream */
  mediaStream?: MediaStream;

  /** Audio worklet */
  audioWorklet?: AudioWorkletNode;

  /** Source node */
  sourceNode?: MediaStreamAudioSourceNode;

  /** Processor node */
  processorNode?: ScriptProcessorNode;
}

// ============================================================================
// VOICE ASSISTANT CLASS
// ============================================================================

/**
 * Voice Assistant for Telemedicine
 */
export class VoiceAssistant {
  private session: VoiceAssistantSession | null = null;
  private callbacks: LiveSessionCallbacks;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private silenceDetectionTimer: number | null = null;
  private speechDetectionThreshold = -50; // dB
  private silenceDuration = 1000; // ms

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  /**
   * Start a new voice assistant session
   */
  async startSession(
    config: Partial<LiveSessionConfig> = {},
    assistantConfig: VoiceAssistantConfig = {}
  ): Promise<string> {
    try {
      // Generate session ID
      const sessionId = generateSessionId('voice');

      // Build full configuration
      const fullConfig: LiveSessionConfig = {
        ...DEFAULT_VOICE_ASSISTANT_CONFIG,
        ...config,
        sessionId,
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        audio: {
          ...DEFAULT_VOICE_ASSISTANT_CONFIG.audio,
          ...config.audio,
        },
        systemInstruction: this.buildSystemInstruction(assistantConfig),
      };

      // Initialize session
      this.session = {
        sessionId,
        config: fullConfig,
        state: {
          isActive: false,
          isSpeaking: false,
          isListening: false,
          hasError: false,
        },
        transcripts: [],
        keyPoints: [],
      };

      // Initialize audio
      await this.initializeAudio();

      // Connect to Live API
      await this.connectToLiveAPI();

      this.session.state.isActive = true;
      this.session.state.startTime = Date.now();

      this.callbacks.onSessionStart();

      return sessionId;
    } catch (error) {
      this.session = null;
      throw new Error(`Failed to start voice session: ${error}`);
    }
  }

  /**
   * Stop the current session
   */
  async stopSession(): Promise<void> {
    if (!this.session) return;

    try {
      // Stop recording
      await this.stopRecording();

      // Close WebSocket
      if (this.session.ws) {
        this.session.ws.close();
      }

      // Stop audio context
      if (this.session.audioContext) {
        await this.session.audioContext.close();
      }

      // Stop media stream
      if (this.session.mediaStream) {
        this.session.mediaStream.getTracks().forEach(track => track.stop());
      }

      this.session.state.isActive = false;
      this.session.state.duration = Date.now() - (this.session.state.startTime || 0);

      this.callbacks.onSessionEnd();

      // Generate session summary
      const summary = this.generateSessionSummary();

      // Keep session for summary retrieval
      return;
    } catch (error) {
      throw new Error(`Failed to stop session: ${error}`);
    }
  }

  // ========================================================================
  // AUDIO MANAGEMENT
  // ========================================================================

  /**
   * Initialize audio capture and playback
   */
  private async initializeAudio(): Promise<void> {
    if (!this.session) throw new Error('No active session');

    // Create audio context
    this.session.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.session.config.audio.outputSampleRate,
    });

    // Get user media
    this.session.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: this.session.config.audio.inputSampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  }

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    if (!this.session || !this.session.audioContext || !this.session.mediaStream) {
      throw new Error('Session not initialized');
    }

    try {
      // Create source node
      this.session.sourceNode = this.session.audioContext.createMediaStreamSource(
        this.session.mediaStream
      );

      // Create processor for audio data
      const bufferSize = 4096;
      this.session.processorNode = this.session.audioContext.createScriptProcessor(
        bufferSize,
        1,
        1
      );

      // Process audio chunks
      this.session.processorNode.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);

        // Detect speech
        this.detectSpeech(audioData);

        // Send to Live API if session is active
        if (this.session?.state.isActive && this.session?.ws?.readyState === WebSocket.OPEN) {
          this.sendAudioChunk(audioData);
        }
      };

      // Connect nodes
      this.session.sourceNode.connect(this.session.processorNode);
      this.session.processorNode.connect(this.session.audioContext.destination);

      this.session.state.isListening = true;
      this.callbacks.onListeningStart();
    } catch (error) {
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  /**
   * Stop recording audio
   */
  async stopRecording(): Promise<void> {
    if (!this.session) return;

    try {
      if (this.session.sourceNode) {
        this.session.sourceNode.disconnect();
        this.session.sourceNode = undefined;
      }

      if (this.session.processorNode) {
        this.session.processorNode.disconnect();
        this.session.processorNode = undefined;
      }

      this.session.state.isListening = false;
      this.callbacks.onListeningEnd();
    } catch (error) {
      logger.error('Error stopping recording', error, 'VoiceAssistant');
    }
  }

  /**
   * Send audio chunk to Live API
   */
  private sendAudioChunk(audioData: Float32Array): void {
    if (!this.session?.ws) return;

    try {
      // Convert to 16-bit PCM
      const pcmData = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
      }

      // Create audio chunk
      const chunk: AudioChunk = {
        data: pcmData.buffer,
        sampleRate: this.session.config.audio.inputSampleRate,
        channels: 1,
        timestamp: Date.now(),
      };

      // Send via WebSocket
      const message = {
        type: 'audio',
        data: audioChunkToBase64(chunk),
        config: {
          sampleRate: chunk.sampleRate,
          channels: chunk.channels,
        },
      };

      this.session.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Error sending audio chunk', error, 'VoiceAssistant');
    }
  }

  /**
   * Play received audio from AI
   */
  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.session?.audioContext || this.isPlaying) {
      // Queue audio if currently playing
      return;
    }

    try {
      this.isPlaying = true;
      this.callbacks.onSpeakingStart();

      // Decode audio data
      const audioBuffer = await this.session.audioContext.decodeAudioData(audioData);

      // Create source
      const source = this.session.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to destination
      source.connect(this.session.audioContext.destination);

      // Play and wait for completion
      source.start(0);

      source.onended = () => {
        this.isPlaying = false;
        this.callbacks.onSpeakingEnd();

        // Play next queued audio if any
        if (this.audioQueue.length > 0) {
          const nextBuffer = this.audioQueue.shift();
          if (nextBuffer) {
            this.playQueuedAudio(nextBuffer);
          }
        }
      };
    } catch (error) {
      logger.error('Error playing audio', error, 'VoiceAssistant');
      this.isPlaying = false;
      this.callbacks.onSpeakingEnd();
    }
  }

  /**
   * Play queued audio
   */
  private async playQueuedAudio(buffer: AudioBuffer): Promise<void> {
    if (!this.session?.audioContext) return;

    try {
      const source = this.session.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.session.audioContext.destination);
      source.start(0);

      source.onended = () => {
        this.isPlaying = false;
        this.callbacks.onSpeakingEnd();

        if (this.audioQueue.length > 0) {
          const nextBuffer = this.audioQueue.shift();
          if (nextBuffer) {
            this.playQueuedAudio(nextBuffer);
          }
        }
      };
    } catch (error) {
      logger.error('Error playing queued audio', error, 'VoiceAssistant');
    }
  }

  // ========================================================================
  // LIVE API CONNECTION
  // ========================================================================

  /**
   * Connect to Firebase AI Live API
   */
  private async connectToLiveAPI(): Promise<void> {
    if (!this.session) throw new Error('No active session');

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        const ws = new WebSocket(
          `wss://firebaseremoteconfig.googleapis.com/v1/live/${this.session.config.model}?session=${this.session.sessionId}`
        );

        ws.onopen = () => {
          // Send configuration
          ws.send(
            JSON.stringify({
              type: 'config',
              config: {
                model: this.session?.config.model,
                language: this.session?.config.language,
                audio: this.session?.config.audio,
                systemInstruction: this.session?.config.systemInstruction,
              },
            })
          );
          resolve();
        };

        ws.onmessage = async (event) => {
          await this.handleLiveAPIMessage(event.data);
        };

        ws.onerror = (error) => {
          logger.error('WebSocket connection error', error, 'VoiceAssistant');
          this.session!.state.hasError = true;
          this.session!.state.errorMessage = 'Connection error';
          this.callbacks.onError(new Error('WebSocket connection failed'));
          reject(error);
        };

        ws.onclose = () => {
          if (this.session?.state.isActive) {
            this.callbacks.onSessionEnd();
          }
        };

        this.session.ws = ws;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle messages from Live API
   */
  private async handleLiveAPIMessage(data: string): Promise<void> {
    if (!this.session) return;

    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'audio': {
          // Received audio from AI
          const audioChunk = base64ToAudioChunk(
            message.data,
            this.session.config.audio.outputSampleRate,
            1
          );
          await this.playAudio(audioChunk.data as ArrayBuffer);
          break;
        }

        case 'transcript': {
          // Received transcript
          const isFinal = message.isFinal || false;
          this.addTranscript('assistant', message.text, isFinal);

          if (isFinal) {
            // Extract key points from final transcript
            this.extractKeyPoints(message.text);
          }

          this.callbacks.onTranscript(message.text, isFinal);
          break;
        }

        case 'user_transcript':
          // User's speech was transcribed
          this.addTranscript('user', message.text, true);
          this.callbacks.onTranscript(message.text, true);
          break;

        case 'error':
          this.session.state.hasError = true;
          this.session.state.errorMessage = message.error;
          this.callbacks.onError(new Error(message.error));
          break;

        case 'warning':
          logger.warn('Live API warning', message.warning, 'VoiceAssistant');
          break;

        default:
          // Handle custom events
          if (this.callbacks.onEvent) {
            this.callbacks.onEvent(message as LiveAPIEvent);
          }
      }
    } catch (error) {
      logger.error('Error handling Live API message', error, 'VoiceAssistant');
    }
  }

  // ========================================================================
  // SPEECH DETECTION
  // ========================================================================

  /**
   * Detect speech activity in audio data
   */
  private detectSpeech(audioData: Float32Array): void {
    // Calculate RMS (root mean square) to detect speech
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    const db = 20 * Math.log10(rms);

    if (db > this.speechDetectionThreshold) {
      // Speech detected
      if (this.silenceDetectionTimer) {
        clearTimeout(this.silenceDetectionTimer);
        this.silenceDetectionTimer = null;
      }
    } else {
      // Silence detected - start timer
      if (!this.silenceDetectionTimer) {
        this.silenceDetectionTimer = window.setTimeout(() => {
          // User stopped speaking
          this.silenceDetectionTimer = null;
        }, this.silenceDuration);
      }
    }
  }

  // ========================================================================
  // TRANSCRIPT MANAGEMENT
  // ========================================================================

  /**
   * Add transcript to session
   */
  private addTranscript(
    role: 'user' | 'assistant',
    text: string,
    isFinal: boolean
  ): void {
    if (!this.session) return;

    this.session.transcripts.push({
      role,
      text,
      timestamp: Date.now(),
      isFinal,
    });
  }

  /**
   * Extract key points from conversation
   */
  private extractKeyPoints(text: string): void {
    if (!this.session) return;

    // Keywords for different categories
    const keywords = {
      symptom: ['dor', 'sinto', 'incomodo', 'sintoma', 'mal-estar'],
      pain: ['dói', 'machuca', 'late', 'queima', 'aperto'],
      progress: ['melhor', 'evolui', 'avanço', 'melhora', 'progresso'],
      concern: ['preocupado', 'receio', 'medo', 'ansioso', 'duvida'],
      exercise: ['exercicio', 'alongamento', 'fortalecimento', 'repeticao'],
    };

    // Detect categories
    const lowerText = text.toLowerCase();
    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (lowerText.includes(word)) {
          this.session.keyPoints.push({
            timestamp: Date.now(),
            category: category as KeyPoint['category'],
            content: text,
            importance: this.calculateImportance(text, category as KeyPoint['category']),
          });
          return;
        }
      }
    }
  }

  /**
   * Calculate importance of a key point
   */
  private calculateImportance(text: string, category: KeyPoint['category']): number {
    let importance = 3; // Default

    // Pain mentions are important
    if (category === 'pain') {
      importance = 5;
    }

    // Concerns are important
    if (category === 'concern') {
      importance = 4;
    }

    // Look for emphasis words
    if (text.toLowerCase().includes('muito') || text.toLowerCase().includes('severo')) {
      importance = Math.min(5, importance + 1);
    }

    return importance;
  }

  // ========================================================================
  // SYSTEM INSTRUCTIONS
  // ========================================================================

  /**
   * Build system instruction from config
   */
  private buildSystemInstruction(assistantConfig: VoiceAssistantConfig): string {
    let instruction = DEFAULT_VOICE_ASSISTANT_CONFIG.systemInstruction || '';

    // Add custom instructions
    if (assistantConfig.customInstructions) {
      instruction += `\n\nADDITIONAL INSTRUCTIONS:\n${assistantConfig.customInstructions}`;
    }

    // Add patient context if available
    if (assistantConfig.patientId) {
      instruction += `\n\nPATIENT ID: ${assistantConfig.patientId}`;
    }

    // Add appointment context if available
    if (assistantConfig.appointmentId) {
      instruction += `\n\nAPPOINTMENT ID: ${assistantConfig.appointmentId}`;
      instruction += '\nRemember to document key discussion points for the therapist.';
    }

    return instruction;
  }

  // ========================================================================
  // SESSION DATA
  // ========================================================================

  /**
   * Get current session state
   */
  getState(): LiveSessionState | null {
    return this.session?.state || null;
  }

  /**
   * Get session transcripts
   */
  getTranscripts(): VoiceAssistantSession['transcripts'] {
    return this.session?.transcripts || [];
  }

  /**
   * Get key points
   */
  getKeyPoints(): KeyPoint[] {
    return this.session?.keyPoints || [];
  }

  /**
   * Generate session summary
   */
  generateSessionSummary(): {
    sessionId: string;
    duration: string;
    transcriptCount: number;
    keyPoints: KeyPoint[];
    summary: string;
  } | null {
    if (!this.session) return null;

    const duration = this.session.state.duration
      ? formatSessionDuration(this.session.state.duration)
      : '0s';

    // Build summary
    const keyPointsByCategory = this.session.keyPoints.reduce((acc, kp) => {
      acc[kp.category] = acc[kp.category] || [];
      acc[kp.category].push(kp);
      return acc;
    }, {} as Record<string, KeyPoint[]>);

    const summaryParts: string[] = [];

    if (keyPointsByCategory.pain?.length) {
      summaryParts.push(`Pain mentioned ${keyPointsByCategory.pain.length} times`);
    }

    if (keyPointsByCategory.symptom?.length) {
      summaryParts.push(`Symptoms reported: ${keyPointsByCategory.symptom.length}`);
    }

    if (keyPointsByCategory.progress?.length) {
      summaryParts.push(`Progress indicators: ${keyPointsByCategory.progress.length}`);
    }

    return {
      sessionId: this.session.sessionId,
      duration,
      transcriptCount: this.session.transcripts.length,
      keyPoints: this.session.keyPoints,
      summary: summaryParts.join('. ') || 'No significant events recorded',
    };
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.session = null;
    this.audioQueue = [];
    this.isPlaying = false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default VoiceAssistant;
export type {
  VoiceAssistantConfig,
  KeyPoint,
  VoiceAssistantSession,
};
