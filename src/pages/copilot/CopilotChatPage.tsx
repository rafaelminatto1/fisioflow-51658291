import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Stethoscope, Wrench } from "lucide-react";
import { copilotApi, type CopilotChatMessage } from "@/api/v2";

type ChatTurn = CopilotChatMessage & { tools?: string[] };

const SUGGESTIONS = [
  "Evidências sobre exercício para dor lombar crônica",
  "Exercícios de fortalecimento de glúteo sem equipamento",
  "Protocolo inicial para tendinopatia do manguito rotador",
];

export default function CopilotChatPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
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
      const res = await copilotApi.chat(next.map(({ role, content }) => ({ role, content })));
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.answer || "—", tools: (res.toolCalls ?? []).map((t) => t.name) },
      ]);
    } catch (e) {
      setError((e as Error).message ?? "Falha ao falar com o copiloto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-3xl flex-col font-[Nunito,sans-serif]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Stethoscope className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">Copiloto Clínico</h1>
          <p className="text-sm text-slate-500">Evidência, exercícios e histórico — com IA, em PT-BR.</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="mt-10 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="mb-5 text-slate-500">Pergunte algo clínico. O copiloto busca evidência e dados quando precisa.</p>
            <div className="mx-auto flex max-w-xl flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
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
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-800"
              }`}
            >
              {m.content}
              {m.tools && m.tools.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.tools.map((t, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                    >
                      <Wrench className="h-3 w-3" /> {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
              Pensando…
            </div>
          </div>
        )}
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 p-4">
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
            placeholder="Pergunte ao copiloto clínico…"
            className="max-h-32 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          O copiloto pode usar ferramentas (evidência/exercícios/paciente). Sempre confira condutas clínicas.
        </p>
      </div>
    </div>
  );
}
