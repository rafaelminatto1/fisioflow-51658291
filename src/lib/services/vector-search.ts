/**
 * Firestore Vector Search Service
 *
 * Implementa busca semântica usando índices vetoriais do Firestore
 */

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/app';
import { logger } from '@/lib/errors/logger';
import {
  generateEmbedding,
  generateSOAPEmbedding,
  deserializeEmbedding,
  isValidEmbedding,
  cosineSimilarity,
} from '@/lib/ai/embeddings';
import { withPerformanceTrace } from '@/lib/monitoring/performance';
import type { Evolution } from '@/types/clinical';

/**
 * Resultado da busca vectorial
 */
export interface VectorSearchResult {
  evolution: Evolution;
  similarity: number;
  evolutionId: string;
}

/**
 * Opções de busca
 */
export interface VectorSearchOptions {
  limit?: number;
  minSimilarity?: number;
  patientId?: string; // Filtrar por paciente específico
  organizationId?: string; // Filtrar por organização
}

/**
 * Busca evoluções similares usando Vector Search
 *
 * @param queryText Texto de consulta
 * @param options Opções de busca
 * @returns Lista de evoluções similares
 */
export async function findSimilarEvolutions(
  queryText: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  return withPerformanceTrace('vector_search_similar_evolutions', async () => {
    const { limit = 10, minSimilarity = 0.7, patientId, organizationId } = options;

    try {
      // 1. Gerar embedding da query
      const queryEmbedding = await generateEmbedding(queryText);

      // 2. Buscar todas as evoluções com embeddings
      // NOTA: Quando Firestore Vector Search estiver disponível,
      // usaremos: where('embedding', 'near', { vector: queryEmbedding, distance: minSimilarity })
      let q = collection(db, 'evolutions');
      q = query(q, where('embedding', '!=', null));

      const snapshot = await getDocs(q);

      // 3. Calcular similaridades localmente
      const results: VectorSearchResult[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const embedding = deserializeEmbedding(data.embedding);

        if (!isValidEmbedding(embedding)) {
          return;
        }

        const similarity = cosineSimilarity(queryEmbedding, embedding);

        if (similarity >= minSimilarity) {
          results.push({
            evolution: data as Evolution,
            similarity,
            evolutionId: docSnap.id,
          });
        }
      });

      // 4. Filtrar por paciente/organização se especificado
      let filtered = results;
      if (patientId) {
        filtered = filtered.filter(r => r.evolution.patientId === patientId);
      }
      if (organizationId) {
        filtered = filtered.filter(r => r.evolution.organizationId === organizationId);
      }

      // 5. Ordenar por similaridade e limitar
      const sorted = filtered
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      logger.info(`[VectorSearch] Encontradas ${sorted.length} evoluções similares para query (${queryText.length} chars)`);
      return sorted;
    } catch (error) {
      logger.error('[VectorSearch] Erro ao buscar evoluções similares:', error);
      return [];
    }
  });
}

/**
 * Indexa uma evolução para busca vetorial
 *
 * @param evolutionId ID da evolução
 * @param evolution Dados da evolução
 */
export async function indexEvolution(
  evolutionId: string,
  evolution: Partial<Evolution>
): Promise<void> {
  return withPerformanceTrace('index_evolution', async () => {
    try {
      // Gerar embedding
      const embedding = await generateSOAPEmbedding(evolution);

      // Salvar na evolução
      const evolutionRef = doc(db, 'evolutions', evolutionId);
      await updateDoc(evolutionRef, {
        embedding,
        embeddingUpdatedAt: serverTimestamp(),
        embeddingVersion: 1,
      });

      logger.debug(`[VectorSearch] Evolução ${evolutionId} indexada com sucesso`);
    } catch (error) {
      logger.error(`[VectorSearch] Erro ao indexar evolução ${evolutionId}:`, error);
      throw error;
    }
  });
}

/**
 * Indexa evoluções em batch
 *
 * @param evolutionIds Array de IDs de evoluções
 */
export async function indexBatchEvolutions(evolutionIds: string[]): Promise<void> {
  return withPerformanceTrace('index_batch_evolutions', async () => {
    const results = await Promise.allSettled(
      evolutionIds.map(async (id) => {
        const snap = await getDoc(doc(db, 'evolutions', id));
        if (!snap.exists()) return;

        await indexEvolution(id, snap.data() as Evolution);
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`[VectorSearch] Batch index: ${succeeded} succeeded, ${failed} failed`);
  });
}

/**
 * Busca evoluções sem embedding
 *
 * @param limit Limite de resultados
 * @returns Array de IDs de evoluções sem embedding
 */
export async function findEvolutionsWithoutEmbedding(limit: number = 100): Promise<string[]> {
  try {
    const q = query(
      collection(db, 'evolutions'),
      where('embedding', '==', null)
    );

    const snapshot = await getDocs(q);
    const ids = snapshot.docs.map(d => d.id).slice(0, limit);

    logger.debug(`[VectorSearch] Encontradas ${ids.length} evoluções sem embedding`);
    return ids;
  } catch (error) {
    logger.error('[VectorSearch] Erro ao buscar evoluções sem embedding:', error);
    return [];
  }
}

/**
 * Reindexa todas as evoluções de um paciente
 *
 * @param patientId ID do paciente
 */
export async function reindexPatientEvolutions(patientId: string): Promise<void> {
  return withPerformanceTrace('reindex_patient_evolutions', async () => {
    try {
      const q = query(
        collection(db, 'evolutions'),
        where('patientId', '==', patientId)
      );

      const snapshot = await getDocs(q);
      const ids = snapshot.docs.map(d => d.id);

      await indexBatchEvolutions(ids);

      logger.info(`[VectorSearch] Reindexadas ${ids.length} evoluções do paciente ${patientId}`);
    } catch (error) {
      logger.error(`[VectorSearch] Erro ao reindexar evoluções do paciente ${patientId}:`, error);
      throw error;
    }
  });
}

/**
 * Remove embedding de uma evolução
 *
 * @param evolutionId ID da evolução
 */
export async function removeEvolutionEmbedding(evolutionId: string): Promise<void> {
  try {
    const evolutionRef = doc(db, 'evolutions', evolutionId);
    await updateDoc(evolutionRef, {
      embedding: null,
      embeddingUpdatedAt: null,
    });

    logger.debug(`[VectorSearch] Embedding removido da evolução ${evolutionId}`);
  } catch (error) {
    logger.error(`[VectorSearch] Erro ao remover embedding da evolução ${evolutionId}:`, error);
    throw error;
  }
}

/**
 * Calcula distância entre dois embeddings
 */
export function embeddingDistance(a: number[], b: number[]): number {
  // Distância euclidiana
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Clustering simples de embeddings (K-means)
 *
 * @param embeddings Array de embeddings
 * @param k Número de clusters
 * @returns Array de índices de clusters para cada embedding
 */
export function clusterEmbeddings(
  embeddings: number[][],
  k: number
): number[] {
  if (embeddings.length === 0) return [];
  if (k >= embeddings.length) return embeddings.map((_, i) => i);

  // Inicializar centroids aleatoriamente
  const centroids: number[][] = [];
  const used = new Set<number>();

  while (centroids.length < k && centroids.length < embeddings.length) {
    const idx = Math.floor(Math.random() * embeddings.length);
    if (!used.has(idx)) {
      centroids.push(embeddings[idx]);
      used.add(idx);
    }
  }

  // K-means (max 10 iterações)
  const assignments = new Array(embeddings.length).fill(0);

  for (let iter = 0; iter < 10; iter++) {
    // Assign to closest centroid
    for (let i = 0; i < embeddings.length; i++) {
      let minDist = Infinity;
      let cluster = 0;

      for (let c = 0; c < centroids.length; c++) {
        const dist = embeddingDistance(embeddings[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          cluster = c;
        }
      }

      assignments[i] = cluster;
    }

    // Recalculate centroids
    const newCentroids: number[][] = [];
    for (let c = 0; c < k; c++) {
      const clusterEmbeddings = embeddings.filter((_, i) => assignments[i] === c);

      if (clusterEmbeddings.length === 0) {
        newCentroids.push(centroids[c]);
      } else {
        const newCentroid = new Array(embeddings[0].length).fill(0);
        for (const emb of clusterEmbeddings) {
          for (let j = 0; j < emb.length; j++) {
            newCentroid[j] += emb[j] / clusterEmbeddings.length;
          }
        }
        newCentroids.push(newCentroid);
      }
    }

    // Check convergence
    let converged = true;
    for (let c = 0; c < k; c++) {
      const dist = embeddingDistance(centroids[c], newCentroids[c]);
      if (dist > 0.001) {
        converged = false;
        break;
      }
    }

    centroids.length = 0;
    centroids.push(...newCentroids);

    if (converged) break;
  }

  return assignments;
}

/**
 * Encontra evoluções em um cluster específico
 */
export async function findEvolutionsInCluster(
  clusterEmbeddings: number[][],
  clusterIndex: number,
  assignments: number[],
  minSimilarity: number = 0.8
): Promise<VectorSearchResult[]> {
  // Calcular centroid do cluster
  const clusterEmbs = clusterEmbeddings.filter((_, i) => assignments[i] === clusterIndex);
  if (clusterEmbs.length === 0) return [];

  const centroid = new Array(clusterEmbs[0].length).fill(0);
  for (const emb of clusterEmbs) {
    for (let i = 0; i < emb.length; i++) {
      centroid[i] += emb[i] / clusterEmbs.length;
    }
  }

  // Buscar evoluções similares ao centroid
  const results: VectorSearchResult[] = [];

  for (let i = 0; i < clusterEmbs.length; i++) {
    const similarity = cosineSimilarity(centroid, clusterEmbs[i]);
    if (similarity >= minSimilarity) {
      results.push({
        evolution: {} as Evolution, // Será preenchido pelo caller
        similarity,
        evolutionId: '',
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}
