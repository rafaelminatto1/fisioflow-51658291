/**
 * ElevenLabs Voice Hook
 *
 * React hook for generating and playing audio using ElevenLabs TTS.
 * Provides convenient methods for exercise instructions and patient education.
 */

import { useState, useCallback, useRef } from 'react';
import {
  elevenlabsService,
  generateExerciseAudio,
  generateEducationAudio,
  streamExerciseAudio,
  AudioGenerationResult,
  VoiceInstructionOptions,
  TTSOptions,
  DEFAULT_VOICES,
  PORTUGUESE_VOICES,
} from '@/lib/voice/elevenlabs-service';

// ============================================================================
// TYPES
// ============================================================================

export interface UseElevenLabsOptions {
  autoPlay?: boolean;
  onError?: (error: string) => void;
}

export interface UseElevenLabsResult {
  // State
  generating: boolean;
  playing: boolean;
  currentAudioUrl: string | null;
  error: string | null;

  // Methods
  generateAndPlay: (text: string, options?: TTSOptions) => Promise<void>;
  generateExerciseAudio: (options: VoiceInstructionOptions) => Promise<void>;
  generateEducationAudio: (title: string, content: string[]) => Promise<void>;
  playAudio: (audioUrl: string) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  clearAudio: () => void;
}

export interface ElevenLabsPlayerResult {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seeking: boolean;
  volume: number;
  setVolume: (volume: number) => void;
  currentTime: number;
  duration: number;
  muted: boolean;
  toggleMute: () => void;
}

// ============================================================================
// ELEVENLABS HOOK
// ============================================================================

export function useElevenLabs(
  options: UseElevenLabsOptions = {}
): UseElevenLabsResult {
  const { autoPlay = true, onError } = options;

  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Generate and play audio from text
   */
  const generateAndPlay = useCallback(
    async (text: string, ttsOptions?: TTSOptions) => {
      setGenerating(true);
      setError(null);

      try {
        const result = await elevenlabsService.generateAudio(text, ttsOptions);

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate audio');
        }

        if (result.audioUrl) {
          setCurrentAudioUrl(result.audioUrl);

          if (autoPlay) {
            playAudio(result.audioUrl);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setGenerating(false);
      }
    },
    [autoPlay, onError]
  );

  /**
   * Generate exercise instruction audio
   */
  const generateExerciseAudioCallback = useCallback(
    async (voiceOptions: VoiceInstructionOptions) => {
      setGenerating(true);
      setError(null);

      try {
        const result = await generateExerciseAudio(voiceOptions);

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate exercise audio');
        }

        if (result.audioUrl) {
          setCurrentAudioUrl(result.audioUrl);

          if (autoPlay) {
            playAudio(result.audioUrl);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setGenerating(false);
      }
    },
    [autoPlay, onError]
  );

  /**
   * Generate patient education audio
   */
  const generateEducationAudioCallback = useCallback(
    async (title: string, content: string[]) => {
      setGenerating(true);
      setError(null);

      try {
        const result = await generateEducationAudio(title, content);

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate education audio');
        }

        if (result.audioUrl) {
          setCurrentAudioUrl(result.audioUrl);

          if (autoPlay) {
            playAudio(result.audioUrl);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setGenerating(false);
      }
    },
    [autoPlay, onError]
  );

  /**
   * Play audio from URL
   */
  const playAudio = useCallback((audioUrl: string) => {
    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(audioUrl);

    audio.addEventListener('ended', () => {
      setPlaying(false);
    });

    audio.addEventListener('play', () => {
      setPlaying(true);
    });

    audio.addEventListener('pause', () => {
      setPlaying(false);
    });

    audio.play().catch((err) => {
      console.error('Failed to play audio:', err);
      setError('Failed to play audio');
    });

    audioRef.current = audio;
  }, []);

  /**
   * Pause current audio
   */
  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  /**
   * Stop current audio
   */
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  /**
   * Clear current audio
   */
  const clearAudio = useCallback(() => {
    stopAudio();
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
    }
    setCurrentAudioUrl(null);
    setError(null);
  }, [currentAudioUrl, stopAudio]);

  return {
    generating,
    playing,
    currentAudioUrl,
    error,
    generateAndPlay,
    generateExerciseAudio: generateExerciseAudioCallback,
    generateEducationAudio: generateEducationAudioCallback,
    playAudio,
    pauseAudio,
    stopAudio,
    clearAudio,
  };
}

// ============================================================================
// AUDIO PLAYER HOOK
// ============================================================================

export function useAudioPlayer(audioUrl: string | null): ElevenLabsPlayerResult {
  const [seeking, setSeeking] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMutedState] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Initialize audio element
   */
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      if (!seeking) {
        setCurrentTime(audio.currentTime);
      }
    });

    audio.addEventListener('volumechange', () => {
      setVolumeState(audio.volume);
      setMutedState(audio.muted);
    });

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl, seeking]);

  /**
   * Play audio
   */
  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, []);

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  /**
   * Stop audio
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  /**
   * Set volume
   */
  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  }, []);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
    }
  }, []);

  return {
    play,
    pause,
    stop,
    seeking,
    volume,
    setVolume,
    currentTime,
    duration,
    muted,
    toggleMute,
  };
}

// ============================================================================
// EXERCISE VOICE INSTRUCTIONS HOOK
// ============================================================================

export interface ExerciseVoiceOptions {
  exerciseName: string;
  instructions: string;
  voice?: keyof typeof DEFAULT_VOICES;
  tempo?: 'slow' | 'normal' | 'fast';
  includeCount?: boolean;
  includeRest?: boolean;
}

export function useExerciseVoice() {
  const {
    generating,
    playing,
    error,
    generateExerciseAudio,
    pauseAudio,
    stopAudio,
  } = useElevenLabs();

  const generateVoiceInstructions = useCallback(
    async (options: ExerciseVoiceOptions) => {
      const voiceId = options.voice
        ? PORTUGUESE_VOICES[DEFAULT_VOICES[options.voice]]
        : undefined;

      await generateExerciseAudio({
        exerciseName: options.exerciseName,
        instructions: options.instructions,
        tempo: options.tempo || 'normal',
        includeCount: options.includeCount !== false,
        includeRest: options.includeRest !== false,
        voiceId,
      });
    },
    [generateExerciseAudio]
  );

  return {
    generating,
    playing,
    error,
    generateVoiceInstructions,
    pause: pauseAudio,
    stop: stopAudio,
  };
}

// Import useEffect for the useAudioPlayer hook
import { useEffect } from 'react';
