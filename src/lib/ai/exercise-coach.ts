/**
 * FisioFlow Exercise Coach
 *
 * Real-time exercise coaching using Firebase AI Live API with
 * gemini-2.5-flash-native-audio-preview-12-2025 model.
 *
 * Features:
 * - Audio + video input (1 FPS video frames)
 * - Real-time form analysis and correction
 * - Repetition counting
 * - Breathing guidance
 * - Exercise modification suggestions
 * - Performance tracking
 *
 * @see https://firebase.google.com/docs/ai/realtime-audio
 */

// ============================================================================
// IMPORTS
// ============================================================================

// Extend global Window interface for webkitAudioContext vendor prefix
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

import {
  LiveSessionConfig,
  LiveSessionState,
  LiveSessionCallbacks,
  AudioChunk,
  VideoFrame,
  LiveAPIEvent,
  generateSessionId,
  DEFAULT_EXERCISE_COACH_CONFIG,
  createLiveAPIEvent,
  audioChunkToBase64,
  base64ToAudioChunk,
  formatSessionDuration,
} from '@fisioflow/shared-api/firebase/ai/live-config';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Exercise definition
 */
export interface Exercise {
  /** Exercise ID */
  id: string;

  /** Exercise name */
  name: string;

  /** Description */
  description: string;

  /** Target reps */
  targetReps: number;

  /** Target sets */
  targetSets: number;

  /** Video analysis enabled */
  enableVideoAnalysis: boolean;

  /** Form checkpoints */
  formCheckpoints: string[];

  /** Common mistakes */
  commonMistakes: string[];

  /** Breathing instructions */
  breathingInstructions: string;
}

/**
 * Repetition data
 */
export interface Repetition {
  /** Rep number */
  number: number;

  /** Set number */
  setNumber: number;

  /** Start timestamp */
  startTime: number;

  /** End timestamp */
  endTime?: number;

  /** Duration in ms */
  duration?: number;

  /** Form score (0-100) */
  formScore?: number;

  /** Form issues detected */
  formIssues: string[];

  /** Was rep corrected */
  wasCorrected: boolean;
}

/**
 * Set data
 */
export interface ExerciseSet {
  /** Set number */
  number: number;

  /** Start time */
  startTime: number;

  /** End time */
  endTime?: number;

  /** Reps completed */
  reps: Repetition[];

  /** Average form score */
  averageFormScore?: number;

  /** Notes */
  notes?: string;
}

/**
 * Exercise coaching session data
 */
export interface ExerciseCoachSession {
  /** Session ID */
  sessionId: string;

  /** Configuration */
  config: LiveSessionConfig;

  /** State */
  state: LiveSessionState;

  /** Current exercise */
  currentExercise?: Exercise;

  /** Current set */
  currentSet?: ExerciseSet;

  /** Current rep */
  currentRep?: Repetition;

  /** Completed sets */
  completedSets: ExerciseSet[];

  /** Feedback history */
  feedback: Array<{
    timestamp: number;
    type: 'correction' | 'encouragement' | 'count' | 'instruction';
    content: string;
  }>;

  /** Performance metrics */
  metrics: {
    totalReps: number;
    correctReps: number;
    averageFormScore: number;
    breathingCompliance: number;
  };

  /** Audio context */
  audioContext?: AudioContext;

  /** WebSocket connection */
  ws?: WebSocket;

  /** Media stream */
  mediaStream?: MediaStream;

  /** Video element */
  videoElement?: HTMLVideoElement;

  /** Canvas for frame capture */
  canvas?: HTMLCanvasElement;

  /** Frame capture interval */
  frameCaptureInterval?: number;
}

/**
 * Exercise coach configuration
 */
export interface ExerciseCoachConfig {
  /** Exercise to coach */
  exercise: Exercise;

  /** Patient skill level */
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';

  /** Enable video analysis */
  enableVideo?: boolean;

  /** Camera constraints */
  cameraConstraints?: MediaTrackConstraints;

  /** Exercise modification allowed */
  allowModifications?: boolean;

  /** Strict mode (stop on form issues) */
  strictMode?: boolean;
}

// ============================================================================
// EXERCISE COACH CLASS
// ============================================================================

/**
 * Exercise Coach for Physical Therapy
 */
export class ExerciseCoach {
  private session: ExerciseCoachSession | null = null;
  private callbacks: LiveSessionCallbacks;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentRepCount = 0;
  private currentSetCount = 1;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  /**
   * Start exercise coaching session
   */
  async startSession(
    coachConfig: ExerciseCoachConfig
  ): Promise<string> {
    try {
      // Generate session ID
      const sessionId = generateSessionId('exercise');

      // Build full configuration
      const fullConfig: LiveSessionConfig = {
        ...DEFAULT_EXERCISE_COACH_CONFIG,
        sessionId,
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        audio: {
          ...DEFAULT_EXERCISE_COACH_CONFIG.audio,
        },
        video: coachConfig.enableVideo
          ? {
              ...DEFAULT_EXERCISE_COACH_CONFIG.video,
              enabled: true,
            }
          : undefined,
        systemInstruction: this.buildSystemInstruction(coachConfig),
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
        currentExercise: coachConfig.exercise,
        currentSet: {
          number: this.currentSetCount,
          startTime: Date.now(),
          reps: [],
        },
        completedSets: [],
        feedback: [],
        metrics: {
          totalReps: 0,
          correctReps: 0,
          averageFormScore: 0,
          breathingCompliance: 0,
        },
      };

      // Initialize audio
      await this.initializeAudio();

      // Initialize video if enabled
      if (coachConfig.enableVideo) {
        await this.initializeVideo(coachConfig.cameraConstraints);
      }

      // Connect to Live API
      await this.connectToLiveAPI();

      this.session.state.isActive = true;
      this.session.state.startTime = Date.now();

      this.callbacks.onSessionStart();

      // Announce exercise start
      await this.announceExerciseStart(coachConfig.exercise);

      return sessionId;
    } catch (error) {
      this.session = null;
      throw new Error(`Failed to start exercise session: ${error}`);
    }
  }

  /**
   * Stop exercise session
   */
  async stopSession(): Promise<void> {
    if (!this.session) return;

    try {
      // Stop frame capture
      if (this.session.frameCaptureInterval) {
        clearInterval(this.session.frameCaptureInterval);
      }

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

      // Complete current set
      if (this.session.currentSet) {
        this.session.currentSet.endTime = Date.now();
        if (this.session.currentSet.reps.length > 0) {
          this.session.completedSets.push(this.session.currentSet);
        }
      }

      this.session.state.isActive = false;
      this.session.state.duration = Date.now() - (this.session.state.startTime || 0);

      this.callbacks.onSessionEnd();

      return;
    } catch (error) {
      throw new Error(`Failed to stop session: ${error}`);
    }
  }

  // ========================================================================
  // EXERCISE CONTROL
  // ========================================================================

  /**
   * Count a repetition
   */
  async countRep(formScore?: number): Promise<void> {
    if (!this.session?.currentSet) return;

    this.currentRepCount++;

    const rep: Repetition = {
      number: this.currentRepCount,
      setNumber: this.currentSetCount,
      startTime: Date.now(),
      formScore,
      formIssues: [],
      wasCorrected: false,
    };

    this.session.currentRep = rep;
    this.session.currentSet.reps.push(rep);

    // Count aloud
    await this.speakCount(this.currentRepCount);

    // Check if set is complete
    if (this.currentRepCount >= this.session.currentExercise!.targetReps) {
      await this.completeSet();
    }
  }

  /**
   * Complete current set
   */
  async completeSet(): Promise<void> {
    if (!this.session?.currentSet) return;

    this.session.currentSet.endTime = Date.now();
    this.session.completedSets.push(this.session.currentSet);

    // Announce set completion
    await this.announceSetComplete(this.currentSet);

    // Check if workout is complete
    if (this.currentSetCount >= this.session.currentExercise!.targetSets) {
      await this.announceWorkoutComplete();
      await this.stopSession();
    } else {
      // Start new set
      this.currentSetCount++;
      this.currentRepCount = 0;
      this.session.currentSet = {
        number: this.currentSetCount,
        startTime: Date.now(),
        reps: [],
      };

      await this.announceNextSet(this.currentSetCount);
    }
  }

  /**
   * Provide form correction
   */
  async correctForm(issue: string, suggestion: string): Promise<void> {
    if (!this.session?.currentRep) return;

    this.session.currentRep.formIssues.push(issue);
    this.session.currentRep.wasCorrected = true;

    this.session.feedback.push({
      timestamp: Date.now(),
      type: 'correction',
      content: `${issue}: ${suggestion}`,
    });

    await this.speakCorrection(issue, suggestion);
  }

  /**
   * Provide encouragement
   */
  async encourage(message: string): Promise<void> {
    if (!this.session) return;

    this.session.feedback.push({
      timestamp: Date.now(),
      type: 'encouragement',
      content: message,
    });

    await this.speakEncouragement(message);
  }

  /**
   * Suggest exercise modification
   */
  async suggestModification(reason: string, modification: string): Promise<void> {
    if (!this.session) return;

    this.session.feedback.push({
      timestamp: Date.now(),
      type: 'instruction',
      content: `Modification suggested: ${modification}`,
    });

    await this.speakModification(reason, modification);
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
      video: this.session.config.video?.enabled ? {
        width: this.session.config.video.width,
        height: this.session.config.video.height,
        frameRate: this.session.config.video.frameRate,
      } : false,
    });
  }

  /**
   * Initialize video capture
   */
  private async initializeVideo(constraints?: MediaTrackConstraints): Promise<void> {
    if (!this.session || !this.session.config.video?.enabled) return;

    // Create video element
    this.session.videoElement = document.createElement('video');
    this.session.videoElement.autoplay = true;
    this.session.videoElement.muted = true;

    // Create canvas for frame capture
    this.session.canvas = document.createElement('canvas');
    this.session.canvas.width = this.session.config.video.width;
    this.session.canvas.height = this.session.config.video.height;

    // Get video track
    if (this.session.mediaStream) {
      const videoTrack = this.session.mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        // Apply constraints
        await videoTrack.applyConstraints(constraints || {
          width: this.session.config.video.width,
          height: this.session.config.video.height,
          frameRate: this.session.config.video.frameRate,
        });
      }
    }

    // Start frame capture (1 FPS)
    const fps = this.session.config.video.frameRate;
    this.session.frameCaptureInterval = window.setInterval(() => {
      this.captureVideoFrame();
    }, 1000 / fps);
  }

  /**
   * Capture video frame
   */
  private captureVideoFrame(): void {
    if (!this.session?.videoElement || !this.session?.canvas || !this.session?.ws) return;

    try {
      const ctx = this.session.canvas.getContext('2d');
      if (!ctx) return;

      // Draw video frame to canvas
      ctx.drawImage(this.session.videoElement, 0, 0, this.session.canvas.width, this.session.canvas.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, this.session.canvas.width, this.session.canvas.height);

      // Convert to base64
      const base64 = this.arrayBufferToBase64(imageData.data.buffer);

      // Send video frame
      const frame: VideoFrame = {
        data: base64,
        width: this.session.config.video!.width,
        height: this.session.config.video!.height,
        timestamp: Date.now(),
        frameNumber: Math.floor(Date.now() / (1000 / this.session.config.video!.frameRate)),
      };

      const message = {
        type: 'video',
        frame: {
          data: frame.data,
          width: frame.width,
          height: frame.height,
          timestamp: frame.timestamp,
        },
      };

      this.session.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Error capturing video frame', error, 'ExerciseCoach');
    }
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    if (!this.session || !this.session.audioContext || !this.session.mediaStream) {
      throw new Error('Session not initialized');
    }

    try {
      const source = this.session.audioContext.createMediaStreamSource(this.session.mediaStream);
      const bufferSize = 4096;
      const processor = this.session.audioContext.createScriptProcessor(bufferSize, 1, 1);

      processor.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);

        if (this.session?.state.isActive && this.session?.ws?.readyState === WebSocket.OPEN) {
          this.sendAudioChunk(audioData);
        }
      };

      source.connect(processor);
      processor.connect(this.session.audioContext.destination);

      this.session.state.isListening = true;
      this.callbacks.onListeningStart();
    } catch (error) {
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    if (!this.session) return;

    this.session.state.isListening = false;
    this.callbacks.onListeningEnd();
  }

  /**
   * Send audio chunk to Live API
   */
  private sendAudioChunk(audioData: Float32Array): void {
    if (!this.session?.ws) return;

    try {
      const pcmData = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
      }

      const chunk: AudioChunk = {
        data: pcmData.buffer,
        sampleRate: this.session.config.audio.inputSampleRate,
        channels: 1,
        timestamp: Date.now(),
      };

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
      logger.error('Error sending audio chunk', error, 'ExerciseCoach');
    }
  }

  /**
   * Play received audio
   */
  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.session?.audioContext || this.isPlaying) return;

    try {
      this.isPlaying = true;
      this.callbacks.onSpeakingStart();

      const audioBuffer = await this.session.audioContext.decodeAudioData(audioData);
      const source = this.session.audioContext.createBufferSource();
      source.buffer = audioBuffer;
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
      logger.error('Error playing audio', error, 'ExerciseCoach');
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
      logger.error('Error playing queued audio', error, 'ExerciseCoach');
    }
  }

  // ========================================================================
  // SPEECH OUTPUT
  // ========================================================================

  /**
   * Announce exercise start
   */
  private async announceExerciseStart(exercise: Exercise): Promise<void> {
    const message = `Vamos começar o exercício: ${exercise.name}. ` +
      `Faremos ${exercise.targetSets} séries de ${exercise.targetReps} repetições. ` +
      exercise.description;

    await this.sendTextForSpeech(message);
  }

  /**
   * Speak rep count
   */
  private async speakCount(count: number): Promise<void> {
    const numberWords: Record<number, string> = {
      1: 'Um', 2: 'Dois', 3: 'Três', 4: 'Quatro', 5: 'Cinco',
      6: 'Seis', 7: 'Sete', 8: 'Oito', 9: 'Nove', 10: 'Dez',
      11: 'Onze', 12: 'Doze', 13: 'Treze', 14: 'Quatorze', 15: 'Quinze',
    };

    const word = numberWords[count] || count.toString();
    await this.sendTextForSpeech(word);
  }

  /**
   * Announce set completion
   */
  private async announceSetComplete(set: ExerciseSet): Promise<void> {
    const avgScore = set.reps.length > 0
      ? set.reps.reduce((sum, rep) => sum + (rep.formScore || 0), 0) / set.reps.length
      : 0;

    const message = `Série ${set.number} concluída! ` +
      (avgScore > 80 ? 'Ótima forma!' : avgScore > 60 ? 'Bom trabalho!' : 'Vamos melhorar a forma na próxima.');

    await this.sendTextForSpeech(message);
  }

  /**
   * Announce next set
   */
  private async announceNextSet(setNumber: number): Promise<void> {
    const message = `Prepare-se para a ${setNumber}ª série. Comece quando estiver pronto.`;
    await this.sendTextForSpeech(message);
  }

  /**
   * Announce workout complete
   */
  private async announceWorkoutComplete(): Promise<void> {
    const totalReps = this.session?.completedSets.reduce((sum, set) => sum + set.reps.length, 0) || 0;
    const avgScore = this.session?.metrics.averageFormScore || 0;

    const message = `Parabéns! Exercício concluído! ` +
      `Você completou ${totalReps} repetições. ` +
      (avgScore > 80 ? 'Excelente forma durante todo o exercício!' :
       avgScore > 60 ? 'Bom trabalho! Continue praticando para melhorar a forma.' :
       ' Foque na forma correta para melhores resultados.');

    await this.sendTextForSpeech(message);
  }

  /**
   * Speak form correction
   */
  private async speakCorrection(issue: string, suggestion: string): Promise<void> {
    const message = `Atenção: ${issue}. ${suggestion}`;
    await this.sendTextForSpeech(message);
  }

  /**
   * Speak encouragement
   */
  private async speakEncouragement(message: string): Promise<void> {
    await this.sendTextForSpeech(message);
  }

  /**
   * Speak modification suggestion
   */
  private async speakModification(reason: string, modification: string): Promise<void> {
    const message = `${reason}. Vamos tentar assim: ${modification}`;
    await this.sendTextForSpeech(message);
  }

  /**
   * Send text to be spoken by AI
   */
  private async sendTextForSpeech(text: string): Promise<void> {
    if (!this.session?.ws || this.session.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'tts',
      text,
    };

    this.session.ws.send(JSON.stringify(message));

    // Add to feedback log
    this.session.feedback.push({
      timestamp: Date.now(),
      type: 'instruction',
      content: text,
    });
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
        const ws = new WebSocket(
          `wss://firebaseremoteconfig.googleapis.com/v1/live/${this.session.config.model}?session=${this.session.sessionId}`
        );

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'config',
              config: {
                model: this.session?.config.model,
                language: this.session?.config.language,
                audio: this.session?.config.audio,
                video: this.session?.config.video,
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
          logger.error('WebSocket connection error', error, 'ExerciseCoach');
          this.session!.state.hasError = true;
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
        case 'audio':
          const audioChunk = base64ToAudioChunk(
            message.data,
            this.session.config.audio.outputSampleRate,
            1
          );
          await this.playAudio(audioChunk.data as ArrayBuffer);
          break;

        case 'form_analysis':
          // Form analysis from video
          if (message.formScore !== undefined) {
            if (this.session.currentRep) {
              this.session.currentRep.formScore = message.formScore;
            }

            // Update metrics
            this.updateFormMetrics(message.formScore);
          }

          if (message.issues && message.issues.length > 0) {
            for (const issue of message.issues) {
              await this.correctForm(issue.description, issue.correction);
            }
          }
          break;

        case 'rep_detected':
          // AI detected a rep completion
          await this.countRep(message.formScore);
          break;

        case 'breathing_reminder':
          // Breathing guidance
          await this.sendTextForSpeech(message.message);
          break;

        case 'transcript':
          this.callbacks.onTranscript(message.text, message.isFinal || false);
          break;

        case 'error':
          this.session.state.hasError = true;
          this.callbacks.onError(new Error(message.error));
          break;

        default:
          if (this.callbacks.onEvent) {
            this.callbacks.onEvent(message as LiveAPIEvent);
          }
      }
    } catch (error) {
      logger.error('Error handling Live API message', error, 'ExerciseCoach');
    }
  }

  /**
   * Update form metrics
   */
  private updateFormMetrics(formScore: number): void {
    if (!this.session) return;

    const allReps = this.session.completedSets.flatMap(set => set.reps);
    if (this.session.currentSet?.reps) {
      allReps.push(...this.session.currentSet.reps);
    }

    const totalScore = allReps.reduce((sum, rep) => sum + (rep.formScore || 0), 0);
    this.session.metrics.averageFormScore = totalScore / allReps.length;
    this.session.metrics.totalReps = allReps.length;
    this.session.metrics.correctReps = allReps.filter(rep => (rep.formScore || 0) >= 80).length;
  }

  // ========================================================================
  // SYSTEM INSTRUCTIONS
  // ========================================================================

  /**
   * Build system instruction from config
   */
  private buildSystemInstruction(coachConfig: ExerciseCoachConfig): string {
    let instruction = DEFAULT_EXERCISE_COACH_CONFIG.systemInstruction || '';

    // Add exercise-specific instructions
    instruction += `\n\nCURRENT EXERCISE: ${coachConfig.exercise.name}`;
    instruction += `\n${coachConfig.exercise.description}`;

    if (coachConfig.exercise.formCheckpoints.length > 0) {
      instruction += `\n\nFORM CHECKPOINTS:\n${coachConfig.exercise.formCheckpoints.join('\n')}`;
    }

    if (coachConfig.exercise.breathingInstructions) {
      instruction += `\n\nBREATHING: ${coachConfig.exercise.breathingInstructions}`;
    }

    // Add skill level context
    const skillTips = {
      beginner: 'This patient is a BEGINNER. Provide very detailed instructions, be patient, and praise small improvements.',
      intermediate: 'This patient is at INTERMEDIATE level. Focus on refining form and progressing difficulty.',
      advanced: 'This patient is ADVANCED. Focus on perfect form, subtle corrections, and performance optimization.',
    };

    if (coachConfig.skillLevel) {
      instruction += `\n\n${skillTips[coachConfig.skillLevel]}`;
    }

    // Add strict mode instruction
    if (coachConfig.strictMode) {
      instruction += '\n\nSTRICT MODE: Stop the exercise immediately if form is poor or patient reports pain.';
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
   * Get session metrics
   */
  getMetrics(): ExerciseCoachSession['metrics'] | null {
    return this.session?.metrics || null;
  }

  /**
   * Get feedback history
   */
  getFeedback(): ExerciseCoachSession['feedback'] {
    return this.session?.feedback || [];
  }

  /**
   * Get completed sets
   */
  getCompletedSets(): ExerciseSet[] {
    return this.session?.completedSets || [];
  }

  /**
   * Generate session summary
   */
  generateSessionSummary(): {
    sessionId: string;
    exercise: string;
    duration: string;
    totalSets: number;
    totalReps: number;
    averageFormScore: number;
    feedbackCount: number;
  } | null {
    if (!this.session) return null;

    const totalReps = this.session.completedSets.reduce((sum, set) => sum + set.reps.length, 0);
    const duration = this.session.state.duration
      ? formatSessionDuration(this.session.state.duration)
      : '0s';

    return {
      sessionId: this.session.sessionId,
      exercise: this.session.currentExercise?.name || 'Unknown',
      duration,
      totalSets: this.session.completedSets.length,
      totalReps,
      averageFormScore: this.session.metrics.averageFormScore,
      feedbackCount: this.session.feedback.length,
    };
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.session = null;
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentRepCount = 0;
    this.currentSetCount = 1;
  }
}

// ============================================================================
// COMMON EXERCISES
// ============================================================================

/**
 * Common physiotherapy exercises
 */
export const COMMON_EXERCISES: Record<string, Exercise> = {
  squat: {
    id: 'squat',
    name: 'Agachamento',
    description: 'Agache mantendo as costas retas e joelhos alinhados com os pés.',
    targetReps: 10,
    targetSets: 3,
    enableVideoAnalysis: true,
    formCheckpoints: [
      'Pés na largura dos ombros',
      'Costas retas',
      'Joelhos não ultrapassam ponta dos pés',
      'Desça até 90 graus',
    ],
    commonMistakes: [
      'Joelho valgizando para dentro',
      'Curvar as costas',
      'Descer muito pouco',
      'Levantar calcanhares',
    ],
    breathingInstructions: 'Inspire ao descer, expire ao subir',
  },
  lunge: {
    id: 'lunge',
    name: 'Afundo',
    description: 'Dê um passo à frente e flexione ambos os joelhos em 90 graus.',
    targetReps: 8,
    targetSets: 3,
    enableVideoAnalysis: true,
    formCheckpoints: [
      'Passo largo o suficiente',
      'Joelho frontal alinhado com tornozelo',
      'Joelho traseiro quase toca o chão',
      'Tronco ereto',
    ],
    commonMistakes: [
      'Passo muito curto',
      'Joelho frontal passa da ponta do pé',
      'Inclinar tronco à frente',
    ],
    breathingInstructions: 'Inspire ao descer, expire ao subir',
  },
  plank: {
    id: 'plank',
    name: 'Prancha',
    description: 'Apoie antebraços e ponta dos pés, mantendo corpo reto como uma tábua.',
    targetReps: 1,
    targetSets: 3,
    enableVideoAnalysis: true,
    formCheckpoints: [
      'Antebraços paralelos',
      'Corpo em linha reta',
      'Contrair abdômen',
      'Não deixar quadril cair ou subir',
    ],
    commonMistakes: [
      'Quadril muito alto ou muito baixo',
      'Costas curvadas',
      'Relaxar abdômen',
    ],
    breathingInstructions: 'Respire de forma rítmica e controlada',
  },
  bridge: {
    id: 'bridge',
    name: 'Ponte',
    description: 'Deitado, eleve os quadris mantendo pés apoiados no chão.',
    targetReps: 12,
    targetSets: 3,
    enableVideoAnalysis: true,
    formCheckpoints: [
      'Pés afastados na largura dos quadris',
      'Elevar quadris até alinhar com o corpo',
      'Contrair glúteos',
      'Manter posição 2 segundos',
    ],
    commonMistakes: [
      'Não elevar o suficiente',
      'Arquear as costas',
      'Não contrair glúteos',
    ],
    breathingInstructions: 'Inspire ao descer, expire ao elevar',
  },
  wallPushup: {
    id: 'wallPushup',
    name: 'Flexão de Braços na Parede',
    description: 'Em pé frente à parede, flexione os braços empurrando o corpo.',
    targetReps: 10,
    targetSets: 3,
    enableVideoAnalysis: true,
    formCheckpoints: [
      'Mãos na largura dos ombros',
      'Corpo reto como uma prancha',
      'Descer até quase tocar a parede com o nariz',
      'Empurrar de volta',
    ],
    commonMistakes: [
      'Cotovelos muito abertos',
      'Arquear as costas',
      'Movimento muito curto',
    ],
    breathingInstructions: 'Inspire ao descer, expire ao empurrar',
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ExerciseCoach;
export type {
  Exercise,
  Repetition,
  ExerciseSet,
  ExerciseCoachSession,
  ExerciseCoachConfig,
};
export { COMMON_EXERCISES };
