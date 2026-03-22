/**
 * Busca vetorial compatível sem Firestore.
 *
 * Usa embeddings locais e dados de sessões via Workers quando houver contexto
 * de paciente. Para escopos globais, retorna vazio de forma explícita.
 */

import { logger } from "@/lib/errors/logger";
import {
	generateEmbedding,
	generateSOAPEmbedding,
	cosineSimilarity,
} from "@/lib/ai/embeddings";
import { withPerformanceTrace } from "@/lib/monitoring/performance";
import type { Evolution } from "@/types/clinical";
import { sessionsApi } from "@/api/v2";

export interface VectorSearchResult {
	evolution: Evolution;
	similarity: number;
	evolutionId: string;
}

export interface VectorSearchOptions {
	limit?: number;
	minSimilarity?: number;
	patientId?: string;
	organizationId?: string;
}

const indexedEmbeddings = new Map<
	string,
	{ embedding: number[]; evolution: Partial<Evolution> }
>();

function toEvolution(
	session: Awaited<ReturnType<typeof sessionsApi.list>>["data"]["data"][number],
): Evolution {
	return {
		id: session.id,
		patientId: session.patient_id,
		organizationId: undefined,
		subjective: session.subjective,
		objective: session.objective,
		assessment: session.assessment,
		plan: session.plan,
		createdAt: session.created_at,
		updatedAt: session.updated_at,
	} as Evolution;
}

export async function findSimilarEvolutions(
	queryText: string,
	options: VectorSearchOptions = {},
): Promise<VectorSearchResult[]> {
	return withPerformanceTrace("vector_search_similar_evolutions", async () => {
		const { limit = 10, minSimilarity = 0.7, patientId } = options;
		if (!patientId) {
			logger.warn(
				"Vector search global ainda não está disponível sem patientId",
				undefined,
				"vector-search",
			);
			return [];
		}

		try {
			const queryEmbedding = await generateEmbedding(queryText);
			const sessions =
				(await sessionsApi.list({ patientId, limit: 100 })).data ?? [];
			const results: VectorSearchResult[] = [];

			for (const session of sessions) {
				const evolution = toEvolution(session);
				const text = [
					session.subjective,
					session.objective,
					session.assessment,
					session.plan,
				]
					.filter(Boolean)
					.join("\n");
				if (!text) continue;
				const embedding = await generateEmbedding(text);
				const similarity = cosineSimilarity(queryEmbedding, embedding);
				if (similarity >= minSimilarity) {
					results.push({ evolution, similarity, evolutionId: session.id });
				}
			}

			return results
				.sort((a, b) => b.similarity - a.similarity)
				.slice(0, limit);
		} catch (error) {
			logger.error(
				"Erro ao buscar evoluções similares",
				error,
				"vector-search",
			);
			return [];
		}
	});
}

export async function indexEvolution(
	evolutionId: string,
	evolution: Partial<Evolution>,
): Promise<void> {
	const embedding = await generateSOAPEmbedding(evolution);
	indexedEmbeddings.set(evolutionId, { embedding, evolution });
}

export async function indexBatchEvolutions(
	evolutionIds: string[],
): Promise<void> {
	logger.info(
		`Indexação em lote compatível solicitada para ${evolutionIds.length} evoluções`,
		undefined,
		"vector-search",
	);
}

export async function findEvolutionsWithoutEmbedding(
	_limit = 100,
): Promise<string[]> {
	return [];
}

export async function reindexPatientEvolutions(
	patientId: string,
): Promise<void> {
	const sessions =
		(await sessionsApi.list({ patientId, limit: 100 })).data ?? [];
	await Promise.all(
		sessions.map((session) => indexEvolution(session.id, toEvolution(session))),
	);
}

export async function removeEvolutionEmbedding(
	evolutionId: string,
): Promise<void> {
	indexedEmbeddings.delete(evolutionId);
}

export function embeddingDistance(a: number[], b: number[]): number {
	let sum = 0;
	for (let i = 0; i < a.length; i += 1) {
		const diff = a[i] - b[i];
		sum += diff * diff;
	}
	return Math.sqrt(sum);
}

export function kMeansCluster(embeddings: number[][], k: number): number[] {
	if (embeddings.length === 0) return [];
	return embeddings.map((_, index) => index % Math.max(1, k));
}
