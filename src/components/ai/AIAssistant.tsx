import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, ThumbsUp, ThumbsDown, Loader2, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

import { useToast } from '@/hooks/use-toast';
import { aiOrchestrator } from '@/services/ai/AIOrchestrator';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  source?: string;
  confidence?: number;
  provider?: string;
  queryId?: string;
}

interface AIAssistantProps {
  patientId?: string;
  context?: {
    patientName?: string;
    diagnosis?: string;
    currentPage?: string;
  };
}

export function AIAssistant({ patientId, context }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Mensagem de boas-vindas contextual
      const welcomeMessage = getWelcomeMessage();
      setMessages([{
        id: Date.now().toString(),
        text: welcomeMessage,
        isUser: false,
        timestamp: new Date(),
        source: 'system',
        confidence: 1
      }]);
    }
  }, [isOpen, messages.length, getWelcomeMessage]);

  const getWelcomeMessage = useCallback(() => {
    if (patientId && context?.patientName) {
      return `👋 Olá! Sou seu assistente de IA para fisioterapia.\n\nEstou aqui para ajudar com **${context.patientName}**.\n\nPosso auxiliar com:\n• Sugestões de protocolos\n• Diagnóstico diferencial\n• Progressão de exercícios\n• Interpretação de sintomas\n• Orientações clínicas\n\nComo posso ajudar você hoje?`;
    }

    return `🧠 **Assistente de IA FisioFlow**\n\nOlá! Sou seu assistente inteligente especializado em fisioterapia.\n\n**Minhas especialidades:**\n• Protocolos de tratamento\n• Exercícios terapêuticos\n• Diagnóstico diferencial\n• Orientações clínicas\n• Casos complexos\n\nFaça sua pergunta e eu te ajudo com base na melhor evidência científica disponível!`;
  }, [patientId, context?.patientName]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const queryContext = {
        patientId,
        userId: user?.id,
        category: inferCategory(inputValue),
        priority: 'medium' as const
      };

      const response = await aiOrchestrator.query(inputValue, queryContext);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        source: response.source,
        confidence: response.confidence,
        provider: response.provider,
        queryId: `query_${Date.now()}`
      };

      setMessages(prev => [...prev, aiMessage]);

      // Toast de feedback sobre a fonte
      const sourceMessages = {
        'knowledge_base': '💡 Resposta da base de conhecimento interna',
        'cache': '⚡ Resposta do cache inteligente',
        'provider': `🤖 Resposta de ${response.provider?.toUpperCase()}`,
        'fallback': '📚 Resposta baseada em diretrizes gerais'
      };

      toast({
        description: sourceMessages[response.source] || 'Resposta gerada',
        duration: 2000
      });

    } catch (error) {
      console.error('AI query error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente ou reformule sua consulta.',
        isUser: false,
        timestamp: new Date(),
        source: 'error',
        confidence: 0
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Erro no assistente',
        description: 'Não foi possível processar sua pergunta',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inferCategory = (query: string): string => {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('protocolo') || queryLower.includes('tratamento')) {
      return 'protocolo';
    }
    if (queryLower.includes('exercicio') || queryLower.includes('exercitar')) {
      return 'exercicio';
    }
    if (queryLower.includes('diagnostico') || queryLower.includes('sintoma')) {
      return 'diagnostico';
    }
    
    return 'geral';
  };

  const handleRating = async (messageId: string, rating: 'up' | 'down') => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.queryId) return;

    try {
      const numericRating = rating === 'up' ? 5 : 2;
      await aiOrchestrator.rateResponse(message.queryId, numericRating);
      
      setShowFeedback(messageId);
      setTimeout(() => setShowFeedback(null), 2000);

      toast({
        description: rating === 'up' ? '👍 Obrigado pelo feedback!' : '👎 Feedback registrado, vamos melhorar!',
        duration: 2000
      });
    } catch (error) {
      console.error('Error rating response:', error);
    }
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'knowledge_base': return 'default';
      case 'cache': return 'secondary';
      case 'provider': return 'outline';
      default: return 'destructive';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'knowledge_base': return '💡';
      case 'cache': return '⚡';
      case 'provider': return '🤖';
      default: return '📚';
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        aria-label="Abrir Assistente de IA"
      >
        <Brain className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-primary text-primary-foreground">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <CardTitle className="text-lg">Assistente IA</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.text}
                  </div>
                  
                  {!message.isUser && message.source && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSourceBadgeVariant(message.source)} className="text-xs">
                          {getSourceIcon(message.source)} {message.source}
                        </Badge>
                        
                        {message.confidence !== undefined && (
                          <span className="text-xs opacity-60">
                            {Math.round(message.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRating(message.id, 'up')}
                          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRating(message.id, 'down')}
                          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {showFeedback === message.id && (
                    <div className="text-xs mt-1 text-green-600">
                      ✓ Feedback registrado
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground rounded-lg p-3 flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processando...</span>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua pergunta..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground mt-2">
            Usando IA econômica • Base de conhecimento + Cache inteligente
          </div>
        </div>
      </CardContent>
    </Card>
  );
}