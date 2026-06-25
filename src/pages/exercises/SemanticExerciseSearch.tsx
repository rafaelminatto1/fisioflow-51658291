import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, Dumbbell, BookOpen } from "lucide-react";
import { exercisesApi } from "@/api/v2/exercises";

type Result = {
  id: string;
  name?: string;
  description?: string;
  difficulty?: string;
  imageUrl?: string;
  image_url?: string;
  thumbnailUrl?: string;
  similarity?: number;
};

const SUGGESTIONS = [
  "fortalecimento de glúteo sem equipamento",
  "mobilidade de ombro pós-cirúrgico",
  "estabilização lombar para dor crônica",
  "propriocepção de tornozelo",
];

export default function SemanticExerciseSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(text: string) {
    const query = text.trim();
    if (query.length < 2 || loading) return;
    setQ(query);
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await exercisesApi.searchSemantic(query, 18);
      setResults((res.data ?? []) as Result[]);
    } catch (e) {
      setError((e as Error).message ?? "Falha na busca");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 font-[Nunito,sans-serif]">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">Busca Inteligente de Exercícios</h1>
          <p className="text-sm text-slate-500">Busca semântica (IA) — descreva o objetivo, não só o nome.</p>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
        className="mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: fortalecer glúteo médio em cadeia fechada…"
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || q.trim().length < 2}
          className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {!searched && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => run(s)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {searched && !loading && results.length === 0 && !error && (
        <p className="py-12 text-center text-slate-500">Nenhum exercício encontrado.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => {
          const img = r.thumbnailUrl || r.imageUrl || r.image_url;
          return (
            <div key={r.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex h-32 items-center justify-center bg-slate-50">
                {img ? (
                  <img src={img} alt={r.name ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <Dumbbell className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-slate-800">{r.name ?? "—"}</h3>
                  {typeof r.similarity === "number" && (
                    <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                      {Math.round(r.similarity * 100)}%
                    </span>
                  )}
                </div>
                {r.difficulty && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {r.difficulty}
                  </span>
                )}
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{r.description}</p>
                )}
                <Link
                  to={`/exercises/${r.id}/evidence`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Evidência
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
