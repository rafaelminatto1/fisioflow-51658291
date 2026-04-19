import type { Env } from "../types/env";
import {
	createContextCache,
	deleteContextCache,
	type GeminiModel,
} from "./ai-gemini-v2";
import {
	buildPatientContext,
	type BuiltPatientContext,
	type PatientContextOptions,
} from "../services/ai/PatientContextBuilder";

const KV_PREFIX = "patient_cache:";
const DEFAULT_TTL_SECONDS = 3600;
const MIN_REMAINING_SECONDS = 300;

interface StoredCacheEntry {
	cacheName: string;
	expireTime?: string;
	model: GeminiModel;
	patientId: string;
	organizationId: string;
	approxTokens: number;
	generatedAt: string;
}

export interface GetOrCreatePatientCacheOptions extends PatientContextOptions {
	model?: GeminiModel;
	ttlSeconds?: number;
	systemInstruction?: string;
	forceRefresh?: boolean;
}

export interface PatientCacheHandle {
	cacheName: string;
	model: GeminiModel;
	contextXml: string;
	context: BuiltPatientContext;
	createdNew: boolean;
	expireTime?: string;
}

function kvKey(patientId: string): string {
	return `${KV_PREFIX}${patientId}`;
}

function hasSufficientTtl(entry: StoredCacheEntry): boolean {
	if (!entry.expireTime) return true;
	const expires = Date.parse(entry.expireTime);
	if (Number.isNaN(expires)) return true;
	return expires - Date.now() > MIN_REMAINING_SECONDS * 1000;
}

export async function readPatientCacheEntry(
	env: Env,
	patientId: string,
): Promise<StoredCacheEntry | null> {
	if (!env.FISIOFLOW_CONFIG) return null;
	const raw = await env.FISIOFLOW_CONFIG.get(kvKey(patientId));
	if (!raw) return null;
	try {
		return JSON.parse(raw) as StoredCacheEntry;
	} catch {
		return null;
	}
}

async function writePatientCacheEntry(
	env: Env,
	entry: StoredCacheEntry,
	ttlSeconds: number,
): Promise<void> {
	if (!env.FISIOFLOW_CONFIG) return;
	await env.FISIOFLOW_CONFIG.put(kvKey(entry.patientId), JSON.stringify(entry), {
		expirationTtl: Math.max(60, ttlSeconds),
	});
}

async function deletePatientCacheEntry(
	env: Env,
	patientId: string,
): Promise<void> {
	if (!env.FISIOFLOW_CONFIG) return;
	await env.FISIOFLOW_CONFIG.delete(kvKey(patientId));
}

export async function getOrCreatePatientCache(
	env: Env,
	patientId: string,
	organizationId: string,
	options: GetOrCreatePatientCacheOptions = {},
): Promise<PatientCacheHandle> {
	const model: GeminiModel = options.model ?? "gemini-3-flash-preview";
	const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;

	const context = await buildPatientContext(env, patientId, organizationId, options);

	if (!options.forceRefresh) {
		const existing = await readPatientCacheEntry(env, patientId);
		if (
			existing &&
			existing.model === model &&
			existing.organizationId === organizationId &&
			hasSufficientTtl(existing)
		) {
			return {
				cacheName: existing.cacheName,
				model: existing.model,
				contextXml: context.contextXml,
				context,
				createdNew: false,
				expireTime: existing.expireTime,
			};
		}
	}

	const { name, expireTime } = await createContextCache(env, {
		model,
		content: context.contextXml,
		systemInstruction: options.systemInstruction,
		ttlSeconds,
		displayName: `patient-${patientId}`,
	});

	if (!name) {
		throw new Error("Gemini returned empty cache name");
	}

	const entry: StoredCacheEntry = {
		cacheName: name,
		expireTime,
		model,
		patientId,
		organizationId,
		approxTokens: context.approxTokens,
		generatedAt: context.generatedAt,
	};
	await writePatientCacheEntry(env, entry, ttlSeconds);

	return {
		cacheName: name,
		model,
		contextXml: context.contextXml,
		context,
		createdNew: true,
		expireTime,
	};
}

export async function invalidatePatientCache(
	env: Env,
	patientId: string,
): Promise<void> {
	const entry = await readPatientCacheEntry(env, patientId);
	if (!entry) return;
	await deletePatientCacheEntry(env, patientId);
	try {
		await deleteContextCache(env, entry.cacheName);
	} catch (error) {
		console.warn(
			`[ai-context-cache] failed to delete remote cache ${entry.cacheName}:`,
			error,
		);
	}
}

export async function invalidatePatientCacheByAppointment(
	env: Env,
	patientId?: string | null,
): Promise<void> {
	if (!patientId) return;
	await invalidatePatientCache(env, patientId);
}
