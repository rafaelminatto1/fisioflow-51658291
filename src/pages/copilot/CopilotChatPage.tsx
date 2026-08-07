import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Stethoscope, Wrench, Cpu } from "lucide-react";
import { copilotApi, type CopilotChatMessage } from "@/api/v2";
import { Badge } from "@/components/ui/badge";

type AIModelOption = "llama_3_3_70b" | "deepseek_r1" | "qwen_2_5_72b" | "llama_3_1_8b";

const MODEL_OPTIONS: Record<AIModelOption, { label: string; badge: string; desc: string }> = {
  llama_3_3_70b: { label: "Llama 3.3 (70B)", badge: "OURO 70B", desc: "Padrão Ouro • Cloudflare Edge" },
  deepseek_r1: { label: "DeepSeek R1 (32B)", badge: "REASONING", desc: "Raciocínio Clínico • Cloudflare Edge" },
  qwen_2_5_72b: { label: "Qwen 2.5 (72B)", badge: "MULTI 72B", desc: "Análise Ampla • Cloudflare Edge" },
  llama_3_1_8b: { label: "Llama 3.1 (8B)", badge: "SPEED 8B", desc: "Respostas Ultrarrápidas" },
};

type ChatTurn = CopilotChatMessage & { tools?: string[]; modelUsed?: AIModelOption };

const SUGGESTIONS = [
  "🦴 Protocolo Nível Ouro: Pós-operatório de Reconstrução do LCA (Semanas 1 a 4)",
  "🎯 Evidências CPG: Exercícios isométricos vs isotônicos em Tendinopatia do Manguito Rotador",
  "🧘 Diretrizes Clínicas: Manejo fisioterapêutico para Hérnia Discal Lumbar L4-L5 com Radiculopatia",
  "⚡ Protocolo de Alfredson Modificado para Tendinopatia de Aquiles com Progressão de Carga",
  "🦵 Criteriosa Avaliação de Biofeedback e Fortalecimento de Quadríceps na Osteoartrite de Joelho",
];

export default function CopilotChatPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModelOption>("llama_3_3_70b");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const next: ChatTurn[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await copilotApi.chat(
        next.map(({ role, content }) => ({ role, content })),
        selectedModel,
      );
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer || "—",
          tools: (res.toolCalls ?? []).map((t) => t.name),
          modelUsed: selectedModel,
        },
      ]);
    } catch (e) {
      setError((e as Error).message ?? "Falha ao falar com o copiloto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col font-[Nunito,sans-serif]">
      {/* Header com Seletor de Motor IA */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Copiloto Clínico & PubMed
              <Badge className="border-0 bg-blue-100 dark:bg-blue-900/50 text-[9px] font-black text-blue-700 dark:text-blue-300 uppercase">
                {MODEL_OPTIONS[selectedModel].badge}
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evidência científica, diretrizes CPG e prontuários — alimentado por Cloudflare Workers AI.
            </p>
          </div>
        </div>

        {/* Seletor de Motor de IA */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 shadow-xs">
          <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as AIModelOption)}
            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            title="Escolha o Motor de IA"
          >
            <option value="llama_3_3_70b">Llama 3.3 (70B) • Padrão Ouro</option>
            <option value="deepseek_r1">DeepSeek R1 (32B) • Raciocínio</option>
            <option value="qwen_2_5_72b">Qwen 2.5 (72B) • Análise Ampla</option>
            <option value="llama_3_1_8b">Llama 3.1 (8B) • Ultrarrápido</option>
          </select>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="mt-10 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="mb-5 text-slate-500 dark:text-slate-400 font-medium">
              Pergunte algo clínico. O copiloto consulta o motor <span className="font-bold text-blue-600">{MODEL_OPTIONS[selectedModel].label}</span> e busca evidências no PubMed e prontuários.
            </p>
            <div className="mx-auto flex max-w-2xl flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-bl-none"
              }`}
            >
              {m.content}
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 text-[11px]">
                {m.tools && m.tools.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {m.tools.map((t, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-bold text-slate-600 dark:text-slate-300"
                      >
                        <Wrench className="h-3 w-3" /> {t}
                      </span>
                    ))}
                  </div>
                ) : <span />}

                {m.role === "assistant" && m.modelUsed && (
                  <Badge className="border-0 bg-blue-100 dark:bg-blue-900/40 text-[8px] font-black text-blue-700 dark:text-blue-300 uppercase px-1.5 py-0.5">
                    {MODEL_OPTIONS[m.modelUsed]?.label || m.modelUsed}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-blue-700 dark:text-blue-300 font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-spin text-blue-600" />
              Processando via {MODEL_OPTIONS[selectedModel].label}…
            </div>
          </div>
        )}
        {error && <p className="text-center text-sm text-red-600 font-bold">{error}</p>}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={`Pergunte ao copiloto clínico usando ${MODEL_OPTIONS[selectedModel].label}…`}
            className="max-h-32 flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 shadow-xs"
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          O copiloto usa ferramentas (PubMed/evidência/exercícios/paciente) com Cloudflare Workers AI. Sempre confira condutas clínicas.
        </p>
      </div>
    </div>
  );
}

