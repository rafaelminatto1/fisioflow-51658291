
/**
 * Tipos de sons de gamificação
 */

import { useCallback, useRef, useEffect } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';

export type GamificationSoundType =
  | 'levelUp'           // Subiu de nível
  | 'achievement'       // Achievement desbloqueado
  | 'questComplete'     // Quest completada
  | 'streakMilestone'   // Marco de streak
  | 'success'           // Sucesso genérico
  | 'coin'              // Som de moeda/XP
  | 'click'             // Clique em botão
  | 'error';            // Erro

/**
 * Configuração de som
 */
interface SoundConfig {
  url: string;
  volume: number;
}

/**
 * URLs de áudio para cada tipo de som (usando mixkit CDN)
 */
const SOUND_URLS: Record<GamificationSoundType, SoundConfig> = {
  levelUp: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    volume: 0.6
  },
  achievement: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    volume: 0.5
  },
  questComplete: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    volume: 0.4
  },
  streakMilestone: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    volume: 0.5
  },
  success: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    volume: 0.4
  },
  coin: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    volume: 0.3
  },
  click: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    volume: 0.2
  },
  error: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    volume: 0.3
  }
};

/**
 * Hook para gerenciar sons de gamificação
 *
 * @example
 * ```tsx
 * const { playSound, playLevelUp, playAchievement, playQuestComplete, playStreakMilestone } = useGamificationSound();
 *
 * // Tocar som de level up
 * playLevelUp();
 *
 * // Tocar som customizado com volume diferente
 * playSound('achievement', 0.7);
 * ```
 */
export function useGamificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundCacheRef = useRef<Map<GamificationSoundType, HTMLAudioElement>>(new Map());

  // Inicializar áudios (preload para evitar delay)
  useEffect(() => {
    // Pré-carregar todos os sons
    Object.entries(SOUND_URLS).forEach(([type, config]) => {
      const audio = new Audio(config.url);
      audio.volume = config.volume;
      audio.preload = 'auto';
      soundCacheRef.current.set(type as GamificationSoundType, audio);
    });

    // Cleanup
    return () => {
      soundCacheRef.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      soundCacheRef.current.clear();
    };
  }, []);

  /**
   * Toca um som específico
   */
  const playSound = useCallback((type: GamificationSoundType, volume?: number) => {
    try {
      const config = SOUND_URLS[type];
      const audio = soundCacheRef.current.get(type);

      if (audio) {
        // Reset áudio para permitir replay rápido
        audio.currentTime = 0;
        // Usar volume customizado ou padrão
        audio.volume = volume !== undefined ? volume : config.volume;
        // Tocar
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            // Browsers bloqueiam autoplay sem interação do usuário
            logger.debug(`Som bloqueado ou falhou: ${type}`, err, 'useGamificationSound');
          });
        }
      }
    } catch (e) {
      logger.error(`Erro ao tocar som ${type}`, e, 'useGamificationSound');
    }
  }, []);

  /**
   * Toca som de level up
   */
  const playLevelUp = useCallback(() => {
    playSound('levelUp');
  }, [playSound]);

  /**
   * Toca som de achievement desbloqueado
   */
  const playAchievement = useCallback(() => {
    playSound('achievement');
  }, [playSound]);

  /**
   * Toca som de quest completada
   */
  const playQuestComplete = useCallback(() => {
    playSound('questComplete');
  }, [playSound]);

  /**
   * Toca som de marco de streak
   */
  const playStreakMilestone = useCallback(() => {
    playSound('streakMilestone');
  }, [playSound]);

  /**
   * Toca som de sucesso genérico
   */
  const playSuccess = useCallback(() => {
    playSound('success');
  }, [playSound]);

  /**
   * Toca som de coin/XP ganho
   */
  const playCoin = useCallback(() => {
    playSound('coin');
  }, [playSound]);

  /**
   * Toca som de clique
   */
  const playClick = useCallback(() => {
    playSound('click');
  }, [playSound]);

  /**
   * Toca som de erro
   */
  const playError = useCallback(() => {
    playSound('error');
  }, [playSound]);

  /**
   * Toca uma sequência de sons (ex: level up + success)
   */
  const playSoundSequence = useCallback(async (sounds: GamificationSoundType[], delay = 300) => {
    for (const sound of sounds) {
      playSound(sound);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }, [playSound]);

  return {
    playSound,
    playLevelUp,
    playAchievement,
    playQuestComplete,
    playStreakMilestone,
    playSuccess,
    playCoin,
    playClick,
    playError,
    playSoundSequence
  };
}

/**
 * Hook para controlar se sons estão ativados/desativados
 */
export function useSoundEnabled() {
  const getSoundEnabled = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('gamification_sounds_enabled');
    return stored !== null ? stored === 'true' : true; // Default: true
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gamification_sounds_enabled', String(enabled));
    }
  }, []);

  const toggleSound = useCallback(() => {
    const current = getSoundEnabled();
    setSoundEnabled(!current);
    return !current;
  }, [getSoundEnabled, setSoundEnabled]);

  return {
    soundEnabled: getSoundEnabled(),
    setSoundEnabled,
    toggleSound
  };
}
