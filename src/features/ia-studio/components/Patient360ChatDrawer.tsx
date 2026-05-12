import React, { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Send, User, Loader2, Bot, Sparkles, X } from "lucide-react";
import { request } from "@/api/v2/base";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thoughts?: string;
}

interface Patient360ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

export const Patient360ChatDrawer: React.FC<Patient360ChatDrawerProps> = ({
  open,
  onOpenChange,
  patientId,
  patientName,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Olá! Sou seu assistente clínico especializado. Carreguei o histórico completo de **${patientName}**. Como posso ajudar você a analisar este caso hoje?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPriming, setIsPriming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Prime the context when opening
  useEffect(() => {
    if (open && patientId) {
      const primeContext = async () => {
        setIsPriming(true);
        try {
          await request("/api/ai/patient-360/prime", {
            method: "POST",
            body: JSON.stringify({ patientId }),
          });
        } catch (error) {
          console.error("Failed to prime patient context", error);
        } finally {
          setIsPriming(false);
        }
      };
      primeContext();
    }
  }, [open, patientId]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isPriming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await request<{ success: boolean; answer: string; thoughts?: string }>(
        "/api/ai/patient-360/ask",
        {
          method: "POST",
          body: JSON.stringify({
            patientId,
            question: userMessage.content,
            thinkingLevel: "MEDIUM",
            includeThoughts: true,
          }),
        }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.answer,
        thoughts: res.thoughts,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erro no chat 360:", error);
      toast.error("Falha ao processar pergunta clínica.");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Desculpe, tive um problema ao consultar o histórico. Por favor, tente novamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] flex flex-col p-0 border-l border-indigo-100 dark:border-indigo-900/30 shadow-2xl">
        <SheetHeader className="p-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <SheetTitle className="text-xl font-black text-white">Patient 360° Chat</SheetTitle>
                <SheetDescription className="text-indigo-100 text-xs font-bold uppercase tracking-widest">
                  Análise Contextual: {patientName}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        {isPriming && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center gap-3 animate-pulse">
            <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-tighter">
              Carregando histórico clínico na memória da IA...
            </span>
          </div>
        )}

        <ScrollArea ref={scrollRef} className="flex-1 p-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-start gap-3",
                  m.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-xl shrink-0 shadow-sm",
                    m.role === "user" ? "bg-indigo-600" : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                  )}
                >
                  {m.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
                <div className="space-y-2 max-w-[85%]">
                  <div
                    className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-premium-sm",
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                    )}
                  >
                    {m.content}
                  </div>
                  {m.thoughts && (
                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 text-[10px] text-amber-700 dark:text-amber-500 italic">
                      <p className="font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Sparkles className="h-2 w-2" /> Raciocínio Clínico
                      </p>
                      {m.thoughts}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Consultando Prontuário Digital...
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex w-full items-center gap-3"
          >
            <Input
              placeholder="Ex: Como foi a evolução da ADM de joelho?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-2xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-12 px-4 text-sm focus-visible:ring-indigo-500"
              disabled={isLoading || isPriming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || isPriming || !input.trim()}
              className="h-12 w-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none shrink-0"
            >
              <Send className="h-5 w-5 text-white" />
            </Button>
          </form>
          <p className="mt-4 text-[9px] text-center text-slate-400 font-medium uppercase tracking-widest">
            IA Generativa treinada em contexto clínico de fisioterapia.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
