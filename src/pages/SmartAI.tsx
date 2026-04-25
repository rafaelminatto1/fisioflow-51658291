import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Send,
  User,
  Bot,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Library,
  FileText,
} from "lucide-react";
import remarkGfm from "remark-gfm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { useAiSearch, type AiSource } from "@/hooks/useAiSearch";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isRag?: boolean;
  sources?: AiSource[];
}

export const SmartAIContent = () => {
  const location = useLocation();
  const state = location.state as {
    initialQuery?: string;
    initialResult?: string;
    initialSources?: AiSource[];
  } | null;

  const [messages, setMessages] = useState<Message[]>(() => {
    const defaultMessage: Message = {
      id: "1",
      role: "assistant",
      content:
        "Olá! Sou o assistente inteligente de fisioterapia da Activity. Posso ajudar com recomendações de exercícios, orientações sobre tratamentos, análise de sintomas e muito mais. Como posso ajudar você hoje?",
      timestamp: new Date(),
    };

    if (state?.initialQuery && state?.initialResult) {
      return [
        defaultMessage,
        {
          id: "initial-user",
          role: "user",
          content: state.initialQuery,
          timestamp: new Date(),
          isRag: true,
        },
        {
          id: "initial-assistant",
          role: "assistant",
          content: state.initialResult,
          timestamp: new Date(),
          isRag: true,
          sources: state.initialSources,
        },
      ];
    }

    return [defaultMessage];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { search: aiSearch, loading: searching } = useAiSearch();

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestedQuestions = [
    "Quais exercícios são recomendados para dor lombar?",
    "Como tratar tendinite no ombro?",
    "Qual a frequência ideal de sessões?",
    "Orientações para recuperação pós-cirúrgica",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSearch = async () => {
    if (!input.trim() || searching || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      isRag: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuery = input;
    setInput("");
    setLoading(true);

    try {
      const result = await aiSearch(currentQuery);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          result?.response ||
          "Nenhuma informação encontrada na base de conhecimento para esta consulta.",
        timestamp: new Date(),
        isRag: true,
        sources: result?.data,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      logger.error("Erro na busca RAG", error, "SmartAI");
      toast({
        title: "Erro na busca",
        description: "Não foi possível consultar a base de conhecimento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = await getNeonAccessToken();
      const CHAT_URL = `${getWorkersApiUrl()}/api/ai/chat`;

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (response.status === 429) {
        toast({
          title: "Limite excedido",
          description: "Muitas requisições. Aguarde alguns instantes.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (response.status === 402) {
        toast({
          title: "Créditos insuficientes",
          description: "Entre em contato com o suporte.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("Falha ao iniciar stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      // Criar mensagem do assistente imediatamente
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg.role === "assistant") {
                  lastMsg.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush final
      if (textBuffer.trim()) {
        for (const raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "" || !raw.startsWith("data: "))
            continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg.role === "assistant") {
                  lastMsg.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (error) {
      logger.error("Erro no chat AI", error, "SmartAI");
      toast({
        title: "Erro",
        description: "Não foi possível processar sua mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <section className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Smart AI</h1>
            <p className="text-muted-foreground">Assistente inteligente para fisioterapia</p>
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
          Este assistente fornece informações gerais. Para diagnóstico e tratamento, consulte sempre
          um profissional qualificado.
        </AlertDescription>
      </Alert>

      {/* Educational Banner - AI Gateway */}
      <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="text-xl leading-none">🛡️</div>
          <AlertDescription className="text-sm">
            <strong className="block mb-0.5">IA Segura e Otimizada:</strong>
            Nossa inteligência artificial agora conta com um 'escudo' (Gateway) próprio. Consultas
            clínicas idênticas são devolvidas em milissegundos graças à memória temporária, e os
            dados dos pacientes têm uma barreira de proteção extra antes de tocar nos motores de IA.
          </AlertDescription>
        </div>
      </Alert>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Conversa</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.isRag ? "bg-amber-100 dark:bg-amber-950/30" : "bg-primary/10",
                      )}
                    >
                      {message.isRag ? (
                        <Library className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-4 py-2",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                      message.isRag &&
                        message.role === "assistant" &&
                        "border-l-4 border-amber-500",
                    )}
                  >
                    {message.role === "assistant" && message.isRag && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <Library className="w-3 h-3" />
                        Resposta da Base de Conhecimento
                      </div>
                    )}
                    {message.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="relative group/content">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover/content:opacity-100 transition-opacity bg-background/50 backdrop-blur-sm shadow-sm"
                          onClick={() => handleCopy(message.content, message.id)}
                          title="Copiar resposta"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                        <div className="text-sm prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:p-2 prose-pre:rounded-md prose-headings:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ _node, ...props }) => (
                                <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0" {...props} />
                              ),
                              h2: ({ _node, ...props }) => (
                                <h2 className="text-base font-bold mt-3 mb-2" {...props} />
                              ),
                              h3: ({ _node, ...props }) => (
                                <h3 className="text-sm font-bold mt-2 mb-1" {...props} />
                              ),
                              p: ({ _node, ...props }) => (
                                <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                              ),
                              ul: ({ _node, ...props }) => (
                                <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />
                              ),
                              ol: ({ _node, ...props }) => (
                                <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />
                              ),
                              li: ({ _node, ...props }) => <li className="pl-1" {...props} />,
                              strong: ({ _node, ...props }) => (
                                <strong className="font-bold text-foreground" {...props} />
                              ),
                              code: ({ _node, ...props }) => (
                                <code
                                  className="bg-muted-foreground/20 rounded px-1 py-0.5 font-mono text-xs"
                                  {...props}
                                />
                              ),
                              blockquote: ({ _node, ...props }) => (
                                <blockquote
                                  className="border-l-4 border-primary/30 pl-4 italic my-2 text-muted-foreground"
                                  {...props}
                                />
                              ),
                              a: ({ _node, ...props }) => (
                                <a target="_blank" rel="noopener noreferrer" {...props} />
                              ),
                              table: ({ _node, ...props }) => (
                                <div className="overflow-x-auto my-4 rounded-md border">
                                  <table className="w-full text-sm text-left" {...props} />
                                </div>
                              ),
                              thead: ({ _node, ...props }) => (
                                <thead
                                  className="bg-muted text-muted-foreground font-medium"
                                  {...props}
                                />
                              ),
                              tbody: ({ _node, ...props }) => (
                                <tbody className="divide-y" {...props} />
                              ),
                              tr: ({ _node, ...props }) => (
                                <tr className="hover:bg-muted/50 transition-colors" {...props} />
                              ),
                              th: ({ _node, ...props }) => (
                                <th className="px-4 py-2 font-medium" {...props} />
                              ),
                              td: ({ _node, ...props }) => <td className="px-4 py-2" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>

                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-amber-200/30 dark:border-amber-900/30">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Fontes consultadas:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {message.sources.map((source, sIdx) => (
                                <Badge
                                  key={sIdx}
                                  variant="outline"
                                  className="text-[9px] bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 text-amber-700 dark:text-amber-300 font-medium py-0 h-5"
                                >
                                  {source.filename} ({(source.score * 100).toFixed(0)}%)
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {message.role === "user" && (
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
                      <div
                        className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
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
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="min-h-[60px] resize-none"
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading || searching}
                  size="icon"
                  className="h-[30px] w-[60px]"
                  title="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSearch}
                  disabled={!input.trim() || loading || searching}
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-[30px] w-[60px] border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800",
                    searching && "animate-pulse",
                  )}
                  title="Buscar na base de conhecimento"
                >
                  <Library className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
