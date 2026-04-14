import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
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

export type DbPool = NeonQueryFunction<false, true> & {
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
	const sql = neon(getUrl(env));
	const orgId = getOrgContext();
	if (orgId) {
		return drizzleHttp(wrapSqlWithRls(sql, orgId) as any, { schema });
	}
	return drizzleHttp(sql, { schema });
}

export function createDbForOrg(env: Env, organizationId: string) {
	const sql = neon(getUrl(env));
	return drizzleHttp(wrapSqlWithRls(sql, organizationId) as any, { schema });
}

export async function withRls<T>(
	env: Env,
	organizationId: string,
	fn: (sql: any) => Promise<T>,
): Promise<T> {
	const sql = neon(getUrl(env));
	await (sql as any).transaction([
		sql`SELECT set_config('app.org_id', ${organizationId}::text, true)`,
	]);
	return await fn(sql);
}

export function createPool(
	env: Env,
	defaultTimeout: number = DEFAULT_TIMEOUTS.query,
): DbPool {
	const sql = neon(getUrl(env), { fullResults: true });
	const orgId = getOrgContext();

	if (orgId) {
		const wrapped = wrapSqlWithRlsFull(sql, orgId);
		const wrappedQuery = wrapQueryWithTimeout(wrapped.query, defaultTimeout);
		const wrappedSql = Object.assign(wrapped, { query: wrappedQuery });
		wrappedSql.end = async () => {};
		return wrappedSql as DbPool;
	}

	const wrappedQuery = wrapQueryWithTimeout(
		sql.query.bind(sql),
		defaultTimeout,
	);
	const wrappedSql = Object.assign(sql, { query: wrappedQuery });
	(wrappedSql as any).end = async () => {};
	return wrappedSql as DbPool;
}

export function getRawSql(env: Env) {
	return neon(getUrl(env));
}

export function createPoolForOrg(
	env: Env,
	organizationId: string,
	defaultTimeout: number = DEFAULT_TIMEOUTS.query,
): DbPool {
	const sql = neon(getUrl(env), { fullResults: true });
	const wrapped = wrapSqlWithRlsFull(sql, organizationId);
	const wrappedQuery = wrapQueryWithTimeout(wrapped.query, defaultTimeout);
	const wrappedSql = Object.assign(wrapped, { query: wrappedQuery });
	wrappedSql.end = async () => {};
	return wrappedSql as DbPool;
}
