/**
 * ChatInterface - Componente de chat com RAG para IA Clínica
 *
 * Suporta:
 * - Chamada via Cloud Functions (analyzeWithRAG)
 * - Chamada direta à API Gemini (fallback/client-side)
 * - Speech-to-Text (Web Speech API)
 * - Text-to-Speech (Web Speech Synthesis)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Send, Sparkles, User, Bot, Volume2, VolumeX, Zap } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getGeminiClient, chat as geminiChat, GeminiModel } from '@/lib/integrations/google/client';
import { UnknownError } from '@/types';

// Web Speech API Types
interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isSpeaking?: boolean;
}

interface ChatInterfaceProps {
  patientId: string;
  patientName: string;
  className?: string;
  useRAG?: boolean; // Se true, usa Cloud Functions com RAG; se false, usa Gemini direto
  model?: GeminiModel;
}

export function ChatInterface({
  patientId,
  patientName,
  className,
  useRAG = true,
  model = GeminiModel.GEMINI_2_5_FLASH
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [directGemini, setDirectGemini] = useState(!useRAG); // Toggle para usar Gemini direto
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Verificar se Gemini client está configurado
  const geminiClient = getGeminiClient();
  const isGeminiConfigured = geminiClient.isConfigured();

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Inicializar reconhecimento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition() as ISpeechRecognition;
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
        };

        recognitionRef.current.onerror = (event: { error: string }) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const query = input;
    setInput('');
    setLoading(true);

    try {
      let responseText = '';

      // Contexto do paciente para o prompt
      const patientContext = `Paciente: ${patientName} (ID: ${patientId})\nVocê é um assistente clínico especializado em fisioterapia.`;

      if (directGemini && isGeminiConfigured) {
        // Usar Gemini API diretamente
        const history = messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

        responseText = await geminiChat(
          `${patientContext}\n\nPergunta: ${query}`,
          history,
          { model }
        );
      } else {
        // Usar Cloud Functions com RAG
        const analyzeWithRAG = httpsCallable(functions, 'aiChatWithRAG');
        const result = await analyzeWithRAG({
          patientId,
          message: `${patientContext}\n\nPergunta: ${query}`,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        responseText = (result.data as { response?: string }).response || 'Sem resposta da IA.';
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: UnknownError) {
      console.error('Erro ao enviar mensagem:', error);

      // Fallback para Gemini direto se Cloud Functions falhar
      if (!directGemini && isGeminiConfigured) {
        try {
          toast({
            title: 'Tentando Gemini direto...',
            description: 'Cloud Functions falhou, usando API direta.',
          });

          const responseText = await geminiChat(
            `${patientContext}\n\nPergunta: ${query}`,
            messages.map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            { model }
          );

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        } catch (geminiError) {
          toast({
            title: 'Erro',
            description: 'Falha ao comunicar com a IA.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Erro',
          description: 'Falha ao comunicar com a IA.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Voz não suportada',
        description: 'Seu navegador não suporta reconhecimento de voz.',
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleTextToSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancelar fala anterior
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chat IA Clínica - {patientName}</span>
          <div className="flex items-center gap-3">
            {isGeminiConfigured && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-600" />
                <Switch
                  checked={directGemini}
                  onCheckedChange={setDirectGemini}
                  id="gemini-toggle"
                />
                <label htmlFor="gemini-toggle" className="text-sm text-gray-600 cursor-pointer">
                  Gemini Direto
                </label>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Olá! Eu sou a IA assistente clínica do FisioFlow.</p>
                <p className="text-sm mt-2">
                  {directGemini
                    ? 'Modo Gemini Direto: Pergunte sobre o paciente e terei uma resposta baseada no Gemini 2.5.'
                    : 'Modo RAG: Pergunte sobre o histórico, evolução ou tratamento do paciente.'}
                </p>
                {isGeminiConfigured && (
                  <p className="text-xs mt-4 text-green-600">✓ Gemini API configurada</p>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    {message.role === 'assistant' && isVoiceEnabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 px-2 text-xs"
                        onClick={() => handleTextToSpeech(message.content)}
                      >
                        🔊 Ouvir
                      </Button>
                    )}
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleVoiceToggle}
              disabled={loading}
              className={isRecording ? 'bg-red-100 text-red-600' : ''}
            >
              🎤
            </Button>
            <Input
              placeholder="Digite sua pergunta sobre o paciente..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {isRecording && (
            <p className="text-xs text-red-600 mt-2">🎤 Ouvindo... fale agora</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ChatInterface;
