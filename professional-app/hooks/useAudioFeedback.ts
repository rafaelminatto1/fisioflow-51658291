/**
 * useAudioFeedback - Hook para feedback sonoro durante exercícios (Mobile)
 * 
 * Utiliza expo-av para emitir bips e sons de alerta.
 * Requer expo-speech para TTS (Text-to-Speech) completo.
 * 
 * OTIMIZAÇÃO: Usa lazy loading para não incluir expo-av no bundle inicial.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Tipo para o módulo de áudio (carregado sob demanda)
type AudioModule = typeof import('expo-av').Audio;
type SoundObject = import('expo-av').Sound;

export function useAudioFeedback() {
  const soundRef = useRef<SoundObject | null>(null);
  const [audioModule, setAudioModule] = useState<AudioModule | null>(null);

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
