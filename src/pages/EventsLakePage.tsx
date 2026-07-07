import { useEffect, useState } from "react";
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

function firstNumber(rows?: Record<string, unknown>[]): string {
  const row = rows?.[0];
  if (!row) return "—";
  const v = row.total ?? Object.values(row)[0];
  return v == null ? "—" : String(v);
}

/** Tabela simples label→n para seções agregadas (byEvent/byRoute/byOrg). */
function AggTable({ section }: { section: Section }) {
  if (section.error) {
    return <p className="text-xs text-amber-600">{section.label}: indisponível ({section.error.slice(0, 80)})</p>;
  }
  const rows = section.rows ?? [];
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">{section.label}: sem dados.</p>;
  const keys = Object.keys(rows[0]);
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 font-bold">{section.label}</h2>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-1">{String(r[keys[0]] ?? "—")}</td>
              <td className="py-1 text-right font-semibold tabular-nums">{String(r[keys[1]] ?? "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

  const s = data?.sections;
  const recent = s?.recent;

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
            <p className="mt-2 text-sm">
              Crie um token Cloudflare de R2 com <strong>Admin Read only</strong> (R2 → Manage API Tokens) e rode{" "}
              <code className="rounded bg-amber-100 px-1">wrangler secret put R2_SQL_TOKEN --env production</code>.
            </p>
          </div>
        )}

        {data?.configured && s && (
          <>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total de eventos no data lake</p>
              <p className="text-3xl font-black">{firstNumber(s.total?.rows)}</p>
              {s.total?.error && <p className="mt-1 text-xs text-amber-600">{s.total.error.slice(0, 120)}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {s.byEvent && <AggTable section={s.byEvent} />}
              {s.byRoute && <AggTable section={s.byRoute} />}
              {s.byOrg && <AggTable section={s.byOrg} />}
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-bold">Eventos recentes</h2>
              {recent?.error ? (
                <p className="text-xs text-amber-600">Indisponível: {recent.error.slice(0, 120)}</p>
              ) : (recent?.rows ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem eventos ainda (o batch do Iceberg grava a cada ~5 min).</p>
              ) : (
                <ul className="flex flex-col gap-1 font-mono text-xs">
                  {(recent?.rows ?? []).slice(0, 50).map((row, i) => (
                    <li key={i} className="truncate border-b py-1">
                      {JSON.stringify(row)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
