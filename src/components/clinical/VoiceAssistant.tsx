/**
 * VoiceAssistant Component
 *
 * UI for FisioFlow voice assistant during telemedicine sessions.
 * Provides real-time bidirectional audio communication with AI.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  FileText,
  Clock,
  AlertCircle,
  Activity,
  CheckCircle2,
  XCircle,
  Settings,
  Info,
} from 'lucide-react';

import { VoiceAssistant as VoiceAssistantClass, KeyPoint } from '@/lib/ai/voice-assistant';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { LiveSessionCallbacks, LiveSessionState } from '@/lib/ai/live-config';

// ============================================================================
// TYPES
// ============================================================================

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface VoiceAssistantProps {
  /** Patient ID */
  patientId?: string;

  /** Therapist ID */
  therapistId?: string;

  /** Appointment ID */
  appointmentId?: string;

  /** Custom instructions */
  customInstructions?: string;

  /** Session started callback */
  onSessionStart?: (sessionId: string) => void;

  /** Session ended callback */
  onSessionEnd?: (summary: unknown) => void;

  /** Initial state - is session already active? */
  initialActive?: boolean;

  /** Show compact mode */
  compact?: boolean;

  /** Auto-start on mount */
  autoStart?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VoiceAssistant({
  patientId,
  therapistId,
  appointmentId,
  customInstructions,
  onSessionStart,
  onSessionEnd,
  initialActive = false,
  compact = false,
  autoStart = false,
}: VoiceAssistantProps) {
  // ========================================================================
  // STATE
  // ========================================================================

  const [isActive, setIsActive] = useState(initialActive);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyPoints, setShowKeyPoints] = useState(true);

  const assistantRef = useRef<VoiceAssistantClass | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  // ========================================================================
  // CALLBACKS
  // ========================================================================

  const callbacks: LiveSessionCallbacks = {
    onAudioReceived: useCallback((audio) => {
      // Audio handled by assistant class
      logger.debug('Audio received', { audio }, 'VoiceAssistant');
    }, []),

    onTranscript: useCallback((text, isFinal) => {
      setTranscripts(prev => {
        const newTranscripts = [...prev];

        // Update last transcript if not final
        if (newTranscripts.length > 0 && !newTranscripts[newTranscripts.length - 1].isFinal) {
          newTranscripts[newTranscripts.length - 1] = {
            ...newTranscripts[newTranscripts.length - 1],
            text,
            isFinal,
          };
        } else {
          newTranscripts.push({
            id: `msg-${Date.now()}`,
            role: 'assistant',
            text,
            timestamp: Date.now(),
            isFinal,
          });
        }

        return newTranscripts;
      });
    }, []),

    onSessionStart: useCallback(() => {
      setIsActive(true);
      setHasError(false);
      setErrorMessage('');
    }, []),

    onSessionEnd: useCallback(() => {
      setIsActive(false);
      setIsListening(false);
      setIsSpeaking(false);

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      // Get summary
      if (assistantRef.current) {
        const summary = assistantRef.current.generateSessionSummary();
        if (summary && onSessionEnd) {
          onSessionEnd(summary);
        }
      }
    }, [onSessionEnd]),

    onError: useCallback((error) => {
      setHasError(true);
      setErrorMessage(error.message);
      logger.error('Voice assistant error', error, 'VoiceAssistant');
    }, []),

    onSpeakingStart: useCallback(() => {
      setIsSpeaking(true);
    }, []),

    onSpeakingEnd: useCallback(() => {
      setIsSpeaking(false);
    }, []),

    onListeningStart: useCallback(() => {
      setIsListening(true);
    }, []),

    onListeningEnd: useCallback(() => {
      setIsListening(false);
    }, []),

    onEvent: useCallback((event) => {
      logger.debug('Live API event', { event }, 'VoiceAssistant');
    }, []),
  };

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Initialize assistant
  useEffect(() => {
    assistantRef.current = new VoiceAssistant(callbacks);

    return () => {
      if (assistantRef.current) {
        assistantRef.current.stopSession();
      }
    };
  }, []);

  // Auto-start
  useEffect(() => {
    if (autoStart && assistantRef.current && !isActive) {
      startSession();
    }
  }, [autoStart]);

  // Update duration timer
  useEffect(() => {
    if (isActive) {
      durationTimerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isActive]);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Update key points periodically
  useEffect(() => {
    if (isActive && assistantRef.current) {
      const interval = setInterval(() => {
        const points = assistantRef.current?.getKeyPoints() || [];
        setKeyPoints(points);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isActive]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const startSession = async () => {
    if (!assistantRef.current) return;

    try {
      const id = await assistantRef.current.startSession(
        {
          systemInstruction: customInstructions,
        },
        {
          patientId,
          therapistId,
          appointmentId,
          customInstructions,
          enableKeyPointsRecording: true,
        }
      );

      setSessionId(id);
      setDuration(0);
      setTranscripts([]);
      setKeyPoints([]);

      if (onSessionStart) {
        onSessionStart(id);
      }

      // Start recording
      await assistantRef.current.startRecording();
    } catch (error) {
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start session');
    }
  };

  const stopSession = async () => {
    if (!assistantRef.current) return;

    try {
      await assistantRef.current.stopSession();
    } catch (error) {
      logger.error('Error stopping session', error, 'VoiceAssistant');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual audio muting
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (category: KeyPoint['category']) => {
    switch (category) {
      case 'pain': return 'bg-red-100 text-red-700 border-red-200';
      case 'symptom': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'progress': return 'bg-green-100 text-green-700 border-green-200';
      case 'concern': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'exercise': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (compact) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              {isActive ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-50" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {formatDuration(duration)}
                  </span>
                </div>
              ) : (
                <div className="w-3 h-3 bg-slate-300 rounded-full" />
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {isActive ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={stopSession}
                  className="gap-2"
                >
                  <PhoneOff className="h-4 w-4" />
                  Encerrar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startSession}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Iniciar
                </Button>
              )}

              {isActive && (
                <>
                  {isListening && (
                    <Badge variant="outline" className="gap-1">
                      <Mic className="h-3 w-3" />
                      Ouvindo
                    </Badge>
                  )}
                  {isSpeaking && (
                    <Badge variant="outline" className="gap-1">
                      <Volume2 className="h-3 w-3" />
                      Falando
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Settings */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Error */}
          {hasError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Main Card */}
      <Card className="lg:col-span-2 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Assistente de Voz
              </CardTitle>
              <CardDescription>
                Comunicação em tempo real por voz durante a sessão
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Session Status */}
              {isActive && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(duration)}
                </Badge>
              )}

              {/* Settings */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-4">
          {/* Error Display */}
          {hasError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Erro na sessão</p>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHasError(false);
                  setErrorMessage('');
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Visualizers */}
          {isActive && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-8 py-6">
                {/* Listening Indicator */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-green-100 ring-4 ring-green-200'
                      : 'bg-slate-100'
                  }`}>
                    {isListening ? (
                      <div className="relative">
                        <Mic className="h-8 w-8 text-green-600" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full border-2 border-green-400 animate-ping" />
                        </div>
                      </div>
                    ) : (
                      <MicOff className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    {isListening ? 'Ouvindo...' : 'Aguardando'}
                  </span>
                </div>

                {/* Speaking Indicator */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isSpeaking
                      ? 'bg-blue-100 ring-4 ring-blue-200'
                      : 'bg-slate-100'
                  }`}>
                    {isSpeaking ? (
                      <div className="relative">
                        <Volume2 className="h-8 w-8 text-blue-600" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full border-2 border-blue-400 animate-pulse" />
                        </div>
                      </div>
                    ) : (
                      <VolumeX className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    {isSpeaking ? 'Falando...' : 'Aguardando'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Transcripts */}
          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-3 border-b bg-slate-50">
              <h3 className="font-medium text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcrição
              </h3>
              <Badge variant="secondary">
                {transcripts.length} mensagens
              </Badge>
            </div>

            <ScrollArea className="h-64 p-4">
              <div className="space-y-4">
                {transcripts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <Activity className="h-8 w-8 mb-2" />
                    <p className="text-sm">
                      {isActive
                        ? 'A transcrição aparecerá aqui...'
                        : 'Inicie a sessão para ver a transcrição'}
                    </p>
                  </div>
                ) : (
                  transcripts.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-teal-500 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <span
                          className={`text-xs mt-1 block ${
                            msg.role === 'user' ? 'text-teal-100' : 'text-slate-500'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={transcriptsEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            {isActive ? (
              <>
                {/* Mute Toggle */}
                <Button
                  size="lg"
                  variant={isMuted ? 'outline' : 'default'}
                  onClick={toggleMute}
                  className="rounded-full w-14 h-14"
                >
                  {isMuted ? (
                    <VolumeX className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </Button>

                {/* End Call */}
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopSession}
                  className="rounded-full w-16 h-16 gap-2"
                >
                  <PhoneOff className="h-6 w-6" />
                  Encerrar
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onClick={startSession}
                className="rounded-full w-16 h-16 gap-2"
              >
                <Phone className="h-6 w-6" />
                Iniciar
              </Button>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </h4>

              <div className="space-y-4">
                {/* Volume */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Volume: {volume}%
                  </label>
                  <Slider
                    value={[volume]}
                    onValueChange={([v]) => setVolume(v)}
                    max={100}
                    step={5}
                  />
                </div>

                {/* Custom Instructions */}
                {customInstructions && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Instruções Personalizadas
                    </label>
                    <p className="text-sm text-slate-600 bg-white p-3 rounded border">
                      {customInstructions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Points Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Pontos-Chave
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowKeyPoints(!showKeyPoints)}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Informações importantes extraídas da conversa
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="p-4">
          {keyPoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <CheckCircle2 className="h-8 w-8 mb-2" />
              <p className="text-sm text-center">
                {isActive
                  ? 'Pontos importantes aparecerão aqui...'
                  : 'Inicie a sessão para extrair pontos-chave'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {keyPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      point.importance >= 4
                        ? 'border-red-200 bg-red-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant="outline"
                        className={getCategoryColor(point.category)}
                      >
                        {point.category}
                      </Badge>

                      {/* Importance indicators */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(level => (
                          <div
                            key={level}
                            className={`w-1.5 h-1.5 rounded-full ${
                              level <= point.importance
                                ? 'bg-orange-500'
                                : 'bg-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700">{point.content}</p>

                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(point.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VoiceAssistant;
