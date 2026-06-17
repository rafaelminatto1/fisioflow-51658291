import { useEffect, useState, useCallback } from "react";
import { Activity, Workflow, CalendarCheck, RefreshCw } from "lucide-react";
import { eventsApi, type ActivityFeedItem } from "@/api/v2";

const STATUS_STYLE: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  triggered: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  failed: "bg-red-50 text-red-700",
};

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const diff = Math.max(0, Date.now() - d);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function EventMonitorPage() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.feed();
      setItems(res.data ?? []);
    } catch (e) {
      setError((e as Error).message ?? "Falha ao carregar atividades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // tempo real (polling 30s)
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 font-[Nunito,sans-serif]">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Monitor de Atividades</h1>
            <p className="text-sm text-slate-500">Automações e integrações da clínica, em tempo real.</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </header>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {!loading && items.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
          Nenhuma atividade ainda. Automações e syncs aparecem aqui.
        </div>
      )}

      <ol className="space-y-2">
        {items.map((it, i) => {
          const Icon = it.kind === "automation" ? Workflow : CalendarCheck;
          const badge = STATUS_STYLE[it.status] ?? "bg-slate-100 text-slate-600";
          return (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{it.title}</div>
                <div className="text-xs text-slate-400">
                  {it.kind === "automation" ? "Automação" : "Google Calendar"} · {timeAgo(it.at)}
                </div>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${badge}`}>{it.status}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
