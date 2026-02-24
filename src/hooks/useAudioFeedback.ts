/**
 * useAudioFeedback - Hook para feedback sonoro em tempo real
 * 
 * Implementa Text-to-Speech (TTS) e feedback sonoro (beeps) 
 * para guiar o paciente durante a execução dos exercícios.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MovementPhase } from '@/types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface UseAudioFeedbackProps {
  enabled?: boolean;
  voice?: SpeechSynthesisVoice | null;
  rate?: number; // Velocidade da fala (0.1 a 10)
  pitch?: number; // Tom da voz (0 a 2)
  volume?: number; // Volume (0 a 1)
}

export function useAudioFeedback({
  enabled = true,
  voice = null,
  rate = 1.0,
  pitch = 1.0,
  volume = 1.0,
}: UseAudioFeedbackProps = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenMessage = useRef<string>('');
  const lastSpokenTime = useRef<number>(0);

  // Carregar vozes disponíveis
  useEffect(() => {
    if (!synth) return;

    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, [synth]);

  /**
   * Falar uma mensagem
   */
  const speak = useCallback((text: string, force: boolean = false) => {
    if (!enabled || !synth) return;

    // Evitar repetição muito frequente da mesma mensagem (debounce de 3s)
    const now = Date.now();
    if (!force && text === lastSpokenMessage.current && (now - lastSpokenTime.current) < 3000) {
      return;
    }

    // Cancelar fala anterior se for forçado
    if (force) {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Tentar encontrar voz em português
    const ptVoice = voices.find(v => v.lang.includes('pt-BR')) || voices.find(v => v.lang.includes('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Erro na síntese de fala:', e);
      setIsSpeaking(false);
    };

    synth.speak(utterance);
    lastSpokenMessage.current = text;
    lastSpokenTime.current = now;
  }, [enabled, synth, voices, rate, pitch, volume]);

  /**
   * Tocar um som de feedback (beep, sucesso, erro)
   */
  const playSound = useCallback((type: 'success' | 'warning' | 'error' | 'phase_change') => {
    if (!enabled) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'success':
        // Ding! (agudo e curto)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1); // A6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'warning':
        // Boop (grave e curto)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'error':
        // Buzz (onda dente de serra)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      
      case 'phase_change':
        // Click suave
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
    }

    // Limpar contexto após o som
    setTimeout(() => {
      ctx.close();
    }, 500);
  }, [enabled]);

  /**
   * Feedback automático baseado na fase do movimento
   */
  const announcePhase = useCallback((phase: MovementPhase) => {
    playSound('phase_change');
    // Opcional: falar a fase (pode ser irritante se muito frequente)
    // speak(phase === MovementPhase.UP ? 'Sobe' : 'Desce');
  }, [playSound]);

  /**
   * Feedback de contagem
   */
  const announceCount = useCallback((count: number) => {
    playSound('success');
    speak(count.toString(), true);
    
    // Feedback motivacional a cada 5 repetições
    if (count > 0 && count % 5 === 0) {
      setTimeout(() => {
        const messages = ['Muito bem!', 'Continue assim!', 'Ótimo trabalho!', 'Excelente!'];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        speak(randomMsg);
      }, 800);
    }
  }, [playSound, speak]);

  /**
   * Feedback de correção postural
   */
  const announceCorrection = useCallback((issue: string) => {
    playSound('warning');
    speak(issue);
  }, [playSound, speak]);

  return {
    speak,
    playSound,
    announcePhase,
    announceCount,
    announceCorrection,
    isSpeaking,
  };
}
