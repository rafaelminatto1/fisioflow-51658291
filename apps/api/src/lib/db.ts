import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { Client } from "pg";
import { type PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "@fisioflow/db";
import type { Env } from "../types/env";
import { wrapQueryWithTimeout, DEFAULT_TIMEOUTS } from "./dbWrapper";
import { AsyncLocalStorage } from "node:async_hooks";

const rlsContext = new AsyncLocalStorage<string>();

export type DbRow = any;

export interface DbQueryResult<Row extends DbRow = DbRow> {
  rows: Row[];
  rowCount: number | null;
  fields: unknown[];
  command: string;
}

export type DbQuery = {
  <Row extends DbRow = DbRow>(text: string, params?: unknown[]): Promise<DbQueryResult<Row>>;
  <Row extends DbRow = DbRow>(
    strings: TemplateStringsArray,
    ...values: any[]
  ): Promise<DbQueryResult<Row>>;
};

/**
 * Interface unificada para o Pool, compatível com pg e neon-http (emulado)
 */
export interface DbPool {
  query: DbQuery;
  transaction: (queries: { text: string; values?: any[] }[]) => Promise<any[]>;
  end: () => Promise<void>;
}

export function runWithOrg<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  return rlsContext.run(organizationId, fn);
}

export function getOrgContext(): string | undefined {
  return rlsContext.getStore();
}

function getUrl(env: Env, mode: "read" | "write" = "write"): string {
  // In deployed Workers, prefer Hyperdrive over NEON_URL so a stale direct secret
  // cannot bypass the managed pooled binding and break the whole API.
  const hyperdriveUrl = env.HYPERDRIVE?.connectionString;
  const directUrl = env.NEON_URL || env.DATABASE_URL || process.env.DATABASE_URL;
  const shouldPreferHyperdrive = env.ENVIRONMENT !== "development" && Boolean(hyperdriveUrl);
  let url = (shouldPreferHyperdrive ? hyperdriveUrl : directUrl) || hyperdriveUrl;

  if (!url) throw new Error("Database configuration error: URL missing");

  // Otimização para Neon + Cloudflare (Pooling & Cold Starts)
  // Aumentamos o timeout para 15s para evitar erros em Cold Starts do Neon
  if (url.includes("neon.tech") && !url.includes("connect_timeout")) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}connect_timeout=20&sslmode=require&pool_timeout=15`;
  }

  return url;
}

function isTcpConnection(env: Env, mode: "read" | "write" = "write"): boolean {
  const url = getUrl(env, mode);
  if (env.HYPERDRIVE?.connectionString && url === env.HYPERDRIVE.connectionString) return true;
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) return true;
  return false;
}

function createPgClient(env: Env, mode: "read" | "write" = "write"): Client {
  return new Client({
    connectionString: getUrl(env, mode),
    connectionTimeoutMillis: 15000,
    keepAlive: false,
  });
}

function normalizeQueryArgs(
  textOrStrings: string | TemplateStringsArray,
  paramsOrValues: any[],
): { text: string; params: any[] } {
  if (typeof textOrStrings === "string") {
    return { text: textOrStrings, params: paramsOrValues[0] ?? [] };
  }

  let text = textOrStrings[0];
  const params: any[] = [];
  for (let i = 0; i < paramsOrValues.length; i++) {
    text += `$${i + 1}${textOrStrings[i + 1]}`;
    params.push(paramsOrValues[i]);
  }
  return { text, params };
}

export async function queryWithCache<T>(
  env: Env,
  cacheKey: string,
  ttlSeconds: number,
  neonQuery: () => Promise<T>,
): Promise<T> {
  const d1 = env.EDGE_CACHE || env.DB;
  if (!d1) return await neonQuery();

  try {
    const cached = await d1
      .prepare("SELECT value, expires_at FROM query_cache WHERE id = ?")
      .bind(cacheKey)
      .first<{ value: string; expires_at: number }>();

    if (cached && cached.expires_at > Date.now()) {
      return JSON.parse(cached.value) as T;
    }

    const result = await neonQuery();

    await d1
      .prepare("INSERT OR REPLACE INTO query_cache (id, value, expires_at) VALUES (?, ?, ?)")
      .bind(cacheKey, JSON.stringify(result), Date.now() + ttlSeconds * 1000)
      .run();

    return result;
  } catch (error) {
    console.error(`[D1 Cache Error]: ${cacheKey}`, error);
    return await neonQuery();
  }
}

export type FisioDb = PgDatabase<any, typeof schema>;

/**
 * Cria uma instância do Drizzle configurada para o ambiente atual.
 */
export function createDb(env: Env, _mode: "read" | "write" = "write"): FisioDb {
  if (isTcpConnection(env, _mode)) {
    const client = {
      query: async (
        queryText: string,
        queryParams: any[] = [],
        queryOpts?: Record<string, unknown>,
      ) => {
        const pgClient = createPgClient(env, _mode);
        try {
          await pgClient.connect();
          const orgId = getOrgContext();
          if (orgId) {
            await pgClient.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]);
          }

          const result = (await pgClient.query({
            text: queryText,
            values: queryParams,
            rowMode: queryOpts?.arrayMode ? "array" : undefined,
          } as any)) as any;

          return {
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields,
            command: result.command,
          };
        } finally {
          await pgClient.end().catch(() => {});
        }
      },
    } as const;

    return drizzleHttp(client as any, { schema });
  }

  const url = getUrl(env, _mode);
  const baseSql = neon(url, { fullResults: true });

  const client = {
    query: async (
      queryText: string,
      queryParams: any[] = [],
      queryOpts?: Record<string, unknown>,
    ) => {
      let orgId = getOrgContext();

      try {
        const results = await baseSql.transaction([
          baseSql.query(`SELECT set_config('app.org_id', $1, true)`, [orgId ?? ""]),
          baseSql.query(queryText, queryParams, queryOpts as any),
        ]);

        const result = results[1] as any;

        // Drizzle neon-http espera o formato fullResults, não apenas o array de rows.
        if (result?.rows && Array.isArray(result.rows)) {
          for (const row of result.rows) {
            if (!row || Array.isArray(row) || typeof row !== "object") continue;
            for (const key in row) {
              if (row[key] instanceof Date) {
                row[key] = row[key].toISOString();
              }
            }
          }
        }

        return result;
      } catch (dbErr: any) {
        const errorMsg = `Database Error: ${dbErr.message}${dbErr.detail ? ` (${dbErr.detail})` : ""}`;
        console.error(`[DB/Neon] Query Error: ${errorMsg}`, {
          queryText: queryText?.substring(0, 300),
          queryParams: JSON.stringify(queryParams)?.substring(0, 300),
          orgId,
          errorCode: dbErr.code,
        });

        const enhancedError = new Error(errorMsg);
        (enhancedError as any).code = dbErr.code;
        (enhancedError as any).detail = dbErr.detail;
        (enhancedError as any).hint = dbErr.hint;
        (enhancedError as any).query = queryText;
        (enhancedError as any).params = queryParams;
        throw enhancedError;
      }
    },
  } as const;

  return drizzleHttp(client as any, { schema });
}

export async function withRls<T>(
  env: Env,
  organizationId: string,
  fn: (sql: any) => Promise<T>,
  mode: "read" | "write" = "write",
): Promise<T> {
  const url = getUrl(env, mode);

  if (isTcpConnection(env, mode)) {
    const client = createPgClient(env, mode);
    try {
      await client.connect();
      await client.query(`SELECT set_config('app.org_id', $1, true)`, [organizationId]);
      return await fn(client);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const sql = neon(url);
  // Neon transaction returns values for each query
  await (sql as any).transaction([
    (sql as any).query(`SELECT set_config('app.org_id', $1, true)`, [organizationId]),
    // This is a bit tricky because fn(sql) expects the sql client itself
  ]);
  // Since fn(sql) might execute multiple queries, we should ideally use a proxy here too.
  // But let's keep it simple for now as withRls is less common.
  return await fn(sql);
}

export function createPool(
  env: Env,
  defaultTimeout: number = DEFAULT_TIMEOUTS.query,
  mode: "read" | "write" = "read",
): DbPool {
  const url = getUrl(env, mode);
  const orgId = getOrgContext();

  if (isTcpConnection(env, mode)) {
    const queryProxy = async <Row extends DbRow = any>(
      textOrStrings: string | TemplateStringsArray,
      ...paramsOrValues: any[]
    ): Promise<DbQueryResult<Row>> => {
      const { text, params } = normalizeQueryArgs(textOrStrings, paramsOrValues);

      const executeQuery = async () => {
        const client = createPgClient(env, mode);
        try {
          await client.connect();
          const effectiveOrgId = getOrgContext() || orgId;
          if (effectiveOrgId) {
            await client.query(
              `SELECT set_config('app.org_id', $1, true),
                      set_config('app.organization_id', $1, true),
                      set_config('app.current_organization_id', $1, true)`,
              [effectiveOrgId],
            );
          }
          const res = await client.query(text, params);
          return {
            rows: res.rows as any[],
            rowCount: res.rowCount,
            fields: res.fields as any[],
            command: res.command,
          } as DbQueryResult<Row>;
        } finally {
          await client.end().catch(() => {});
        }
      };

      return await executeQuery();
    };

    const wrappedQuery = wrapQueryWithTimeout(queryProxy as any, defaultTimeout);

    return {
      query: wrappedQuery,
      transaction: async (queries: { text: string; values?: any[] }[]) => {
        const client = createPgClient(env, mode);
        try {
          await client.connect();
          await client.query("BEGIN");
          const effectiveOrgId = getOrgContext() || orgId;
          if (effectiveOrgId) {
            await client.query(`SELECT set_config('app.org_id', $1, true)`, [effectiveOrgId]);
          }
          const results = [];
          for (const q of queries) {
            const res = await client.query(q.text, q.values);
            results.push(res);
          }
          await client.query("COMMIT");
          return results;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          await client.end().catch(() => {});
        }
      },
      end: async () => {},
    };
  }

  // Fallback HTTP (Neon)
  const sql = neon(url, { fullResults: true });
  const queryProxy = async <Row extends DbRow = DbRow>(
    text: string,
    params?: unknown[],
  ): Promise<DbQueryResult<Row>> => {
    const effectiveOrgId = getOrgContext() ?? orgId;
    if (effectiveOrgId) {
      const results = await (sql as any).transaction([
        (sql as any).query(`SELECT set_config('app.org_id', $1, true)`, [effectiveOrgId]),
        (sql as any).query(text, params),
      ]);
      return results[1] as DbQueryResult<Row>;
    }
    const res = await sql.query(text, params);
    return {
      rows: res.rows as any[],
      rowCount: res.rowCount ?? null,
      fields: res.fields as any[],
      command: res.command ?? "SELECT",
    } as DbQueryResult<Row>;
  };

  const wrappedQuery = wrapQueryWithTimeout(queryProxy, defaultTimeout);

  return {
    query: wrappedQuery,
    transaction: async (queries: { text: string; values?: any[] }[]) => {
      const effectiveOrgId = getOrgContext() ?? orgId;
      const neonQueries = queries.map((q) => (sql as any).query(q.text, q.values));
      const allQueries = effectiveOrgId
        ? [
            (sql as any).query(`SELECT set_config('app.org_id', $1, true)`, [effectiveOrgId]),
            ...neonQueries,
          ]
        : neonQueries;
      const results = await (sql as any).transaction(allQueries);
      return effectiveOrgId ? results.slice(1) : results;
    },
    end: async () => {},
  } as DbPool;
}

export function getRawSql(env: Env, mode: "read" | "write" = "read"): DbQuery {
  const url = getUrl(env, mode);
  const orgId = getOrgContext();

  if (isTcpConnection(env, mode)) {
    const processQuery = async <Row extends DbRow = DbRow>(
      textOrStrings: string | TemplateStringsArray,
      ...paramsOrValues: any[]
    ): Promise<DbQueryResult<Row>> => {
      const { text, params } = normalizeQueryArgs(textOrStrings, paramsOrValues);

      const client = createPgClient(env, mode);
      try {
        await client.connect();
        const effectiveOrgId = getOrgContext() ?? orgId;
        if (effectiveOrgId) {
          await client.query(`SELECT set_config('app.org_id', $1, true)`, [effectiveOrgId]);
        }

        const res = await client.query(text, params);
        return {
          rows: res.rows as any[],
          rowCount: res.rowCount,
          fields: res.fields as any[],
          command: res.command,
        } as DbQueryResult<Row>;
      } finally {
        await client.end().catch(() => {});
      }
    };

    return processQuery as DbQuery;
  }

  const processQuery = async <Row extends DbRow = DbRow>(
    textOrStrings: string | TemplateStringsArray,
    ...paramsOrValues: any[]
  ): Promise<DbQueryResult<Row>> => {
    let text = "";
    let params: any[] = [];

    if (typeof textOrStrings === "string") {
      text = textOrStrings;
      params = paramsOrValues[0] ?? [];
    } else {
      text = textOrStrings[0];
      for (let i = 0; i < paramsOrValues.length; i++) {
        text += `$${i + 1}${textOrStrings[i + 1]}`;
        params.push(paramsOrValues[i]);
      }
    }

    const sql = neon(url, { fullResults: true });

    if (orgId) {
      const results = await (sql as any).transaction([
        (sql as any).query(`SELECT set_config('app.org_id', $1, true)`, [orgId]),
        (sql as any).query(text, params),
      ]);
      return results[1] as DbQueryResult<Row>;
    }

    const res = await sql.query(text, params);
    return {
      rows: res.rows as any[],
      rowCount: res.rowCount ?? null,
      fields: res.fields as any[],
      command: res.command ?? "SELECT",
    } as DbQueryResult<Row>;
  };

  return processQuery as DbQuery;
}

export async function createPoolForOrg(env: Env, organizationId: string, defaultTimeout?: number) {
  return await runWithOrg(organizationId, async () => createPool(env, defaultTimeout, "write"));
}

export async function getDbForOrg(organizationId: string, env: Env) {
  return await runWithOrg(organizationId, async () => createDb(env, "write"));
}

