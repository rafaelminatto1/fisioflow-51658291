import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Search, Plus, Trash2, ExternalLink } from "lucide-react";
import { evidenceApi, type EvidenceArticle, type EvidenceLink } from "@/api/v2/evidence";
import { exercisesApi } from "@/api/v2/exercises";

export default function ExerciseEvidence() {
  const { id = "" } = useParams<{ id: string }>();
  const [exerciseName, setExerciseName] = useState<string>("");
  const [links, setLinks] = useState<EvidenceLink[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<EvidenceArticle[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    try {
      const res = await evidenceApi.links("exercise", id);
      setLinks(res.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    exercisesApi
      .get(id)
      .then((r) => setExerciseName((r.data as { name?: string })?.name ?? ""))
      .catch(() => {});
    loadLinks();
  }, [id, loadLinks]);

  const search = useCallback(async (text: string) => {
    const query = text.trim();
    if (query.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const res = await evidenceApi.search(query, 8);
      setResults(res.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }, []);

  const linkArticle = useCallback(
    async (pmid: string) => {
      try {
        await evidenceApi.save({ pmid, targetType: "exercise", targetId: id });
        await loadLinks();
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [id, loadLinks],
  );

  const unlink = useCallback(
    async (linkId: string) => {
      try {
        await evidenceApi.removeLink(linkId);
        setLinks((prev) => prev.filter((l) => l.id !== linkId));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [],
  );

  const linkedPmids = new Set(links.map((l) => l.article_pmid));

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 font-[Nunito,sans-serif]">
      <Link to="/exercicios/busca-ia" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-blue-600">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <BookOpen className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">Evidência científica</h1>
          <p className="text-sm text-slate-500">{exerciseName || "Exercício"}</p>
        </div>
      </header>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {/* Vinculados */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold text-slate-800">Artigos vinculados ({links.length})</h2>
        {links.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
            Nenhum artigo vinculado. Busque abaixo e vincule.
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{l.title ?? l.article_pmid}</p>
                  <p className="text-xs text-slate-400">
                    {[l.journal, l.pub_date].filter(Boolean).join(" · ")} · PMID {l.article_pmid}
                  </p>
                </div>
                <button onClick={() => unlink(l.id)} className="shrink-0 rounded p-1 text-red-400 hover:bg-red-50" aria-label="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Buscar PubMed */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-800">Buscar evidência (PubMed)</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(q);
          }}
          className="mb-3 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: rotator cuff exercise"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <button type="submit" disabled={searching || q.trim().length < 2} className="rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">
            {searching ? "…" : "Buscar"}
          </button>
        </form>

        <ul className="space-y-2">
          {results.map((a) => {
            const linked = linkedPmids.has(a.pmid);
            return (
              <li key={a.pmid} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-400">
                    {[a.journal, a.pub_date, a.study_type].filter(Boolean).join(" · ")} · PMID {a.pmid}
                  </p>
                </div>
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`} target="_blank" rel="noreferrer" className="shrink-0 rounded p-1 text-slate-400 hover:text-blue-600" aria-label="Abrir no PubMed">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => linkArticle(a.pmid)}
                  disabled={linked}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> {linked ? "Vinculado" : "Vincular"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
