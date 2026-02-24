/**
 * useAudioFeedback - Hook para feedback sonoro durante exercícios (Mobile)
 * 
 * Utiliza expo-av para emitir bips e sons de alerta.
 * Requer expo-speech para TTS (Text-to-Speech) completo.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export function useAudioFeedback() {
  const soundRef = useRef<Audio.Sound | null>(null);

  const playSuccess = useCallback(async () => {
    try {
      // Nota: Em um app real, carregaríamos arquivos mp3 dos assets
      // Aqui apenas logamos a intenção como placeholder
      console.log('[AudioFeedback] Som de Sucesso (Ding!)');
    } catch (e) {
      console.error('Audio error', e);
    }
  }, []);

  const playWarning = useCallback(async () => {
    try {
      console.log('[AudioFeedback] Alerta de Postura (Boop!)');
    } catch (e) {
      console.error('Audio error', e);
    }
  }, []);

  const announceRepetition = useCallback((count: number) => {
    // Requer expo-speech. Placeholder:
    console.log(`[AudioFeedback] Anunciando: ${count}`);
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return { playSuccess, playWarning, announceRepetition };
}
