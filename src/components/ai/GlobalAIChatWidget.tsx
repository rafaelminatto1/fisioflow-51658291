import { useState, useRef, useEffect } from "react";
import {
  BrainCircuit,
  X,
  Send,
  Sparkles,
  User,
  BookOpen,
  Award,
  Minimize2,
  Maximize2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { copilotApi } from "@/api/v2/communications";
import { patientsApi } from "@/api/v2/patients";
import type { PatientRow } from "@/types/workers";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  sources?: string[];
}

const QUICK_PROMPTS = [
  "🦴 Protocolo LCA (Semanas 1-4)",
  "🎯 Manguito Rotador: CPG Evidência",
  "🧘 Hérnia Discal L4-L5 Manejo",
  "⚡ Critérios de Retorno ao Esporte",
];

export function GlobalAIChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Olá! Sou seu Copiloto Clínico com busca live no PubMed e dados do sistema. Como posso ajudar seu atendimento hoje? (Dica: digite @ para mencionar um paciente)",
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
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowPatientMenu(false);
    setLoading(true);

    try {
      const res = await copilotApi.chat(query);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.answer || "Consulta concluída com sucesso.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "Desculpe, ocorreu uma falha ao consultar o motor de IA. Verifique sua conexão ou tente novamente.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-[Nunito,sans-serif] print:hidden">
      {/* Botão Flutuante quando fechado */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex h-14 items-center gap-3 rounded-full bg-slate-900 px-5 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/30"
          title="Abrir Copiloto Clínico de IA (Cmd+K)"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white shadow-md transition-transform group-hover:rotate-12">
            <BrainCircuit className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-300" />
            </span>
          </span>

          <div className="text-left">
            <p className="text-xs font-black tracking-wide text-teal-300">COPILOTO IA</p>
            <p className="text-[11px] font-bold text-slate-300">FisioFlow Intelligence</p>
          </div>

          <Badge className="ml-1 border-0 bg-teal-500/20 text-[9px] font-extrabold uppercase text-teal-300">
            PRO
          </Badge>
        </button>
      )}

      {/* Drawer / Mini-Chat Expandido */}
      {open && (
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl transition-all duration-300",
            minimized ? "h-16 w-80" : "h-[540px] w-96 max-w-[calc(100vw-2rem)]",
          )}
        >
          {/* Header do Widget */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm">
                <BrainCircuit className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-black text-white">Copiloto Clínico & PubMed</h3>
                <p className="text-[10px] font-semibold text-teal-300 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Gemini 1.5 Flash • Neon DB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setMinimized((prev) => !prev)}
                className="rounded-lg p-1.5 hover:bg-slate-800 hover:text-white"
              >
                {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo de Mensagens (Oculto se minimizado) */}
          {!minimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/30">
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
                        "rounded-2xl p-3 shadow-sm",
                        m.sender === "user"
                          ? "bg-teal-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none",
                      )}
                    >
                      <p className="whitespace-pre-wrap font-medium">{m.text}</p>
                    </div>
                    <span className="mt-1 text-[10px] text-slate-400 px-1">{m.timestamp}</span>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 p-3 text-xs text-teal-700 font-bold w-fit shadow-sm">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-600" />
                    Consultando PubMed & Prontuários...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Chips */}
              <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 overflow-x-auto flex gap-1.5">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => sendMessage(qp)}
                    className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 transition"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Menu de Autocomplete de Paciente (@paciente) */}
              {showPatientMenu && (
                <div className="border-t border-slate-200 bg-teal-50/90 p-2 max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-extrabold uppercase text-teal-800 mb-1 px-1">
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
                        className="w-full text-left px-2 py-1 text-xs font-bold text-slate-800 hover:bg-teal-200/60 rounded-md flex items-center justify-between"
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
                  placeholder="Pergunte ao Copiloto (ou digite @paciente)..."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !input.trim()}
                  className="h-8 w-8 rounded-xl bg-teal-600 p-0 text-white hover:bg-teal-700 disabled:opacity-40"
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
