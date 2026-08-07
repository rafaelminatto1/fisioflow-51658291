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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { copilotApi } from "@/api/v2/communications";
import { patientsApi } from "@/api/v2/patients";
import type { PatientRow } from "@/types/workers";

type FilterCategory = "all" | "clinical" | "pubmed" | "agenda";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  category?: FilterCategory;
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Olá! Sou o Assistente de Inteligência da clínica, alimentado por Cloudflare Workers AI & Llama 3.3 70B com acesso ao PubMed e prontuários. Como posso ajudar agora? (Dica: use @ para buscar paciente)",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
      // Chama o backend Cloudflare Workers AI (/api/copilot/chat)
      const res = await copilotApi.chat([{ role: "user", content: formattedQuery }]);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.answer || "Consulta concluída com sucesso.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        category: activeCategory,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "Desculpe, ocorreu uma falha na resposta do Workers AI. Tente novamente.",
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
          title="Abrir Copiloto Clínico IA (Cloudflare Workers AI)"
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
            minimized ? "h-16 w-80" : "h-[560px] w-96 max-w-[calc(100vw-2rem)]",
          )}
        >
          {/* Header do Widget - Azul da Clínica */}
          <div className="flex items-center justify-between border-b border-blue-900/40 bg-blue-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30">
                <BrainCircuit className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  FisioFlow Intelligence
                  <Badge className="border-0 bg-blue-500/30 text-[8px] font-extrabold uppercase text-sky-200 px-1 py-0">
                    WORKERS AI
                  </Badge>
                </h3>
                <p className="text-[10px] font-bold text-sky-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                  Cloudflare Workers AI • Llama 3.3 70B • RAG
                </p>
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
                    <span className="mt-1 text-[10px] text-slate-400 px-1 font-semibold">{m.timestamp}</span>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-700 dark:text-blue-300 font-bold w-fit shadow-xs">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    Workers AI processando consulta...
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
                  placeholder={
                    activeCategory === "all"
                      ? "Pergunte ao Copiloto (ou digite @paciente)..."
                      : activeCategory === "clinical"
                      ? "Pergunte sobre condutas e CPGs..."
                      : activeCategory === "pubmed"
                      ? "Buscar evidencias no PubMed..."
                      : "Perguntar sobre agenda e paciente..."
                  }
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

