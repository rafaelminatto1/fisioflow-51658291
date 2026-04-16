import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { type PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "@fisioflow/db";
import type { Env } from "../types/env";
import {
	wrapQueryWithTimeout,
	DEFAULT_TIMEOUTS,
} from "./dbWrapper";
import { AsyncLocalStorage } from "node:async_hooks";

const rlsContext = new AsyncLocalStorage<string>();

// Singleton pool to reuse across requests in the same isolate
let globalPool: Pool | null = null;

export type DbRow = any;

export interface DbQueryResult<Row extends DbRow = DbRow> {
	rows: Row[];
	rowCount: number | null;
	fields: unknown[];
	command: string;
}

export type DbQuery = {
	<Row extends DbRow = DbRow>(text: string, params?: unknown[]): Promise<DbQueryResult<Row>>;
	<Row extends DbRow = DbRow>(strings: TemplateStringsArray, ...values: any[]): Promise<DbQueryResult<Row>>;
};

/**
 * Interface unificada para o Pool, compatível com pg e neon-http (emulado)
 */
export interface DbPool {
	query: DbQuery;
	transaction: (queries: { text: string; values?: any[] }[]) => Promise<any[]>;
	end: () => Promise<void>;
}

export function runWithOrg<T>(
	organizationId: string,
	fn: () => Promise<T>,
): Promise<T> {
	return rlsContext.run(organizationId, fn);
}

export function getOrgContext(): string | undefined {
	return rlsContext.getStore();
}

function getUrl(env: Env): string {
	const url =
		env.HYPERDRIVE?.connectionString ||
		env.NEON_URL ||
		process.env.DATABASE_URL;
	
	if (!url) throw new Error("Database configuration error: URL missing");
	return url;
}

/**
 * Determina se devemos usar o driver TCP (pg) ou HTTP (neon).
 * Priorizamos TCP se estivermos usando Hyperdrive.
 */
function isTcpConnection(env: Env): boolean {
	const url = getUrl(env);
	// Se a URL vem do Hyperdrive ou é postgres://, usamos TCP via pg
	if (env.HYPERDRIVE?.connectionString && url === env.HYPERDRIVE.connectionString) return true;
	if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return true;
	return false;
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
			.prepare(
				"INSERT OR REPLACE INTO query_cache (id, value, expires_at) VALUES (?, ?, ?)",
			)
			.bind(cacheKey, JSON.stringify(result), Date.now() + ttlSeconds * 1000)
			.run();

		return result;
	} catch (error) {
		console.error(`[D1 Cache Error]: ${cacheKey}`, error);
		return await neonQuery();
	}
}

/**
 * Tipo unificado para o banco de dados FisioFlow, suportando drivers HTTP e TCP.
 */
export type FisioDb = PgDatabase<any, typeof schema>;

/**
 * Cria uma instância do Drizzle configurada para o ambiente atual.
 * @param mode 'write' para transações e escritas (usa TCP/Hyperdrive), 'read' para consultas rápidas (usa HTTP).
 */
export function createDb(env: Env, mode: 'read' | 'write' = 'write'): FisioDb {
	const url = getUrl(env);
	const orgId = getOrgContext();

	if (isTcpConnection(env) && mode === 'write') {
		if (!globalPool) {
			globalPool = new Pool({ 
				connectionString: url,
				max: 10, // Optimize for Worker environment
				idleTimeoutMillis: 10000 
			});
		}
		
		const pool = globalPool;
		if (orgId) {
			// Intercepta conexões do Drizzle para injetar o contexto RLS (app.org_id)
			const originalConnect = pool.connect.bind(pool);
			pool.connect = (async () => {
				const client = await originalConnect();
				await client.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]);
				return client;
			}) as any;

			// Intercepta queries diretas do pool
			const originalQuery = pool.query.bind(pool);
			pool.query = (async (text: any, params: any) => {
				const client = await originalConnect();
				try {
					await client.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]);
					return await client.query(text, params);
				} finally {
					client.release();
				}
			}) as any;
		}
		return drizzlePg(pool, { schema }) as any;
	}

	// For read mode or when TCP is not forced/available, we use the Neon HTTP driver
	// which is much faster for one-off reads as it avoids TCP handshakes
	const sql = neon(url);
	if (orgId) {
		const rlsSql = wrapSqlWithRls(sql, orgId);
		return drizzleHttp(rlsSql as any, { schema }) as any;
	}
	return drizzleHttp(sql, { schema }) as any;
}

function wrapSqlWithRls(
	sql: NeonQueryFunction<false, false>,
	organizationId: string,
): NeonQueryFunction<false, false> {
	return ((strings: TemplateStringsArray, ...values: any[]) => {
		return (sql as any)
			.transaction([
				sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`,
				sql(strings, ...values),
			])
			.then((results: any[]) => results[1]);
	}) as any;
}

/**
 * Executa uma query garantindo o contexto de RLS.
 */
export async function withRls<T>(
	env: Env,
	organizationId: string,
	fn: (sql: any) => Promise<T>,
): Promise<T> {
	const url = getUrl(env);
	
	if (isTcpConnection(env)) {
		if (!globalPool) {
			globalPool = new Pool({ connectionString: url });
		}
		const client = await globalPool.connect();
		try {
			await client.query(`SELECT set_config('app.org_id', $1, true)`, [organizationId]);
			return await fn(client);
		} finally {
			client.release();
		}
	}

	const sql = neon(url);
	await (sql as any).transaction([
		sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`,
	]);
	return await fn(sql);
}

/**
 * Cria um pool de conexões (ou emulação via HTTP) para queries manuais.
 */
export function createPool(
	env: Env,
	defaultTimeout: number = DEFAULT_TIMEOUTS.query,
): DbPool {
	const url = getUrl(env);
	const orgId = getOrgContext();

	if (isTcpConnection(env)) {
		if (!globalPool) {
			globalPool = new Pool({ 
				connectionString: url,
				max: 10,
				idleTimeoutMillis: 10000 
			});
		}
		const pool = globalPool;
		
		const queryProxy = async <Row extends DbRow = any>(
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

			const client = await pool.connect();
			try {
				if (orgId) {
					await client.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]);
				}
				const res = await client.query(text, params);
				return {
					rows: res.rows as any[],
					rowCount: res.rowCount,
					fields: res.fields as any[],
					command: res.command,
				} as DbQueryResult<Row>;
			} finally {
				client.release();
			}
		};

		const wrappedQuery = wrapQueryWithTimeout(queryProxy as any, defaultTimeout);
		
		return {
			query: wrappedQuery,
			transaction: async (queries: { text: string; values?: any[] }[]) => {
				const client = await pool.connect();
				try {
					await client.query('BEGIN');
					if (orgId) {
						await client.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]);
					}
					const results = [];
					for (const q of queries) {
						const res = await client.query(q.text, q.values);
						results.push(res);
					}
					await client.query('COMMIT');
					return results;
				} catch (error) {
					await client.query('ROLLBACK');
					throw error;
				} finally {
					client.release();
				}
			},
			end: () => pool.end(),
		};
	}

	// Fallback HTTP (Neon)
	const sql = neon(url, { fullResults: true });
		const queryProxy = async <Row extends DbRow = DbRow>(
			text: string,
			params?: unknown[],
		): Promise<DbQueryResult<Row>> => {
			const orgId = getOrgContext();
			if (orgId) {
				const results = await (sql as any).transaction([
					sql`SELECT set_config('app.org_id', ${orgId}::text, true)`,
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
			const orgId = getOrgContext();
			const neonQueries = queries.map(q => (sql as any).query(q.text, q.values));
			const allQueries = orgId
				? [(sql as any).query(`SELECT set_config('app.org_id', $1, true)`, [orgId]), ...neonQueries]
				: neonQueries;
			const results = await (sql as any).transaction(allQueries);
			return orgId ? results.slice(1) : results;
		},
		end: async () => {
			if (isTcpConnection(env)) {
				const pool = await (env.HYPERDRIVE as any)?.connect() || new Pool({ connectionString: getUrl(env) });
				await pool.end();
			}
		},
	} as DbPool;
}

export function getRawSql(env: Env, mode: 'read' | 'write' = 'write'): DbQuery {
	const url = getUrl(env);
	const orgId = getOrgContext();

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
			// Handle template literal
			text = textOrStrings[0];
			for (let i = 0; i < paramsOrValues.length; i++) {
				text += `$${i + 1}${textOrStrings[i + 1]}`;
				params.push(paramsOrValues[i]);
			}
		}

		// HTTP Driver (Neon) - Used for 'read' mode or fallback
		const sql = neon(url, { fullResults: true });
		const neonProcess = async (text: string, params: any[]) => {
			if (orgId) {
				const results = await (sql as any).transaction([
					sql`SELECT set_config('app.org_id', ${orgId}::text, true)`,
					(sql as any).query(text, params),
				]);
				return results[1];
			}
			return await sql.query(text, params);
		};

		return await neonProcess(text, params) as DbQueryResult<Row>;
	};

	return processQuery as DbQuery;
}

export async function createPoolForOrg(env: Env, organizationId: string, defaultTimeout?: number) {
	return await runWithOrg(organizationId, async () => createPool(env, defaultTimeout));
}

export async function getDbForOrg(organizationId: string, env: Env) {
	return await runWithOrg(organizationId, async () => createDb(env));
}
