import { useState } from "react";
import { BrainCircuit, Search, FileText, RefreshCw, BookOpen, ExternalLink, Award, Sparkles } from "lucide-react";
import { aiSearchApi, type AskResponse } from "@/api/v2/aiSearch";
import { evidenceApi, type EvidenceArticle } from "@/api/v2/evidence";
import { usePermissions } from "@/hooks/usePermissions";

const WIKI_SUGGESTIONS = [
  "exercícios para dor lombar crônica",
  "protocolo de reabilitação do manguito rotador",
  "progressão de carga em tendinopatia",
];

const PUBMED_ORTHO_QUICK = [
  "anterior cruciate ligament rehabilitation guideline",
  "rotator cuff tendinopathy exercise evidence",
  "lumbar radiculopathy physical therapy CPG",
  "knee osteoarthritis exercise biomechanics",
  "achilles tendinopathy load progression",
];

export default function KnowledgeAsk() {
  const { isAdmin } = usePermissions();
  const [searchMode, setSearchMode] = useState<"wiki" | "pubmed">("wiki");
  const [q, setQ] = useState("");
  const [res, setRes] = useState<AskResponse | null>(null);
  const [pubmedResults, setPubmedResults] = useState<EvidenceArticle[]>([]);
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
      let msg = `Reindexação enfileirada: ${total} itens processando em segundo plano.`;
      try {
        const s = await aiSearchApi.reindexStatus();
        msg += ` Status atual — erros: ${s.errors}, processando: ${s.pending}.`;
      } catch {
        /* status é opcional */
      }
      setReindexMsg(msg);
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
    setPubmedResults([]);

    try {
      if (searchMode === "wiki") {
        setRes(await aiSearchApi.ask(query));
      } else {
        const data = await evidenceApi.search(query, 8);
        setPubmedResults(data.data || []);
      }
    } catch (e) {
      setError((e as Error).message ?? "Falha ao consultar a base");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 font-[Nunito,sans-serif]">
      {/* Header com Modos */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Conhecimento & Pesquisa Científica</h1>
            <p className="text-sm text-slate-500">RAG da Clínica (D1) e Diretrizes PubMed Nível Ouro (Cloudflare AI + Neon).</p>
          </div>
        </div>

        {/* Selector de Modo */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => { setSearchMode("wiki"); setRes(null); setPubmedResults([]); }}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              searchMode === "wiki" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            Wiki da Clínica
          </button>
          <button
            onClick={() => { setSearchMode("pubmed"); setRes(null); setPubmedResults([]); }}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              searchMode === "pubmed" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award className="h-3.5 w-3.5 text-emerald-600" />
            PubMed Ouro (Evidência Live)
          </button>
        </div>

        {isAdmin && searchMode === "wiki" && (
          <button
            onClick={reindex}
            disabled={reindexing}
            title="Reindexa protocolos, exercícios e wiki em segundo plano"
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reindexing ? "animate-spin" : ""}`} />
            {reindexing ? "Enfileirando…" : "Reindexar RAG"}
          </button>
        )}
      </header>

      {reindexMsg && (
        <p className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 border border-blue-200">
          {reindexMsg}
        </p>
      )}

      {/* Form de Busca */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="mb-6 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              searchMode === "wiki"
                ? "Pergunte sobre protocolos, testes e exercícios da clínica…"
                : "Busque literatura médica no PubMed (ex: ACL rehabilitation, tendinopathy, knee CPG)…"
            }
            className="w-full rounded-xl border border-slate-200 bg-white py-3 left-10 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading || q.trim().length < 3}
          className={`rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-sm transition disabled:opacity-40 ${
            searchMode === "wiki" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading ? "Buscando…" : "Pesquisar"}
        </button>
      </form>

      {/* Sugestões Rápidas */}
      {!loading && !res && pubmedResults.length === 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          {searchMode === "wiki" ? (
            <>
              <span className="font-bold text-slate-400">Sugestões Wiki:</span>
              {WIKI_SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50">{s}</button>
              ))}
            </>
          ) : (
            <>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <Award className="h-3 w-3" /> Fisioterapia Ortopédica (Evidência Ouro):
              </span>
              {PUBMED_ORTHO_QUICK.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 font-semibold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100">{s}</button>
              ))}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {loading && <p className="text-sm text-slate-500">Consultando a base…</p>}

      {/* Resultado Wiki (RAG) */}
      {res && searchMode === "wiki" && (
        <div className="space-y-5">
          {res.answered && res.answer ? (
            <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-800">
              {res.answer}
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Não encontrei nada confiável na base para essa pergunta.
            </p>
          )}

          {res.sources?.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Fontes ({res.sources.length})</h2>
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

      {/* Resultado PubMed */}
      {searchMode === "pubmed" && pubmedResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold tracking-wider text-emerald-800 uppercase flex items-center gap-1.5">
              <Award className="h-4 w-4 text-emerald-600" /> Artigos PubMed — Nível de Evidência Ouro
            </h2>
            <span className="text-xs text-slate-400">{pubmedResults.length} resultados</span>
          </div>

          <div className="space-y-3">
            {pubmedResults.map((art) => (
              <div key={art.pmid} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 transition">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-800">PMID: {art.pmid}</span>
                    {art.study_type && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{art.study_type}</span>
                    )}
                  </div>
                  {art.pub_date && <span className="text-xs font-medium text-slate-400">{art.pub_date}</span>}
                </div>
                <h3 className="text-base font-extrabold text-slate-800 leading-snug">{art.title}</h3>
                {art.journal && <p className="mt-1 text-xs font-bold text-slate-500 italic">{art.journal}</p>}
                {art.abstract && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-4 bg-slate-50 p-3 rounded-xl border border-slate-100">{art.abstract}</p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400">NCBI PubMed Database</span>
                  <a href={`https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 hover:underline">
                    Ver no PubMed <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchMode === "pubmed" && !loading && pubmedResults.length === 0 && q.length >= 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500 font-semibold">Nenhum artigo encontrado no PubMed para esta pesquisa.</p>
          <p className="text-xs text-slate-400 mt-1">Tente termos em inglês como "anterior cruciate ligament", "rotator cuff", "lumbar spine CPG".</p>
        </div>
      )}
    </div>
  );
}

