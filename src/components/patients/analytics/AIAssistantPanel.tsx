/**
 * AI Assistant Panel for Patient Analysis
 *
 * Provides an AI-powered chat interface for analyzing patient data,
 * generating recommendations, and identifying risks.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  Send,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIPatientAssistant, useAIInsights } from '@/hooks/useAIInsights';
import ReactMarkdown from 'react-markdown';
import { usePatientAnalyticsDashboard } from '@/hooks/usePatientAnalytics';

// ============================================================================
// TYPES
// ============================================================================

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  category: 'progress' | 'risks' | 'recommendations' | 'predictions';
}

// ============================================================================
// COMPONENT
// ============================================================================

interface AIAssistantPanelProps {
  patientId: string;
  patientName: string;
}

export function AIAssistantPanel({ patientId, patientName }: AIAssistantPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: analyticsData } = usePatientAnalyticsDashboard(patientId);
  const chat = useAIPatientAssistant(patientId, patientName);
  const insights = useAIInsights({
    patientId,
    patientName,
    analyticsData,
    language: 'pt-BR',
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages, insights.completion]);

  const quickActions: QuickAction[] = [
    {
      id: 'progress',
      label: 'Analisar Progresso',
      icon: TrendingUp,
      action: () => {
        setActiveTab('chat');
        chat.append({
          role: 'user',
          content: `Analise o progresso do paciente ${patientName} com base nos dados mais recentes.`,
        });
      },
      category: 'progress',
    },
    {
      id: 'risks',
      label: 'Identificar Riscos',
      icon: AlertTriangle,
      action: () => {
        setActiveTab('chat');
        chat.append({
          role: 'user',
          content: `Quais são os principais riscos para o paciente ${patientName}? Como podemos mitigá-los?`,
        });
      },
      category: 'risks',
    },
    {
      id: 'recommendations',
      label: 'Recomendações',
      icon: Lightbulb,
      action: () => {
        setActiveTab('chat');
        chat.append({
          role: 'user',
          content: `Quais recomendações você tem para melhorar os resultados do paciente ${patientName}?`,
        });
      },
      category: 'recommendations',
    },
    {
      id: 'predictions',
      label: 'Predições',
      icon: Activity,
      action: () => {
        setActiveTab('chat');
        chat.append({
          role: 'user',
          content: `Com base nos dados atuais, qual é a previsão de recuperação do paciente ${patientName}?`,
        });
      },
      category: 'predictions',
    },
  ];

  const handleSend = () => {
    if (!input.trim() || chat.isLoading) return;

    chat.append({ role: 'user', content: input });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Assistente IA</CardTitle>
              <CardDescription>Análise inteligente do paciente</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Tab Toggle */}
        {isExpanded && (
          <div className="flex gap-2 mt-3">
            <Button
              variant={activeTab === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('chat')}
              className="flex-1"
            >
              Chat
            </Button>
            <Button
              variant={activeTab === 'insights' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('insights')}
              className="flex-1"
            >
              Insights
            </Button>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {quickActions.map(action => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={action.action}
                disabled={chat.isLoading || insights.isGenerating}
                className="gap-1.5 text-xs"
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </Button>
            ))}
          </div>

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <>
              <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {chat.messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shrink-0">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'rounded-lg px-3 py-2 max-w-[80%]',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="text-sm list-disc ml-4 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="text-sm list-decimal ml-4 space-y-1">{children}</ol>,
                              li: ({ children }) => <li>{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {chat.isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {chat.error && (
                    <div className="flex gap-3 justify-start">
                      <div className="p-2 bg-red-500 rounded-lg shrink-0">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Erro ao processar sua solicitação. Tente novamente.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre o paciente..."
                  disabled={chat.isLoading}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || chat.isLoading}
                  className="shrink-0"
                >
                  {chat.isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Análise Clínica Gerada por IA</span>
                </div>
                {!insights.completion && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => insights.generate()}
                    disabled={insights.isGenerating}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-3 w-3" />
                    Gerar
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[300px] pr-4">
                {insights.isGenerating && !insights.completion ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : insights.completion ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>,
                        p: ({ children }) => <p className="text-sm leading-relaxed mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="text-sm list-disc ml-4 space-y-1 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="text-sm list-decimal ml-4 space-y-1 mb-2">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {insights.completion}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center text-muted-foreground">
                    <Target className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">
                      Clique em "Gerar" para criar uma análise clínica detalhada do paciente.
                    </p>
                  </div>
                )}
              </ScrollArea>

              {insights.completion && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    Gerado agora
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => insights.generate()}
                    disabled={insights.isGenerating}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Regenerar
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// EXPORT ABBREVIATED VERSION
// ============================================================================

interface AIAssistantMiniProps {
  patientId: string;
  patientName: string;
}

export function AIAssistantMini({ patientId, patientName }: AIAssistantMiniProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      )}

      {/* Full panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] z-50">
          <AIAssistantPanel patientId={patientId} patientName={patientName} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="absolute -top-8 right-0"
          >
            Fechar
          </Button>
        </div>
      )}
    </>
  );
}
