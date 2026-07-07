import { useEffect, useMemo, useState } from "react";
import { request } from "@/api/v2/base";
import { PageLayout } from "@/components/layout/PageLayout";

interface Section {
  key: string;
  label: string;
  rows?: Record<string, unknown>[];
  error?: string;
}

interface LakeResponse {
  configured?: boolean;
  message?: string;
  sections?: Record<string, Section>;
}

/** Parseia a string JSON da coluna `value` e desembrulha o nível extra {value:{...}}. */
function parseEvent(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") return (raw as Record<string, unknown>) ?? {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const inner = obj?.value;
    return (inner && typeof inner === "object" ? inner : obj) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function topCounts(events: Record<string, unknown>[], field: string, limit = 15) {
  const counts = new Map<string, number>();
  for (const e of events) {
    const k = e[field] == null ? "(vazio)" : String(e[field]);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function CountTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, n]) => (
              <tr key={k} className="border-b last:border-0">
                <td className="truncate py-1">{k}</td>
                <td className="py-1 text-right font-semibold tabular-nums">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function EventsLakePage() {
  const [data, setData] = useState<LakeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    request<LakeResponse>("/api/events-lake")
      .then((r) => alive && setData(r))
      .catch((e) => alive && setErr((e as Error)?.message ?? "Falha ao carregar"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const total = data?.sections?.total;
  const recent = data?.sections?.recent;
  const recentRows = recent?.rows ?? [];

  const events = useMemo(() => recentRows.map((r) => parseEvent(r.value)), [recentRows]);
  const byEvent = useMemo(() => topCounts(events, "event"), [events]);
  const byRoute = useMemo(() => topCounts(events, "route"), [events]);

  const totalCount = total?.rows?.[0]?.total ?? total?.rows?.[0]?.["total"] ?? "—";

  return (
    <PageLayout>
      <div className="flex flex-col gap-4 p-4">
        <header>
          <h1 className="text-2xl font-black">Data Lake de Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Analytics do stream de eventos via R2 Data Catalog (Iceberg) + R2 SQL — sem tocar no banco transacional.
          </p>
        </header>

        {loading && <p className="text-muted-foreground">Carregando…</p>}
        {err && <p className="text-red-600">Erro: {err}</p>}

        {data?.configured === false && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold">Data lake ainda não configurado</p>
            <p className="mt-1 text-sm">{data.message}</p>
          </div>
        )}

        {total?.error && <p className="text-amber-600">R2 SQL: {total.error.slice(0, 160)}</p>}

        {data?.configured && total && !total.error && (
          <>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total de eventos no data lake</p>
              <p className="text-3xl font-black">{String(totalCount)}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <CountTable title="Eventos por tipo (amostra recente)" rows={byEvent} />
              <CountTable title="Eventos por rota (amostra recente)" rows={byRoute} />
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-bold">Eventos recentes</h2>
              {recent?.error ? (
                <p className="text-xs text-amber-600">Indisponível: {recent.error.slice(0, 120)}</p>
              ) : recentRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem eventos ainda (o batch do Iceberg grava a cada ~5 min).</p>
              ) : (
                <ul className="flex flex-col gap-1 text-xs">
                  {recentRows.slice(0, 50).map((row, i) => {
                    const ev = parseEvent(row.value);
                    return (
                      <li key={i} className="flex justify-between gap-3 border-b py-1">
                        <span className="truncate font-mono">
                          {String(ev.event ?? "—")} · {String(ev.route ?? "")}
                        </span>
                        <span className="whitespace-nowrap text-muted-foreground">
                          {String(row.__ingest_ts ?? "").replace("T", " ").slice(0, 19)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
