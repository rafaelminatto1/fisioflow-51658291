import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Bot,
  X,
  Send,
  User,
  FileText,
  Zap,
  BrainCircuit,
  History,
  ChevronRight,
  Loader2,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getWorkersApiUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";

interface AgentHubProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SimulatorProfile = {
  age: number;
  painLevel: number;
  motivationLevel: "high" | "medium" | "low";
  condition: string;
  personaTraits: string[];
};

type SimulationEvaluation = {
  score: number;
  gradeLabel: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missedQuestions: string[];
  clinicalReasoningFeedback: string;
  nextTrainingFocus: string[];
};

const AGENTS = [
  {
    id: "soap-review",
    name: "AI SOAP Reviewer",
    description: "Analise seus prontuários para garantir precisão clínica e faturamento otimizado.",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    prompt: "Olá! Cole seu texto do SOAP aqui e eu farei uma revisão técnica completa para você.",
  },
  {
    id: "simulator",
    name: "Simulador de Paciente",
    description: "Treine seu raciocínio clínico com casos simulados de alta complexidade.",
    icon: BrainCircuit,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    prompt:
      "Estou pronto para simular um paciente. Que tipo de patologia ou queixa você gostaria de avaliar hoje?",
  },
];

type Agent = (typeof AGENTS)[number];

const DEFAULT_SIMULATOR_PROFILE: SimulatorProfile = {
  age: 42,
  painLevel: 5,
  motivationLevel: "medium",
  condition: "Queixa musculoesquelética em avaliação",
  personaTraits: ["colaborativo", "preocupado com dor", "quer voltar à rotina"],
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function formatSoapReview(data: any): string {
  const suggestions = asStringArray(data?.suggestions);
  const improvedText = typeof data?.improvedText === "string" ? data.improvedText.trim() : "";
  const score = typeof data?.score === "number" ? data.score : null;

  const lines = [
    score == null ? null : `Nota da documentação: ${score}/100.`,
    suggestions.length > 0
      ? `Ajustes principais:\n${suggestions.map((item) => `- ${item}`).join("\n")}`
      : null,
    improvedText ? `Versão sugerida:\n${improvedText}` : null,
  ].filter(Boolean);

  return lines.join("\n\n") || "A revisão foi concluída, mas não retornou sugestões estruturadas.";
}

async function readJsonOrThrow(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Falha ao chamar agente.";
    throw new Error(message);
  }
  return payload;
}

export const AgentHub: React.FC<AgentHubProps> = ({ isOpen, onClose }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [evaluation, setEvaluation] = useState<SimulationEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [simulatorProfile, setSimulatorProfile] =
    useState<SimulatorProfile>(DEFAULT_SIMULATOR_PROFILE);

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedAgent || isTyping || isEvaluating) return;

    const userMessage = { role: "user" as const, content: input };
    const previousMessages = messages;
    const nextMessages = [...previousMessages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);
    setEvaluation(null);

    try {
      if (selectedAgent.id === "soap-review") {
        const response = await fetch(`${getWorkersApiUrl()}/api/agents/soap-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userMessage.content }),
        });
        const payload = await readJsonOrThrow(response);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: formatSoapReview(payload.data) },
        ]);
        return;
      }

      const profile =
        previousMessages.length === 0
          ? { ...DEFAULT_SIMULATOR_PROFILE, condition: userMessage.content }
          : simulatorProfile;

      if (previousMessages.length === 0) setSimulatorProfile(profile);

      const response = await fetch(`${getWorkersApiUrl()}/api/agents/simulator/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          chatHistory: previousMessages,
          agentLastMessage: userMessage.content,
        }),
      });
      const payload = await readJsonOrThrow(response);
      const simulatedMessage =
        typeof payload?.data?.simulatedMessage === "string"
          ? payload.data.simulatedMessage
          : "Não consegui gerar uma resposta do paciente agora.";
      const safetyPrefix = payload?.data?.safetyTriggered
        ? "Atenção de segurança: conduta potencialmente insegura detectada.\n\n"
        : "";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `${safetyPrefix}${simulatedMessage}` },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao chamar agente.";
      toast.error(message);
      setMessages((prev) => prev.filter((msg) => msg !== userMessage));
    } finally {
      setIsTyping(false);
    }
  };

  const handleEvaluateSimulation = async () => {
    if (!selectedAgent || selectedAgent.id !== "simulator" || messages.length === 0) return;

    setIsEvaluating(true);
    try {
      const response = await fetch(`${getWorkersApiUrl()}/api/agents/simulator/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: simulatorProfile,
          chatHistory: messages,
        }),
      });
      const payload = await readJsonOrThrow(response);
      setEvaluation(payload.data as SimulationEvaluation);
      toast.success("Avaliação da simulação concluída.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao avaliar simulação.";
      toast.error(message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setSelectedAgent(null);
    setInput("");
    setEvaluation(null);
    setSimulatorProfile(DEFAULT_SIMULATOR_PROFILE);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="fixed top-0 bottom-0 right-0 md:top-12 w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl z-[250] flex flex-col border-l border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-muted dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bot className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                  AGENT<span className="text-blue-500">HUB</span>
                </h2>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                  Inteligência Clínica Ativa
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedAgent && (
                <>
                  {selectedAgent.id === "simulator" && messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEvaluateSimulation}
                      disabled={isTyping || isEvaluating}
                      className="text-slate-600 hover:text-blue-600 gap-2 h-8"
                    >
                      {isEvaluating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5" />
                      )}
                      Finalizar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetChat}
                    className="text-slate-500 hover:text-red-500 gap-2 h-8"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full h-8 w-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {!selectedAgent ? (
              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    Com qual Agente você gostaria de trabalhar hoje?
                  </h3>
                  <p className="text-slate-500 font-medium">
                    Nossos modelos foram treinados especificamente para a rotina da fisioterapia.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {AGENTS.map((agent) => (
                    <motion.div
                      key={agent.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        className="cursor-pointer border-slate-100 dark:border-slate-800 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all bg-muted dark:bg-slate-900/50 group overflow-hidden"
                        onClick={() => {
                          setSelectedAgent(agent);
                          setMessages([]);
                          setInput("");
                          setEvaluation(null);
                          setSimulatorProfile(DEFAULT_SIMULATOR_PROFILE);
                        }}
                      >
                        <CardContent className="p-6 flex items-center gap-6">
                          <div
                            className={cn(
                              "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                              agent.bg,
                            )}
                          >
                            <agent.icon className={cn("w-8 h-8", agent.color)} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                                {agent.name}
                              </h4>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed">
                              {agent.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">
                      Atividade Recente
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 italic">
                      Nenhuma conversa salva recentemente.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Interface */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <Badge
                        variant="outline"
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 py-1 px-3"
                      >
                        Você está conversando com {selectedAgent.name}
                      </Badge>
                    </div>

                    {selectedAgent.id === "simulator" && messages.length > 0 && (
                      <div className="mx-auto max-w-[85%] rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                              Caso em simulação
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {simulatorProfile.condition}
                            </p>
                          </div>
                          <Badge className="bg-emerald-600 text-white">
                            {simulatorProfile.painLevel}/10 dor
                          </Badge>
                        </div>
                      </div>
                    )}

                    {messages.length === 0 && (
                      <div className="flex gap-4 max-w-[85%]">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            selectedAgent.bg,
                          )}
                        >
                          <selectedAgent.icon className={cn("w-4 h-4", selectedAgent.color)} />
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none">
                          <p className="text-sm text-slate-800 dark:text-slate-200">
                            {selectedAgent.prompt}
                          </p>
                        </div>
                      </div>
                    )}

                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-4 max-w-[85%]",
                          msg.role === "user" ? "ml-auto flex-row-reverse" : "",
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            msg.role === "user" ? "bg-blue-600" : selectedAgent.bg,
                          )}
                        >
                          {msg.role === "user" ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <selectedAgent.icon className={cn("w-4 h-4", selectedAgent.color)} />
                          )}
                        </div>
                        <div
                          className={cn(
                            "p-4 rounded-2xl",
                            msg.role === "user"
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm",
                          )}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))}

                    {evaluation && (
                      <div className="max-w-[92%] rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/40 dark:bg-slate-900">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                              Relatório da avaliação
                            </p>
                            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                              Nota {evaluation.score}/100
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                              {evaluation.summary}
                            </p>
                          </div>
                          <Badge className="bg-blue-600 text-white uppercase">
                            {evaluation.gradeLabel}
                          </Badge>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
                            <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">
                              Pontos fortes
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                              {evaluation.strengths.map((item, index) => (
                                <li key={index}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20">
                            <p className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">
                              Pontos a melhorar
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                              {evaluation.weaknesses.map((item, index) => (
                                <li key={index}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            <p className="text-xs font-black uppercase">Perguntas que faltaram</p>
                          </div>
                          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                            {evaluation.missedQuestions.map((item, index) => (
                              <li key={index}>- {item}</li>
                            ))}
                          </ul>
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {evaluation.clinicalReasoningFeedback}
                        </p>
                      </div>
                    )}

                    {isTyping && (
                      <div className="flex gap-4">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 animate-pulse",
                            selectedAgent.bg,
                          )}
                        >
                          <selectedAgent.icon className={cn("w-4 h-4", selectedAgent.color)} />
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <div className="relative group">
                    <Input
                      placeholder={
                        selectedAgent.id === "soap-review"
                          ? "Cole seu SOAP aqui..."
                          : messages.length === 0
                            ? "Ex: dor patelofemoral ao subir escadas..."
                            : "Digite sua próxima pergunta clínica..."
                      }
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={isTyping || isEvaluating}
                      className="h-14 pl-6 pr-16 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl focus-visible:ring-blue-500/50 focus-visible:ring-offset-0 transition-all text-sm font-medium"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!input.trim() || isTyping || isEvaluating}
                      className="absolute right-2 top-2 h-10 w-10 bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-2">
                      <Badge
                        variant="ghost"
                        className="text-[9px] font-black uppercase text-slate-400 tracking-widest gap-1"
                      >
                        <Zap className="w-3 h-3 fill-amber-500 text-amber-500" /> AI Gateway
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Pressione Enter para enviar
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
