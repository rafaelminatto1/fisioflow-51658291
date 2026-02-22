/**
 * VoiceAppointmentAssistant - Assistente de agendamento por voz
 *
 * Features:
 * - Reconhecimento de voz (Web Speech API)
 * - Comandos naturais para agendamento
 * - Feedback visual durante fala
 * - Suporte offline (para comandos básicos)
 * - Multi-idioma
 * - Cancelamento de comando em voz
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Check,
  X,
  Loader2,
  Languages,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// TIPOS
// ============================================================================

export interface VoiceCommand {
  type: 'create' | 'list' | 'cancel' | 'reschedule' | 'help';
  params?: {
    patient?: string;
    date?: string;
    time?: string;
    duration?: string;
    appointmentId?: string;
  };
  rawText: string;
  confidence: number;
}

export interface VoiceTranscript {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface VoiceAssistantState {
  isListening: boolean;
  transcript: string;
  lastCommand: VoiceCommand | null;
  language: string;
  volume: number;
}

// ============================================================================
// CONFIGURAÇÕES DE IDIOMA
// ============================================================================

const LANGUAGE_CONFIGS: Record<string, { code: string; name: string; continuous?: boolean }> = {
  'pt-BR': { code: 'pt-BR', name: 'Português (Brasil)', continuous: true },
  'en-US': { code: 'en-US', name: 'English (US)', continuous: true },
  'es-ES': { code: 'es-ES', name: 'Español', continuous: true },
};

// ============================================================================
// PARSER DE COMANDOS DE VOZ
// ============================================================================

class VoiceCommandParser {
  private patientNames: Set<string>;

  constructor(patientNames: string[] = []) {
    this.patientNames = new Set(patientNames);
  }

  public parse(transcript: string): VoiceCommand | null {
    const text = transcript.toLowerCase().trim();

    // Comando de ajuda
    if (this.matchAny(text, ['ajuda', 'help', 'o que fazer', 'comandos'])) {
      return {
        type: 'help',
        rawText: transcript,
        confidence: 0.9,
      };
    }

    // Comando de listar
    if (this.matchAny(text, ['listar', 'mostre', 'agenda', 'meus agendamentos', 'quais'])) {
      return {
        type: 'list',
        rawText: transcript,
        confidence: 0.85,
      };
    }

    // Comando de cancelar
    if (this.matchAny(text, ['cancelar', 'cancel', 'desmarcar', 'remover', 'excluir'])) {
      const patientMatch = this.findPatient(text);
      if (patientMatch) {
        return {
          type: 'cancel',
          params: { patient: patientMatch },
          rawText: transcript,
          confidence: 0.8,
        };
      }
    }

    // Comando de reagendar
    if (this.matchAny(text, ['reagendar', 'mudar', 'alterar', 'mover'])) {
      const patientMatch = this.findPatient(text);
      const dateMatch = this.extractDate(text);
      const timeMatch = this.extractTime(text);

      if (patientMatch && (dateMatch || timeMatch)) {
        return {
          type: 'reschedule',
          params: {
            patient: patientMatch,
            date: dateMatch,
            time: timeMatch,
          },
          rawText: transcript,
          confidence: 0.75,
        };
      }
    }

    // Comando de criar (mais complexo)
    if (this.matchAny(text, ['agendar', 'marcar', 'criar', 'novo', 'nova consulta', 'agendamento'])) {
      const params = this.extractCreateParams(text);
      if (params) {
        return {
          type: 'create',
          params,
          rawText: transcript,
          confidence: this.calculateCreateConfidence(params),
        };
      }
    }

    return null;
  }

  private matchAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  private findPatient(text: string): string | null {
    for (const name of this.patientNames) {
      if (text.includes(name.toLowerCase())) {
        return name;
      }
    }
    return null;
  }

  private extractDate(text: string): string | null {
    const dateKeywords = [
      'hoje', 'amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo',
    ];

    for (const keyword of dateKeywords) {
      if (text.includes(keyword)) {
        return keyword;
      }
    }

    // Tentar formato dd/mm
    const dateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (dateMatch) {
      return `${dateMatch[1]}/${dateMatch[2]}`;
    }

    return null;
  }

  private extractTime(text: string): string | null {
    // Formato HH:MM
    const timeMatch = text.match(/\b(\d{1,2})[:h](\d{2})?\b/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2] ? timeMatch[2].padStart(2, '0') : '00';
      return `${hours}:${minutes}`;
    }

    // Horas por extenso
    const hourWords: Record<string, number> = {
      'uma': 1, 'dois': 2, 'três': 3, 'quatro': 4, 'cinco': 5,
      'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
      'onze': 11, 'doze': 12,
    };

    for (const [word, hour] of Object.entries(hourWords)) {
      if (text.includes(word + ' hora')) {
        return `${String(hour).padStart(2, '0')}:00`;
      }
    }

    return null;
  }

  private extractCreateParams(text: string): VoiceCommand['params'] | null {
    const patient = this.findPatient(text);
    const date = this.extractDate(text);
    const time = this.extractTime(text);

    // Duração
    let duration: string | null = null;
    if (text.includes('meia hora') || text.includes('30 min')) {
      duration = '30';
    } else if (text.includes('uma hora') || text.includes('60 min')) {
      duration = '60';
    } else if (text.includes('duas horas') || text.includes('120 min')) {
      duration = '120';
    }

    if (patient || date || time || duration) {
      return { patient, date, time, duration };
    }

    return null;
  }

  private calculateCreateConfidence(params: VoiceCommand['params']): number {
    let confidence = 0.3; // Base

    if (params?.patient) confidence += 0.25;
    if (params?.date) confidence += 0.2;
    if (params?.time) confidence += 0.15;
    if (params?.duration) confidence += 0.1;

    return Math.min(1, confidence);
  }
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface VoiceAppointmentAssistantProps {
  onCommand?: (command: VoiceCommand) => void;
  patientNames?: string[];
  defaultLanguage?: string;
  disabled?: boolean;
}

export const VoiceAppointmentAssistant: React.FC<VoiceAppointmentAssistantProps> = ({
  onCommand,
  patientNames = [],
  defaultLanguage = 'pt-BR',
  disabled = false,
}) => {
  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    transcript: '',
    lastCommand: null,
    language: defaultLanguage,
    volume: 0,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const parserRef = useRef<VoiceCommandParser | null>(null);

  // Inicializar parser
  useEffect(() => {
    parserRef.current = new VoiceCommandParser(patientNames);
  }, [patientNames]);

  // Detectar idiomas disponíveis
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const testRecognition = new SpeechRecognition();
      setAvailableLanguages(testRecognition.langs || []);
    }
  }, []);

  // Iniciar reconhecimento de voz
  const startListening = useCallback(() => {
    if (disabled || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast({
        title: 'Reconhecimento de voz não suportado',
        description: 'Seu navegador não suporta reconhecimento de voz.',
        variant: 'destructive',
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = state.language;
    recognition.continuous = LANGUAGE_CONFIGS[state.language]?.continuous || true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState((prev) => ({ ...prev, isListening: true }));
    };

    recognition.onend = () => {
      setState((prev) => ({ ...prev, isListening: false }));
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setState((prev) => ({
        ...prev,
        transcript: (prev.transcript + finalTranscript).trim() + interimTranscript,
        volume: interimTranscript.length > 0 ? 0.8 : 0,
      }));

      // Parse comando quando resultado final
      if (finalTranscript && parserRef.current) {
        const fullText = (state.transcript + finalTranscript).trim();
        const command = parserRef.current.parse(fullText);

        if (command) {
          setState((prev) => ({ ...prev, lastCommand: command }));
          onCommand?.(command);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      let errorMessage = 'Erro no reconhecimento de voz';
      if (event.error === 'not-allowed') {
        errorMessage = 'Permissão de microfone negada';
      } else if (event.error === 'no-speech') {
        errorMessage = 'Nenhuma fala detectada';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'Nenhum microfone detectado';
      }

      toast({
        title: errorMessage,
        variant: 'destructive',
      });

      setState((prev) => ({ ...prev, isListening: false }));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [state.language, state.transcript, onCommand, disabled]);

  // Parar reconhecimento
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Limpar transcrição
  const clearTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '', lastCommand: null }));
  }, []);

  // Trocar idioma
  const handleLanguageChange = useCallback((language: string) => {
    setState((prev) => ({ ...prev, language }));
  }, []);

  // Exemplo de comandos
  const commandExamples = [
    { text: 'Agendar João para amanhã às 14h', type: 'create' as const },
    { text: 'Marcar Maria hoje às 10h', type: 'create' as const },
    { text: 'Listar agendamentos', type: 'list' as const },
    { text: 'Cancelar consulta de Pedro', type: 'cancel' as const },
    { text: 'Reagendar Ana para terça-feira', type: 'reschedule' as const },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Assistente de Voz</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Área principal */}
      <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
        {/* Visualização da onda de áudio */}
        <div className="flex items-center justify-center gap-1 mb-4 h-16">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1 rounded-full transition-all',
                state.isListening
                  ? 'bg-primary animate-pulse'
                  : 'bg-muted',
                state.volume > 0 && i < Math.floor(state.volume * 32)
                  ? 'bg-primary h-4'
                  : 'h-2'
              )}
              style={{
                animationDelay: `${i * 20}ms`,
              }}
            />
          ))}
        </div>

        {/* Transcrição */}
        <div className="min-h-[100px] p-4 bg-background/80 backdrop-blur rounded-lg mb-4">
          {state.transcript ? (
            <p className="text-lg">
              {state.transcript}
              <span className="inline-block w-0.5 h-5 bg-primary/50 animate-pulse ml-1 align-middle" />
            </p>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {state.isListening
                ? 'Fale agora...'
                : 'Pressione o microfone para começar'}
            </p>
          )}
        </div>

        {/* Comando detectado */}
        {state.lastCommand && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-in slide-in-from-bottom">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Comando detectado: {state.lastCommand.type}
                </div>
                <div className="text-sm text-green-800 dark:text-green-200 mb-2">
                  "{state.lastCommand.rawText}"
                </div>
                {state.lastCommand.params && (
                  <div className="text-sm">
                    {Object.entries(state.lastCommand.params).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}:</span>{' '}
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-green-700 dark:text-green-300 mt-2">
                  Confiança: {Math.round(state.lastCommand.confidence * 100)}%
                </div>
              </div>
              <button
                onClick={() => setState((prev) => ({ ...prev, lastCommand: null }))}
                className="p-1 hover:bg-black/10 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center justify-center gap-4">
          {/* Botão de microfone */}
          <button
            onClick={state.isListening ? stopListening : startListening}
            disabled={disabled}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-all',
              'shadow-lg',
              state.isListening
                ? 'bg-red-500 text-white hover:bg-red-600 scale-110'
                : 'bg-primary text-white hover:bg-primary/90 hover:scale-110',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
            )}
          >
            {state.isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>

          {/* Botão limpar */}
          {state.transcript && (
            <button
              onClick={clearTranscript}
              className="p-3 hover:bg-muted rounded-lg transition-colors"
              title="Limpar"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Indicador de volume */}
          <div className="flex items-center gap-2">
            {state.volume > 0 ? (
              <Volume2 className="w-5 h-5 text-green-500" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
          </div>

          {/* Idioma */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
            >
              <Languages className="w-5 h-5" />
              {LANGUAGE_CONFIGS[state.language]?.name}
            </button>
          </div>
        </div>
      </div>

      {/* Panel de configurações */}
      {showSettings && (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-3">Configurações</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Idioma</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(LANGUAGE_CONFIGS).map(([code, config]) => (
                  <button
                    key={code}
                    onClick={() => handleLanguageChange(code)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-colors',
                      state.language === code
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exemplos de comandos */}
      <div className="mt-4">
        <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
          Comandos que você pode usar:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {commandExamples.map((example, i) => (
            <button
              key={i}
              onClick={() => {
                if (onCommand) {
                  onCommand({
                    type: example.type,
                    rawText: example.text,
                    confidence: 0.9,
                  });
                }
              }}
              className="p-3 bg-muted/30 hover:bg-muted/50 rounded-lg text-left transition-colors"
            >
              <span className="text-sm">"{example.text}"</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

VoiceAppointmentAssistant.displayName = 'VoiceAppointmentAssistant';
