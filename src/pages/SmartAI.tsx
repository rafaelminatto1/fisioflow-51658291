import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Send, User, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SmartAI = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o assistente inteligente de fisioterapia. Posso ajudar com recomendações de exercícios, orientações sobre tratamentos, análise de sintomas e muito mais. Como posso ajudar você hoje?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    'Quais exercícios são recomendados para dor lombar?',
    'Como tratar tendinite no ombro?',
    'Qual a frequência ideal de sessões?',
    'Orientações para recuperação pós-cirúrgica'
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simular resposta da IA
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(input),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setLoading(false);
    }, 1500);
  };

  const generateAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('dor lombar') || lowerQuery.includes('lombar')) {
      return 'Para dor lombar, recomendo:\n\n1. **Alongamento de Gato-Vaca**: 3 séries de 10 repetições\n2. **Ponte**: 3 séries de 15 repetições\n3. **Prancha**: 3 séries de 30 segundos\n4. **Alongamento do Piriforme**: 3 séries de 30 segundos cada lado\n\n**Importante**: Estes exercícios devem ser realizados sem dor. Se houver desconforto, interrompa e consulte seu fisioterapeuta.';
    }
    
    if (lowerQuery.includes('tendinite') || lowerQuery.includes('ombro')) {
      return 'Para tendinite no ombro, o tratamento geralmente inclui:\n\n1. **Repouso relativo**: Evite movimentos repetitivos que causam dor\n2. **Crioterapia**: Aplicar gelo por 15-20 minutos, 3-4x ao dia\n3. **Exercícios de Codman**: Movimentos pendulares suaves\n4. **Fortalecimento gradual**: Iniciar após redução da inflamação\n\n**Recomendação**: Consulte um fisioterapeuta para avaliação personalizada e tratamento adequado.';
    }
    
    if (lowerQuery.includes('frequência') || lowerQuery.includes('sessões')) {
      return 'A frequência ideal de sessões de fisioterapia depende de vários fatores:\n\n• **Fase aguda**: 3-5x por semana\n• **Fase subaguda**: 2-3x por semana\n• **Fase de manutenção**: 1-2x por semana\n\nFatores considerados:\n- Gravidade da condição\n- Objetivos do tratamento\n- Resposta ao tratamento\n- Disponibilidade do paciente\n\nSeu fisioterapeuta personalizará a frequência conforme sua evolução.';
    }
    
    return 'Obrigado pela sua pergunta. Para uma resposta mais precisa e personalizada, recomendo que você:\n\n1. Agende uma avaliação com um fisioterapeuta\n2. Descreva seus sintomas em detalhes\n3. Informe seu histórico médico relevante\n\nCada caso é único e requer avaliação profissional adequada. Posso ajudar com informações gerais, mas o diagnóstico e tratamento devem ser feitos presencialmente.';
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Smart AI</h1>
              <p className="text-muted-foreground">
                Assistente inteligente para fisioterapia
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            IA Ativa
          </Badge>
        </section>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este assistente fornece informações gerais. Para diagnóstico e tratamento, consulte sempre um profissional qualificado.
          </AlertDescription>
        </Alert>

        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Conversa</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-secondary" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {messages.length === 1 && (
              <div className="px-6 pb-4">
                <p className="text-sm text-muted-foreground mb-2">Perguntas sugeridas:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto py-2 px-3"
                      onClick={() => handleSuggestionClick(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite sua pergunta sobre fisioterapia..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="min-h-[60px] resize-none"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="h-[60px] w-[60px]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SmartAI;