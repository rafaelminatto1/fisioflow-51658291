/**
 * useDictation - Hook for voice dictation using Web Speech API
 *
 * Features:
 * - Auto-insert punctuation (periods, commas)
 * - Recognition of medical vocabulary
 * - "End dictation" gesture or button
 * - Visual feedback while recording
 * - Support for Portuguese and English
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export type DictationLanguage = 'pt-BR' | 'en-US';

export interface DictationConfig {
  language?: DictationLanguage;
  continuous?: boolean;
  interimResults?: boolean;
  autoPunctuation?: boolean;
  medicalTerms?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface UseDictationReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

// Medical terms that should be recognized
const MEDICAL_TERMS: Record<string, string> = {
  'escala visual analógica': 'EVA',
  'dor': 'dor',
  'nível de dor': 'nível de dor',
  'paciente relata': 'Paciente relata',
  'sinais vitais': 'Sinais vitais',
  'amplitude de movimento': 'ADM',
  'procedimentos realizados': 'Procedimentos realizados',
  'exercícios': 'Exercícios',
  'mensurações': 'Mensurações',
  'observações': 'Observações',
  'evolução': 'Evolução',
  'conduta': 'Conduta',
  'plano': 'Plano',
  'objetivo': 'Objetivo',
};

// Punctuation patterns
const PUNCTUATION_PATTERNS = [
  { pattern: /ponto$/gi, replacement: '.' },
  { pattern: /vírgula$/gi, replacement: ',' },
  { pattern: /ponto e vírgula$/gi, replacement: ';' },
  { pattern: /dois pontos$/gi, replacement: ':' },
  { pattern: /interrogação$/gi, replacement: '?' },
  { pattern: /exclamação$/gi, replacement: '!' },
  { pattern: /parágrafo$/gi, replacement: '\n\n' },
  { pattern: /nova linha$/gi, replacement: '\n' },
  { pattern: /parenteses aberto$/gi, replacement: '(' },
  { pattern: /parenteses fechado$/gi, replacement: ')' },
];

export const useDictation = (config: DictationConfig = {}): UseDictationReturn => {
  const {
    language = 'pt-BR',
    continuous = true,
    interimResults = true,
    autoPunctuation = true,
    medicalTerms = true,
    onResult,
    onError,
    onStart,
    onEnd,
  } = config;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check for browser support
  const isSupported = useCallback(() => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }, [])();

  // Apply punctuation to text
  const applyPunctuation = useCallback((text: string): string => {
    if (!autoPunctuation) return text;

    let processedText = text;

    // Apply punctuation patterns
    for (const { pattern, replacement } of PUNCTUATION_PATTERNS) {
      processedText = processedText.replace(pattern, replacement);
    }

    return processedText;
  }, [autoPunctuation]);

  // Process medical terms
  const processMedicalTerms = useCallback((text: string): string => {
    if (!medicalTerms) return text;

    let processedText = text;

    for (const [term, abbreviation] of Object.entries(MEDICAL_TERMS)) {
      // Case-insensitive replacement
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      processedText = processedText.replace(regex, abbreviation);
    }

    return processedText;
  }, [medicalTerms]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Seu navegador não suporta reconhecimento de voz');
      return;
    }

    if (isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      onStart?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      // Process text
      finalText = processMedicalTerms(finalText);
      finalText = applyPunctuation(finalText);
      interimText = processMedicalTerms(interimText);
      interimText = applyPunctuation(interimText);

      if (finalText) {
        setTranscript(prev => prev + finalText);
        onResult?.(transcript + finalText, true);
      }

      setInterimTranscript(interimText);

      if (interimText) {
        onResult?.(transcript + interimText, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Erro no reconhecimento de voz';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Nenhuma fala detectada';
          break;
        case 'audio-capture':
          errorMessage = 'Microfone não encontrado';
          break;
        case 'not-allowed':
          errorMessage = 'Permissão de microfone negada';
          break;
        case 'network':
          errorMessage = 'Erro de rede';
          break;
        case 'aborted':
          errorMessage = 'Reconhecimento abortado';
          break;
      }

      setError(errorMessage);
      onError?.(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      onEnd?.();
    };

    recognition.start();
  }, [
    isSupported,
    isListening,
    language,
    continuous,
    interimResults,
    processMedicalTerms,
    applyPunctuation,
    transcript,
    onResult,
    onError,
    onStart,
    onEnd,
  ]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};

// Voice commands for quick actions
export interface VoiceCommand {
  trigger: string;
  action: () => void;
  description: string;
}

export const useVoiceCommands = (commands: VoiceCommand[], config?: DictationConfig) => {
  const { transcript, interimTranscript, startListening, stopListening, resetTranscript, isListening, isSupported } =
    useDictation(config);

  const lastProcessedRef = useRef<string>('');

  // Check for voice commands
  useEffect(() => {
    const fullTranscript = transcript + interimTranscript;

    if (fullTranscript === lastProcessedRef.current) return;
    lastProcessedRef.current = fullTranscript;

    const lowerTranscript = fullTranscript.toLowerCase();

    for (const command of commands) {
      const triggerLower = command.trigger.toLowerCase();

      if (lowerTranscript.includes(triggerLower)) {
        command.action();
        resetTranscript();
        break;
      }
    }
  }, [transcript, interimTranscript, commands, resetTranscript]);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
};

// Predefined voice commands for evolution panel
export const getEvolutionVoiceCommands = (
  onAddPainLevel: () => void,
  onInsertExercise: () => void,
  onSave: () => void,
  onNextSection: () => void,
  onPreviousSection: () => void
): VoiceCommand[] => [
    {
      trigger: 'adicionar nível de dor',
      action: onAddPainLevel,
      description: 'Abrir slider de nível de dor',
    },
    {
      trigger: 'inserir exercício',
      action: onInsertExercise,
      description: 'Abrir seletor de exercícios',
    },
    {
      trigger: 'salvar evolução',
      action: onSave,
      description: 'Salvar evolução atual',
    },
    {
      trigger: 'próxima seção',
      action: onNextSection,
      description: 'Ir para a próxima seção',
    },
    {
      trigger: 'seção anterior',
      action: onPreviousSection,
      description: 'Ir para a seção anterior',
    },
  ];
