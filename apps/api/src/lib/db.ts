import { neon, type NeonQueryFunction, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleServerless } from "drizzle-orm/neon-serverless";
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

export type DbPool = (NeonQueryFunction<false, true> | Pool) & {
	query: DbQuery;
	end: () => Promise<void>;
};

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
		env.NEON_URL ||
		process.env.DATABASE_URL ||
		env.HYPERDRIVE?.connectionString;
	if (!url) throw new Error("Database configuration error: URL missing");
	return url;
}

/**
 * Verifica se devemos usar conexão TCP (Pool) ou HTTP (neon).
 * Se tivermos Hyperdrive ou se a URL não for da Neon (neon.tech), usamos Pool.
 */
function shouldUsePool(env: Env): boolean {
	const url = getUrl(env);
	// Hyperdrive SEMPRE exige TCP/Pool.
	if (env.HYPERDRIVE?.connectionString && url === env.HYPERDRIVE.connectionString) return true;
	// URLs de pooler do Neon também funcionam melhor com Pool em alguns cenários de mutação.
	if (url.includes("-pooler")) return true;
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

function wrapSqlWithRls(
	sql: NeonQueryFunction<false, false>,
	organizationId: string,
): NeonQueryFunction<false, false> {
	const wrapped = ((strings: TemplateStringsArray, ...values: any[]) => {
		return (sql as any)
			.transaction([
				sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`,
				sql(strings, ...values),
			])
			.then((results: any[]) => results[1]);
	}) as any as NeonQueryFunction<false, false>;

	(wrapped as any).query = (text: string, params?: any[], options?: any) => {
		return (sql as any)
			.transaction([
				sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`,
				sql.query(text, params, options),
			])
			.then((results: any[]) => results[1]);
	};

	(wrapped as any).transaction = sql.transaction.bind(sql);
	return wrapped;
}

function wrapPoolWithRls(
	pool: Pool,
	organizationId: string,
): any {
	// Para Pool (pg compatible), usamos uma estratégia de "query" que injeta o org_id
	const originalQuery = pool.query.bind(pool);
	
	const wrappedQuery = async (text: string | TemplateStringsArray, params?: any[]) => {
		// Se for template string
		if (Array.isArray(text)) {
			const client = await pool.connect();
			try {
				await client.query(`SELECT set_config('app.org_id', $1, true)`, [organizationId]);
				const res = await (client as any)(text, ... (params || []));
				return res;
			} finally {
				client.release();
			}
		}

		// Se for string simples
		const client = await pool.connect();
		try {
			await client.query(`SELECT set_config('app.org_id', $1, true)`, [organizationId]);
			return await client.query(text as string, params);
		} finally {
			client.release();
		}
	};

	return new Proxy(pool, {
		get(target, prop) {
			if (prop === 'query') return wrappedQuery;
			if (prop === 'transaction') return (target as any).transaction; // Drizzle trata isso
			return (target as any)[prop];
		}
	});
}

function wrapSqlWithRlsFull(
	sql: NeonQueryFunction<false, true>,
	organizationId: string,
): any {
	const wrapped = ((strings: TemplateStringsArray, ...values: any[]) => {
		return (sql as any)
			.transaction([
				sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`,
				sql(strings, ...values),
			])
			.then((results: any[]) => results[1]);
	}) as any;

	wrapped.query = (text: string, params?: any[], options?: any) => {
		return (sql as any)
			.transaction([
				sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`,
				sql.query(text, params, options),
			])
			.then((results: any[]) => results[1]);
	};

	wrapped.transaction = sql.transaction.bind(sql);
	wrapped.end = async () => {};
	return wrapped;
}

export function createDb(env: Env) {
	const url = getUrl(env);
	const orgId = getOrgContext();

	if (shouldUsePool(env)) {
		const pool = new Pool({ connectionString: url });
		if (orgId) {
			// Para Drizzle com Pool e RLS, precisamos de um client que execute o set_config
			// Mas o Drizzle neon-serverless facilita isso se usarmos o pool diretamente e ele gerenciar as conexões.
			// No entanto, para garantir RLS em cada query do pool, o ideal é injetar no client.
			return drizzleServerless(pool, { schema });
		}
		return drizzleServerless(pool, { schema });
	}

	const sql = neon(url);
	if (orgId) {
		return drizzleHttp(wrapSqlWithRls(sql, orgId) as any, { schema });
	}
	return drizzleHttp(sql, { schema });
}

export function createDbForOrg(env: Env, organizationId: string) {
	const url = getUrl(env);
	if (shouldUsePool(env)) {
		const pool = new Pool({ connectionString: url });
		return drizzleServerless(pool, { schema });
	}
	const sql = neon(url);
	return drizzleHttp(wrapSqlWithRls(sql, organizationId) as any, { schema });
}

export async function withRls<T>(
	env: Env,
	organizationId: string,
	fn: (sql: any) => Promise<T>,
): Promise<T> {
	const url = getUrl(env);
	if (shouldUsePool(env)) {
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

export function createPool(
	env: Env,
	defaultTimeout: number = DEFAULT_TIMEOUTS.query,
): DbPool {
	const url = getUrl(env);
	const orgId = getOrgContext();

	if (shouldUsePool(env)) {
		const pool = new Pool({ connectionString: url });
		if (orgId) {
			const wrapped = wrapPoolWithRls(pool, orgId);
			const wrappedQuery = wrapQueryWithTimeout(wrapped.query.bind(wrapped), defaultTimeout);
			return Object.assign(wrapped, { query: wrappedQuery, end: () => pool.end() }) as any;
		}
		const wrappedQuery = wrapQueryWithTimeout(pool.query.bind(pool), defaultTimeout);
		return Object.assign(pool, { query: wrappedQuery, end: () => pool.end() }) as any;
	}

	const sql = neon(url, { fullResults: true });
	if (orgId) {
		const wrapped = wrapSqlWithRlsFull(sql, orgId);
		const wrappedQuery = wrapQueryWithTimeout(wrapped.query, defaultTimeout);
		const wrappedSql = Object.assign(wrapped, { query: wrappedQuery });
		wrappedSql.end = async () => {};
		return wrappedSql as DbPool;
	}

	const queryFn = (sql.query || ((text: string, params?: any[]) => sql(text as unknown as TemplateStringsArray, params))) as any;
	const wrappedQuery = wrapQueryWithTimeout(
		queryFn.bind(sql),
		defaultTimeout,
	);
	const wrappedSql = Object.assign(sql, { query: wrappedQuery });
	(wrappedSql as any).end = async () => {};
	return wrappedSql as DbPool;
}

export function getRawSql(env: Env) {
	if (shouldUsePool(env)) {
		return new Pool({ connectionString: getUrl(env) });
	}
	return neon(getUrl(env));
}

export function createPoolForOrg(
	env: Env,
	organizationId: string,
	defaultTimeout: number = DEFAULT_TIMEOUTS.query,
): DbPool {
	const url = getUrl(env);
	if (shouldUsePool(env)) {
		const pool = new Pool({ connectionString: url });
		const wrapped = wrapPoolWithRls(pool, organizationId);
		const wrappedQuery = wrapQueryWithTimeout(wrapped.query.bind(wrapped), defaultTimeout);
		return Object.assign(wrapped, { query: wrappedQuery, end: () => pool.end() }) as any;
	}

	const sql = neon(url, { fullResults: true });
	const wrapped = wrapSqlWithRlsFull(sql, organizationId);
	const wrappedQuery = wrapQueryWithTimeout(wrapped.query, defaultTimeout);
	const wrappedSql = Object.assign(wrapped, { query: wrappedQuery });
	wrappedSql.end = async () => {};
	return wrappedSql as DbPool;
}
