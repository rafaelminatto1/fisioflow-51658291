import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@fisioflow/db";
import type { Env } from "../types/env";
import {
	wrapQueryWithTimeout,
	DEFAULT_TIMEOUTS,
} from "./dbWrapper";
import { AsyncLocalStorage } from "node:async_hooks";

const rlsContext = new AsyncLocalStorage<string>();

export type DbRow = Record<string, any>;

export interface DbQueryResult<Row extends DbRow = DbRow> {
	rows: Row[];
	rowCount?: number;
	fields?: unknown[];
	command?: string;
	[key: string]: unknown;
}

export type DbQuery = <Row extends DbRow = DbRow>(
	text: string,
	params?: unknown[],
) => Promise<DbQueryResult<Row>>;

/**
 * Interface unificada para o Pool, compatível com pg e neon-http (emulado)
 */
export interface DbPool {
	query: DbQuery;
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
 * Cria uma instância do Drizzle configurada para o ambiente atual.
 */
export function createDb(env: Env) {
	const url = getUrl(env);
	const orgId = getOrgContext();

	if (isTcpConnection(env)) {
		const pool = new Pool({ connectionString: url });
		return drizzlePg(pool, { schema });
	}

	const sql = neon(url);
	if (orgId) {
		return drizzleHttp(wrapSqlWithRls(sql, orgId) as any, { schema });
	}
	return drizzleHttp(sql, { schema });
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
		const pool = new Pool({ connectionString: url });
		const client = await pool.connect();
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
		const pool = new Pool({ connectionString: url });
		
		const queryProxy: DbQuery = async (text, params) => {
			const client = await pool.connect();
			try {
				if (orgId) {
					await client.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]);
				}
				const res = await client.query(text, params);
				return res as DbQueryResult;
			} finally {
				client.release();
			}
		};

		const wrappedQuery = wrapQueryWithTimeout(queryProxy, defaultTimeout);
		
		return {
			query: wrappedQuery,
			end: () => pool.end(),
		};
	}

	// Fallback HTTP (Neon)
	const sql = neon(url, { fullResults: true });
	
	const queryProxy: DbQuery = async (text, params) => {
		if (orgId) {
			const results = await (sql as any).transaction([
				sql`SELECT set_config('app.org_id', ${orgId}::text, true)`,
				sql.query(text, params),
			]);
			return results[1] as DbQueryResult;
		}
		return (await sql.query(text, params)) as DbQueryResult;
	};

	const wrappedQuery = wrapQueryWithTimeout(queryProxy, defaultTimeout);

	return {
		query: wrappedQuery,
		end: async () => {},
	};
}

export function getRawSql(env: Env) {
	const url = getUrl(env);
	if (isTcpConnection(env)) {
		return new Pool({ connectionString: url });
	}
	return neon(url);
}

export function createPoolForOrg(
	env: Env,
	organizationId: string,
	defaultTimeout: number = DEFAULT_TIMEOUTS.query,
): DbPool {
	return runWithOrg(organizationId, () => createPool(env, defaultTimeout));
}

export function createDbForOrg(env: Env, organizationId: string) {
	return runWithOrg(organizationId, () => createDb(env));
}
