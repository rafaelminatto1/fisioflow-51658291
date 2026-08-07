import { useState, useRef, useEffect } from "react";
import {
  BrainCircuit,
  X,
  Send,
  Sparkles,
  User,
  BookOpen,
  Calendar,
  Stethoscope,
  FileText,
  Minimize2,
  Maximize2,
  RefreshCw,
  Filter,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { copilotApi } from "@/api/v2/communications";
import { patientsApi } from "@/api/v2/patients";
import type { PatientRow } from "@/types/workers";

type FilterCategory = "all" | "clinical" | "pubmed" | "agenda";
type AIModelOption = "llama_3_3_70b" | "deepseek_r1" | "qwen_2_5_72b" | "llama_3_1_8b";

const MODEL_OPTIONS: Record<AIModelOption, { label: string; badge: string; desc: string }> = {
  llama_3_3_70b: { label: "Llama 3.3 (70B)", badge: "OURO 70B", desc: "Padrão Ouro • Cloudflare Edge" },
  deepseek_r1: { label: "DeepSeek R1 (32B)", badge: "REASONING", desc: "Raciocínio Clínico • Cloudflare Edge" },
  qwen_2_5_72b: { label: "Qwen 2.5 (72B)", badge: "MULTI 72B", desc: "Análise Ampla • Cloudflare Edge" },
  llama_3_1_8b: { label: "Llama 3.1 (8B)", badge: "SPEED 8B", desc: "Respostas Ultrarrápidas" },
};

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  category?: FilterCategory;
  modelUsed?: AIModelOption;
}

const CATEGORY_PROMPTS: Record<FilterCategory, string[]> = {
  all: [
    "🦴 Protocolo LCA (Semanas 1-4)",
    "🎯 Manguito Rotador CPG",
    "⚡ Critérios Retorno Esporte",
    "📅 Próximas Sessões @paciente",
  ],
  clinical: [
    "🦴 Protocolo Pós-Op LCA (Semanas 1-4)",
    "🎯 Tendinopatia de Ombro CPG 2026",
    "🧘 Manejo Conservador Hérnia L4-L5",
    "⚡ Testes Específicos Joelho / Menisco",
  ],
  pubmed: [
    "🔬 Últimas evidências Osteoartrite Joelho",
    "📖 Meta-análise Exercício Terapêutico Lombalgia",
    "📑 Diretrizes RCT Reabilitação Tendão de Aquiles",
    "🧪 Nível de Evidência Terapia Manual",
  ],
  agenda: [
    "📅 Consultar consultas agendadas de hoje",
    "👤 Buscar prontuário recente de @paciente",
    "🕒 Próximas sessões de fisioterapia",
    "📊 Resumo do dia e atendimentos",
  ],
};

export function GlobalAIChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [selectedModel, setSelectedModel] = useState<AIModelOption>("llama_3_3_70b");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Olá! Sou o Assistente de Inteligência da clínica. Você pode escolher qual motor de IA processará sua consulta (Llama 3.3 70B, DeepSeek R1, Qwen 2.5 ou Llama 3.1) no seletor do topo! Como posso ajudar?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      modelUsed: "llama_3_3_70b",
    },
  ]);

  // Autocomplete de paciente com @
  const [patientMatches, setPatientMatches] = useState<PatientRow[]>([]);
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  // Handler de input e menção @paciente
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    const match = val.match(/@([\w\s]*)$/);
    if (match) {
      const term = match[1].trim();
      if (term.length >= 1) {
        patientsApi
          .list({ search: term, limit: 5 })
          .then((res) => {
            setPatientMatches(res.data || []);
            setShowPatientMenu(true);
          })
          .catch(() => {
            setPatientMatches([]);
            setShowPatientMenu(false);
          });
      } else {
        setPatientMatches([]);
        setShowPatientMenu(true);
      }
    } else {
      setShowPatientMenu(false);
    }
  };

  const selectPatient = (patient: PatientRow) => {
    const newInput = input.replace(/@[\w\s]*$/, `@${patient.full_name} `);
    setInput(newInput);
    setShowPatientMenu(false);
  };

  const sendMessage = async (textToSend?: string) => {
    const rawQuery = (textToSend ?? input).trim();
    if (!rawQuery || loading) return;

    // Prefixa contexto se houver filtro selecionado
    let formattedQuery = rawQuery;
    if (activeCategory === "clinical") {
      formattedQuery = `[Filtro: Protocolos Clínicos] ${rawQuery}`;
    } else if (activeCategory === "pubmed") {
      formattedQuery = `[Filtro: PubMed Evidências] ${rawQuery}`;
    } else if (activeCategory === "agenda") {
      formattedQuery = `[Filtro: Agenda e Pacientes] ${rawQuery}`;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: rawQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      category: activeCategory,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowPatientMenu(false);
    setLoading(true);

    try {
      // Envia requisição com o modelo escolhido pelo usuário para o backend Cloudflare Workers AI
      const res = await copilotApi.chat([{ role: "user", content: formattedQuery }], selectedModel);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.answer || "Consulta concluída com sucesso.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        category: activeCategory,
        modelUsed: selectedModel,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "Desculpe, ocorreu uma falha no motor de IA selecionado. Tente mudar o modelo no topo ou reenviar.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-[Nunito,sans-serif] print:hidden">
      {/* Botão Flutuante quando fechado - APENAS O ÍCONE DA COR AZUL DA CLÍNICA */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-95"
          title="Abrir Copiloto Clínico IA (Selecione o Motor no topo)"
        >
          <BrainCircuit className="h-7 w-7 text-white transition-transform group-hover:rotate-12" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-sky-300 border-2 border-white dark:border-slate-950" />
          </span>
        </button>
      )}

      {/* Drawer / Mini-Chat Expandido */}
      {open && (
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-3xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl transition-all duration-300",
            minimized ? "h-16 w-80" : "h-[580px] w-96 max-w-[calc(100vw-2rem)]",
          )}
        >
          {/* Header do Widget - Azul da Clínica com Seletor de Motor IA */}
          <div className="flex items-center justify-between border-b border-blue-900/40 bg-blue-900 px-4 py-2.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30 shrink-0">
                <BrainCircuit className="h-4 w-4" />
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white">FisioFlow AI</h3>
                  <Badge className="border-0 bg-blue-500/30 text-[8px] font-extrabold uppercase text-sky-200 px-1 py-0">
                    {MODEL_OPTIONS[selectedModel].badge}
                  </Badge>
                </div>

                {/* Seletor de Motor de IA */}
                <div className="flex items-center gap-1 mt-0.5">
                  <Cpu className="h-3 w-3 text-sky-300 shrink-0" />
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as AIModelOption)}
                    className="bg-blue-950/80 text-sky-100 text-[10px] font-extrabold rounded-md px-1.5 py-0.5 outline-none border border-blue-700/60 focus:border-sky-400 cursor-pointer"
                    title="Escolha de onde virá a resposta da IA"
                  >
                    <option value="llama_3_3_70b">Llama 3.3 (70B) • Padrão Ouro</option>
                    <option value="deepseek_r1">DeepSeek R1 (32B) • Raciocínio</option>
                    <option value="qwen_2_5_72b">Qwen 2.5 (72B) • Análise Ampla</option>
                    <option value="llama_3_1_8b">Llama 3.1 (8B) • Ultrarrápido</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <button
                type="button"
                onClick={() => setMinimized((prev) => !prev)}
                className="rounded-lg p-1.5 hover:bg-blue-800 hover:text-white transition"
                title={minimized ? "Expandir" : "Minimizar"}
              >
                {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 hover:bg-blue-800 hover:text-white transition"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo de Mensagens (Oculto se minimizado) */}
          {!minimized && (
            <>
              {/* Barra de Filtros de Categoria */}
              <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-2 overflow-x-auto">
                <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ml-1 shrink-0" />
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all flex items-center gap-1",
                    activeCategory === "all"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  Todos
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory("clinical")}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all flex items-center gap-1",
                    activeCategory === "clinical"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
                  )}
                >
                  <Stethoscope className="h-3 w-3" />
                  Clínico & CPG
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory("pubmed")}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all flex items-center gap-1",
                    activeCategory === "pubmed"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
                  )}
                >
                  <BookOpen className="h-3 w-3" />
                  PubMed
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory("agenda")}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all flex items-center gap-1",
                    activeCategory === "agenda"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  Agenda & @
                </button>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40 dark:bg-slate-900/30">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col max-w-[85%] text-xs leading-relaxed transition-all",
                      m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl p-3 shadow-xs",
                        m.sender === "user"
                          ? "bg-blue-600 text-white rounded-br-none font-medium"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none font-normal",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] text-slate-400 font-semibold">{m.timestamp}</span>
                      {m.sender === "ai" && m.modelUsed && (
                        <Badge className="border-0 bg-blue-100 dark:bg-blue-900/40 text-[8px] font-black text-blue-700 dark:text-blue-300 uppercase px-1 py-0">
                          {MODEL_OPTIONS[m.modelUsed]?.label || m.modelUsed}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-700 dark:text-blue-300 font-bold w-fit shadow-xs">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    Processando via {MODEL_OPTIONS[selectedModel].label}...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Chips por Categoria */}
              <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 overflow-x-auto flex gap-1.5">
                {CATEGORY_PROMPTS[activeCategory].map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => sendMessage(qp)}
                    className="shrink-0 rounded-lg border border-blue-200 dark:border-slate-800 bg-blue-50/50 dark:bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-blue-900 dark:text-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white transition"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Menu de Autocomplete de Paciente (@paciente) */}
              {showPatientMenu && (
                <div className="border-t border-blue-200 bg-blue-50/95 dark:bg-slate-900 p-2 max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-extrabold uppercase text-blue-800 dark:text-blue-400 mb-1 px-1">
                    Selecione o Paciente (Neon DB):
                  </p>
                  {patientMatches.length === 0 ? (
                    <p className="text-[11px] text-slate-500 px-1">Nenhum paciente encontrado...</p>
                  ) : (
                    patientMatches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="w-full text-left px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-blue-200/60 dark:hover:bg-blue-900/60 rounded-md flex items-center justify-between"
                      >
                        <span>{p.full_name}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{p.main_condition || "Ortopedia"}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Form de Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-950"
              >
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder={`Perguntar ao ${MODEL_OPTIONS[selectedModel].label}... (ou @paciente)`}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !input.trim()}
                  className="h-8 w-8 rounded-xl bg-blue-600 p-0 text-white hover:bg-blue-700 disabled:opacity-40 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

