import { useEffect, useState, useCallback } from "react";
import { Check, X, Dumbbell, ExternalLink, ClipboardList } from "lucide-react";
import { exerciseImportApi, type ImportCandidate } from "@/api/v2/exercises";

export default function ExerciseCuration() {
  const [items, setItems] = useState<ImportCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await exerciseImportApi.candidates("pending");
      setItems(res.data ?? []);
    } catch (e) {
      setError((e as Error).message ?? "Falha ao carregar candidatos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = useCallback(async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      await (action === "approve" ? exerciseImportApi.approve(id) : exerciseImportApi.reject(id));
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError((e as Error).message ?? "Falha na ação");
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 font-[Nunito,sans-serif]">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">Curadoria de Exercícios</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Carregando…" : `${items.length} candidato(s) pendente(s) da importação`}
          </p>
        </div>
      </header>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {!loading && items.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
          Nada na fila. Todos os candidatos foram revisados. 🎉
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((c) => {
          const img = c.image_urls?.[0];
          const muscles = [...(c.muscles_primary ?? []), ...(c.muscles_secondary ?? [])].slice(0, 4);
          return (
            <div key={c.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                {img ? (
                  <img src={img} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <Dumbbell className="h-7 w-7 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-slate-800">{c.name}</h3>
                  {c.difficulty && (
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                      {c.difficulty}
                    </span>
                  )}
                </div>
                {muscles.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {muscles.map((m, i) => (
                      <span key={i} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                {c.instructions && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.instructions}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => act(c.id, "approve")}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" /> Aprovar
                  </button>
                  <button
                    onClick={() => act(c.id, "reject")}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" /> Rejeitar
                  </button>
                  {c.source_url && (
                    <a
                      href={c.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-blue-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {c.source ?? "fonte"}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
