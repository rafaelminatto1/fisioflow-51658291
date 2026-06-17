import { useEffect, useState } from "react";
import { Sun, CalendarDays, UserX, AlarmClockOff } from "lucide-react";
import { briefingApi, type DailyBriefing } from "@/api/v2";

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendados",
  atendido: "Atendidos",
  confirmado: "Confirmados",
  cancelado: "Cancelados",
  faltou: "Faltas",
  avaliacao: "Avaliações",
};

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Sun;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="text-3xl font-extrabold text-slate-800">{value}</div>
    </div>
  );
}

export default function BriefingDashboardPage() {
  const [data, setData] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await briefingApi.get());
      } catch (e) {
        setError((e as Error).message ?? "Falha ao carregar o briefing");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 font-[Nunito,sans-serif]">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-white">
          <Sun className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Briefing do dia</h1>
          <p className="text-sm text-slate-500">{data?.date ?? "Carregando…"}</p>
        </div>
      </header>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-slate-500">Carregando…</p>}

      {data && (
        <>
          <p className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{data.summary}</p>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi icon={CalendarDays} label="Atendimentos hoje" value={data.total} tone="bg-blue-50 text-blue-600" />
            <Kpi icon={AlarmClockOff} label="Faltas ontem" value={data.noShowsYesterday} tone="bg-red-50 text-red-600" />
            <Kpi icon={UserX} label="Inativos (30d+)" value={data.inactivePatients} tone="bg-slate-100 text-slate-600" />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-800">Agenda de hoje por status</h2>
            {Object.keys(data.countsByStatus).length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum atendimento agendado para hoje.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {Object.entries(data.countsByStatus).map(([s, n]) => (
                  <li key={s} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-bold text-slate-800">{n}</span>{" "}
                    <span className="text-slate-500">{STATUS_LABEL[s] ?? s}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
