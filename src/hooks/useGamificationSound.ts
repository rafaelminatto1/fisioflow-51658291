import { useCallback } from 'react';

// Using reliable CDN for UI sounds or placeholders
const SOUNDS = {
  success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Simple chime
  levelUp: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Victory tune
  coin: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',    // Coin ping
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',   // Soft click
  error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',   // Error buzz
};

type SoundType = keyof typeof SOUNDS;

export function useGamificationSound() {
  const playSound = useCallback((type: SoundType, volume: number = 0.5) => {
    try {
      const audio = new Audio(SOUNDS[type]);
      audio.volume = volume;
      audio.play().catch(err => {
        // Browsers often block autoplay without user interaction
        console.warn('Audio playback blocked or failed:', err);
      });
    } catch (e) {
      console.error('Error initializing audio:', e);
    }
  }, []);

  return { playSound };
}
