import { useEffect, useState } from "react";
import { request } from "@/api/v2/base";
import { PageLayout } from "@/components/layout/PageLayout";

interface LakeResponse {
  configured?: boolean;
  message?: string;
  error?: string;
  total?: unknown;
  recent?: unknown;
}

/** R2 SQL retorna algo como {result:{rows:[...]}} ou {rows:[...]}. Extrai defensivamente. */
function extractRows(payload: unknown): Record<string, unknown>[] {
  if (!payload) return [];
  const p = payload as Record<string, unknown>;
  const candidates = [p.rows, (p.result as Record<string, unknown>)?.rows, p.result, payload];
  for (const c of candidates) if (Array.isArray(c)) return c as Record<string, unknown>[];
  return [];
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

  const totalRow = extractRows(data?.total)[0];
  const total = totalRow ? String(totalRow.total ?? Object.values(totalRow)[0] ?? "—") : "—";
  const recent = extractRows(data?.recent);

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
              Crie um token Cloudflare com <strong>R2 Data Catalog Read</strong> + <strong>R2 Storage Read</strong> e
              rode <code className="mx-1 rounded bg-amber-100 px-1">wrangler secret put R2_SQL_TOKEN --env production</code>.
            </p>
          </div>
        )}

        {data?.error && <p className="text-red-600">R2 SQL: {data.error}</p>}

        {data?.configured && !data.error && (
          <>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total de eventos no data lake</p>
              <p className="text-3xl font-black">{total}</p>
            </div>
            <div className="overflow-x-auto rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-bold">Eventos recentes</h2>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem eventos ainda (o batch do Iceberg grava a cada ~5 min).
                </p>
              ) : (
                <ul className="flex flex-col gap-1 font-mono text-xs">
                  {recent.slice(0, 50).map((row, i) => (
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
