import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

/**
 * Data lake de eventos (R2 Data Catalog / Iceberg) consultado via R2 SQL.
 *
 * O stream de eventos (EVENTS_PIPELINE) é gravado como tabela Iceberg
 * `analytics.events` no bucket fisioflow-media (pipeline fisioflow_events_iceberg).
 * Este endpoint faz proxy de várias queries R2 SQL de BI (admin-only) para o
 * frontend — o Worker não tem binding de R2 SQL, então chama a API REST com um
 * token dedicado (R2_SQL_TOKEN) com permissão de R2 "Admin Read only" (cobre
 * R2 Data Catalog Read + R2 Storage Read). Sem o secret → configured:false.
 *
 * Cada query é isolada: se uma falhar (ex.: coluna/JSON acesso não suportado no
 * schema atual), retorna só o erro dela sem derrubar as outras. Assim o schema
 * exato da coluna `value` (json) pode ser afinado sem quebrar o painel.
 */
const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const ACCOUNT_ID = "32156f9a72a32d1ece28ab74bcd398fb";
const BUCKET = "fisioflow-media";
const R2_SQL_ENDPOINT = `https://api.sql.cloudflarestorage.com/api/v1/accounts/${ACCOUNT_ID}/r2-sql/query/${BUCKET}`;

interface R2SqlResult {
  rows?: Record<string, unknown>[];
  result?: { rows?: Record<string, unknown>[] } | Record<string, unknown>[];
}

async function r2Sql(token: string, query: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(R2_SQL_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = (await res.json().catch(() => ({}))) as R2SqlResult & { errors?: unknown };
  if (!res.ok) {
    throw new Error(`R2 SQL ${res.status}: ${JSON.stringify(data?.errors ?? data).slice(0, 300)}`);
  }
  const rows =
    data.rows ??
    (Array.isArray(data.result) ? data.result : data.result?.rows) ??
    [];
  return rows as Record<string, unknown>[];
}

// Conjunto de queries de BI. Cada uma é isolada — se falhar, só ela some do painel.
// A coluna `value` é uma STRING JSON e o R2 SQL não tem função de extração JSON
// (json_extract_string/get_json_object não existem), então a agregação por
// tipo/rota é feita no FRONTEND parseando o value dos eventos recentes.
const BI_QUERIES: { key: string; label: string; sql: string }[] = [
  {
    key: "total",
    label: "Total de eventos",
    sql: "SELECT COUNT(*) AS total FROM analytics.events",
  },
  {
    // Série temporal: __ingest_ts é timestamp real, então o R2 SQL agrega por
    // dia NO SERVIDOR (eficiente, sobre TODO o histórico — não só a amostra).
    key: "byDay",
    label: "Eventos por dia",
    sql: "SELECT CAST(__ingest_ts AS DATE) AS day, COUNT(*) AS n FROM analytics.events GROUP BY day ORDER BY day LIMIT 90",
  },
  {
    key: "recent",
    label: "Eventos recentes",
    sql: "SELECT __ingest_ts, value FROM analytics.events ORDER BY __ingest_ts DESC LIMIT 200",
  },
];

app.get("/", requireAuth, async (c) => {
  const role = c.get("user")?.role;
  if (role !== "admin" && role !== "owner") {
    return c.json({ error: "Apenas administradores" }, 403);
  }
  const token = c.env.R2_SQL_TOKEN;
  if (!token) {
    return c.json({
      configured: false,
      message: "R2_SQL_TOKEN não configurado — o data lake de eventos fica indisponível até setar o secret.",
    });
  }

  const results = await Promise.all(
    BI_QUERIES.map(async (q) => {
      try {
        return { key: q.key, label: q.label, rows: await r2Sql(token, q.sql) };
      } catch (err) {
        return { key: q.key, label: q.label, error: (err as Error).message };
      }
    }),
  );

  const sections = Object.fromEntries(results.map((r) => [r.key, r]));
  return c.json({ configured: true, sections });
});

export default app;
