import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

/**
 * Data lake de eventos (R2 Data Catalog / Iceberg) consultado via R2 SQL.
 *
 * O stream de eventos (EVENTS_PIPELINE) é gravado como tabela Iceberg
 * `analytics.events` no bucket fisioflow-media (pipeline fisioflow_events_iceberg).
 * Este endpoint faz proxy de queries R2 SQL agregadas (admin-only) para o
 * frontend — o Worker não tem binding de R2 SQL, então chama a API REST com um
 * token dedicado (R2_SQL_TOKEN) com permissão "R2 Data Catalog Read" + "R2
 * Storage Read". Sem o secret, responde configured:false (no-op seguro).
 */
const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const ACCOUNT_ID = "32156f9a72a32d1ece28ab74bcd398fb";
const BUCKET = "fisioflow-media";
const R2_SQL_ENDPOINT = `https://api.sql.cloudflarestorage.com/api/v1/accounts/${ACCOUNT_ID}/r2-sql/query/${BUCKET}`;

async function r2Sql(token: string, query: string): Promise<unknown> {
  const res = await fetch(R2_SQL_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = (await res.json().catch(() => ({}))) as { errors?: unknown };
  if (!res.ok) {
    throw new Error(`R2 SQL ${res.status}: ${JSON.stringify(data?.errors ?? data).slice(0, 300)}`);
  }
  return data;
}

app.get("/", requireAuth, async (c) => {
  const role = c.get("user")?.role;
  if (role !== "admin" && role !== "owner") {
    return c.json({ error: "Apenas administradores" }, 403);
  }
  if (!c.env.R2_SQL_TOKEN) {
    return c.json({
      configured: false,
      message: "R2_SQL_TOKEN não configurado — o data lake de eventos fica indisponível até setar o secret.",
    });
  }
  try {
    const [total, recent] = await Promise.all([
      r2Sql(c.env.R2_SQL_TOKEN, "SELECT COUNT(*) AS total FROM analytics.events"),
      r2Sql(
        c.env.R2_SQL_TOKEN,
        "SELECT * FROM analytics.events ORDER BY __ingest_ts DESC LIMIT 50",
      ),
    ]);
    return c.json({ configured: true, total, recent });
  } catch (err) {
    return c.json({ configured: true, error: (err as Error).message }, 502);
  }
});

export default app;
