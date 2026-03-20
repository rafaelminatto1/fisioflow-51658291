/**
 * Cache distribuído legado, agora implementado com localStorage + memória.
 */

import { fisioLogger as logger } from "@/lib/errors/logger";

export interface CacheOptions {
	ttl?: number;
	prefix?: string;
	failOpen?: boolean;
}

export interface CacheStats {
	hits: number;
	misses: number;
	rate: number;
	sets: number;
	deletes: number;
	errors: number;
	lastReset: Date;
}

const memory = new Map<
	string,
	{ value: unknown; expires: number | null; created: number }
>();
const stats = {
	hits: 0,
	misses: 0,
	sets: 0,
	deletes: 0,
	errors: 0,
	lastReset: new Date(),
};

export const CACHE_TTL = {
	SHORT: 60,
	VERY_SHORT: 30,
	MEDIUM: 300,
	DEFAULT: 600,
	LONG: 3600,
	VERY_LONG: 86400,
	EXTENDED: 604800,
} as const;

function getKey(key: string, prefix = "fisioflow"): string {
	return `${prefix}:${key}`;
}

function readStorage<T>(fullKey: string): T | null {
	if (typeof window === "undefined") return null;
	const raw = window.localStorage.getItem(fullKey);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as {
			value: T;
			expires: number | null;
			created: number;
		};
		if (parsed.expires && Date.now() > parsed.expires) {
			window.localStorage.removeItem(fullKey);
			return null;
		}
		return parsed.value;
	} catch (error) {
		logger.error("Cache parse error", error, "KVCacheService");
		return null;
	}
}

function writeStorage<T>(fullKey: string, value: T, ttl?: number) {
	if (typeof window === "undefined") return;
	const expires = ttl ? Date.now() + ttl * 1000 : null;
	window.localStorage.setItem(
		fullKey,
		JSON.stringify({ value, expires, created: Date.now() }),
	);
}

export function getCacheStats(): CacheStats {
	const total = stats.hits + stats.misses;
	return {
		hits: stats.hits,
		misses: stats.misses,
		rate: total > 0 ? stats.hits / total : 0,
		sets: stats.sets,
		deletes: stats.deletes,
		errors: stats.errors,
		lastReset: stats.lastReset,
	};
}

export function resetCacheStats(): void {
	stats.hits = 0;
	stats.misses = 0;
	stats.lastReset = new Date();
}

export async function getCache<T>(
	key: string,
	options?: CacheOptions,
): Promise<T | null> {
	try {
		const fullKey = getKey(key, options?.prefix);
		const cached = memory.get(fullKey);
		if (cached && (!cached.expires || Date.now() <= cached.expires)) {
			stats.hits++;
			return cached.value as T;
		}
		const fromStorage = readStorage<T>(fullKey);
		if (fromStorage != null) {
			stats.hits++;
			return fromStorage;
		}
		stats.misses++;
		return null;
	} catch (error) {
		stats.errors++;
		stats.misses++;
		logger.error("Cache get error", error, "KVCacheService");
		return null;
	}
}

export async function setCache<T>(
	key: string,
	value: T,
	options?: CacheOptions,
): Promise<boolean> {
	try {
		const fullKey = getKey(key, options?.prefix);
		const ttl = options?.ttl ?? CACHE_TTL.DEFAULT;
		const expires = Date.now() + ttl * 1000;
		memory.set(fullKey, { value, expires, created: Date.now() });
		writeStorage(fullKey, value, ttl);
		stats.sets++;
		return true;
	} catch (error) {
		stats.errors++;
		logger.error("Cache set error", error, "KVCacheService");
		return false;
	}
}

export async function deleteCache(
	key: string,
	options?: CacheOptions,
): Promise<boolean> {
	try {
		const fullKey = getKey(key, options?.prefix);
		memory.delete(fullKey);
		if (typeof window !== "undefined") window.localStorage.removeItem(fullKey);
		stats.deletes++;
		return true;
	} catch (error) {
		stats.errors++;
		logger.error("Cache delete error", error, "KVCacheService");
		return false;
	}
}

export async function invalidatePattern(
	pattern: string,
	options?: CacheOptions,
): Promise<void> {
	const prefix = getKey("", options?.prefix);
	for (const key of Array.from(memory.keys())) {
		if (key.startsWith(prefix) && key.includes(pattern)) memory.delete(key);
	}
	if (typeof window !== "undefined") {
		for (const key of Object.keys(window.localStorage)) {
			if (key.startsWith(prefix) && key.includes(pattern))
				window.localStorage.removeItem(key);
		}
	}
}

export async function healthCheck() {
	return {
		healthy: true,
		stats: getCacheStats(),
		message: "Local cache is healthy",
	};
}

export async function warmCache<T>(
	key: string,
	fetcher: () => Promise<T>,
	options?: CacheOptions,
): Promise<T> {
	const cached = await getCache<T>(key, options);
	if (cached != null) return cached;
	const fresh = await fetcher();
	await setCache(key, fresh, options);
	return fresh;
}

export async function withCache<T>(
	key: string,
	fetcher: () => Promise<T>,
	options?: CacheOptions,
): Promise<T> {
	return warmCache(key, fetcher, options);
}

export const PatientCache = {
	get: (patientId: string) => getCache(`patient:${patientId}`),
	set: (patientId: string, value: unknown) =>
		setCache(`patient:${patientId}`, value, { ttl: CACHE_TTL.MEDIUM }),
	invalidate: (patientId: string) => deleteCache(`patient:${patientId}`),
};

export const AppointmentCache = {
	getByPatient: (patientId: string) => getCache(`appointments:${patientId}`),
	setByPatient: (patientId: string, value: unknown) =>
		setCache(`appointments:${patientId}`, value, { ttl: CACHE_TTL.SHORT }),
	invalidateByPatient: (patientId: string) =>
		deleteCache(`appointments:${patientId}`),
};

export async function getSession<T = unknown>(
	sessionId: string,
): Promise<T | null> {
	return getCache<T>(`session:${sessionId}`);
}

export async function setSession<T = unknown>(
	sessionId: string,
	value: T,
	ttl = CACHE_TTL.DEFAULT,
): Promise<boolean> {
	return setCache(`session:${sessionId}`, value, { ttl });
}

export async function deleteSession(sessionId: string): Promise<boolean> {
	return deleteCache(`session:${sessionId}`);
}

export async function clearAllCache(prefix = "fisioflow"): Promise<void> {
	await invalidatePattern("", { prefix });
	logger.info("All cache cleared", { prefix }, "KVCacheService");
}

export default {
	getCache,
	setCache,
	deleteCache,
	invalidatePattern,
	withCache,
	warmCache,
	getCacheStats,
	resetCacheStats,
	healthCheck,
	PatientCache,
	AppointmentCache,
	getSession,
	setSession,
	deleteSession,
	clearAllCache,
};
