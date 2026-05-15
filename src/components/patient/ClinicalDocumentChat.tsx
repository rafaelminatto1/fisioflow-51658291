import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Send, User, Loader2, Bot } from "lucide-react";
import { request } from "@/api/v2/base";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ClinicalDocumentChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export const ClinicalDocumentChat: React.FC<ClinicalDocumentChatProps> = ({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Olá! Sou seu assistente clínico. Analisei o documento **"${documentTitle}"**. Como posso ajudar você a interpretar este exame hoje?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await request<{ success: boolean; answer: string }>("/api/ai/document/chat", {
        method: "POST",
        body: JSON.stringify({
          documentId,
          message: userMessage.content,
        }),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erro no chat com documento:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Desculpe, tive um problema ao processar sua pergunta. Por favor, tente novamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="p-6 bg-brand-blue text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">Chat com Exame</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-medium">
                Interpretando: {documentTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 p-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-start gap-3 max-w-[85%]",
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0",
                    m.role === "user"
                      ? "bg-brand-blue"
                      : "bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700",
                  )}
                >
                  {m.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-brand-blue" />
                  )}
                </div>
                <div
                  className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-brand-blue text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analisando laudo...
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex w-full items-center gap-3"
          >
            <Input
              placeholder="Ex: O que diz sobre a cartilagem? Há indicação cirúrgica?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-full bg-slate-50 dark:bg-slate-800 border-none h-12 px-6"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="h-12 w-12 rounded-full bg-brand-blue hover:bg-blue-700 shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
