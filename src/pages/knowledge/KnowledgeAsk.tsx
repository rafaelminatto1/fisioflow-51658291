import { useState } from "react";
import { BrainCircuit, Search, FileText, RefreshCw } from "lucide-react";
import { aiSearchApi, type AskResponse } from "@/api/v2/aiSearch";
import { usePermissions } from "@/hooks/usePermissions";

const SUGGESTIONS = [
  "exercícios para dor lombar crônica",
  "protocolo de reabilitação do manguito rotador",
  "progressão de carga em tendinopatia",
];

export default function KnowledgeAsk() {
  const { isAdmin } = usePermissions();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexMsg, setReindexMsg] = useState<string | null>(null);

  async function reindex() {
    if (reindexing) return;
    setReindexing(true);
    setReindexMsg(null);
    try {
      const r = await aiSearchApi.reindex();
      const total = Object.values(r.enqueued).reduce((a, b) => a + b, 0);
      setReindexMsg(`Reindexação enfileirada: ${total} itens processando em segundo plano.`);
    } catch (e) {
      setReindexMsg((e as Error).message ?? "Falha ao enfileirar reindexação");
    } finally {
      setReindexing(false);
    }
  }

  async function ask(text: string) {
    const query = text.trim();
    if (query.length < 3 || loading) return;
    setQ(query);
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      setRes(await aiSearchApi.ask(query));
    } catch (e) {
      setError((e as Error).message ?? "Falha ao consultar a base");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 font-[Nunito,sans-serif]">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <BrainCircuit className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold text-slate-800">Base de Conhecimento (IA)</h1>
          <p className="text-sm text-slate-500">RAG sobre a wiki e exercícios da clínica (AutoRAG).</p>
        </div>
        {isAdmin && (
          <button
            onClick={reindex}
            disabled={reindexing}
            title="Reindexa protocolos, exercícios e wiki em segundo plano"
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${reindexing ? "animate-spin" : ""}`} />
            {reindexing ? "Enfileirando…" : "Reindexar base"}
          </button>
        )}
      </header>

      {reindexMsg && (
        <p className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
          {reindexMsg}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pergunte à base de conhecimento…"
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <button type="submit" disabled={loading || q.trim().length < 3} className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">
          {loading ? "…" : "Perguntar"}
        </button>
      </form>

      {!res && !loading && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50">
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-slate-500">Consultando a base…</p>}

      {res && (
        <div>
          {res.answered && res.answer ? (
            <div className="mb-5 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-800">
              {res.answer}
            </div>
          ) : (
            <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Não encontrei nada confiável na base para essa pergunta.
            </p>
          )}

          {res.sources?.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Fontes</h2>
              <ul className="space-y-2">
                {res.sources.map((s, i) => (
                  <li key={s.id ?? i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{s.filename ?? s.id}</p>
                      {s.content && <p className="line-clamp-2 text-xs text-slate-500">{s.content}</p>}
                    </div>
                    {typeof s.score === "number" && (
                      <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                        {Math.round(s.score * 100)}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
