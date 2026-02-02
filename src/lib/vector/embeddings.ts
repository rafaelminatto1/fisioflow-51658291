/**
 * Vector Embeddings Service
 *
 * DEPRECATED: Supabase Vector integration has been removed.
 * This service needs to be migrated to use pgvector with PostgreSQL Cloud SQL
 * or an alternative vector database service.
 *
 * Current status: Functions return empty results or throw descriptive errors.
 *
 * Migration options:
 * 1. Use pgvector extension with PostgreSQL Cloud SQL
 * 2. Use Firebase ML + Firestore for simple similarity
 * 3. Use dedicated vector service (Pinecone, Weaviate, etc.)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { fisioLogger as logger } from '@/lib/errors/logger';

const getEnv = (key: string): string | undefined => {
  // @ts-expect-error - import.meta is not fully typed in all environments
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-expect-error - import.meta.env is not fully typed
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Initialize Gemini
const apiKey = getEnv('GOOGLE_GENERATIVE_AI_API_KEY') ||
  getEnv('VITE_GOOGLE_GENERATIVE_AI_API_KEY');

if (!apiKey) {
  logger.warn('⚠️ Google Gemini API Key is missing. AI features will not work.', undefined, 'embeddings');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

export interface SemanticSearchResult<T = unknown> {
  id: string;
  similarity: number;
  data: T;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  _model: string = 'text-embedding-004'
): Promise<number[][]> {
  try {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const result = await embeddingModel.embedContent(text);
      embeddings.push(result.embedding.values);
    }
    return embeddings;
  } catch (error) {
    logger.error('Error generating batch embeddings', error, 'embeddings');
    throw error;
  }
}

/**
 * Generate embedding for text using Google Gemini
 */
export async function generateEmbedding(
  text: string,
  _model: string = 'text-embedding-004'
): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    logger.error('Error generating embedding', error, 'embeddings');
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(
  embeddingA: number[],
  embeddingB: number[]
): number {
  if (embeddingA.length !== embeddingB.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embeddingA.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
    normA += embeddingA[i] * embeddingA[i];
    normB += embeddingB[i] * embeddingB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * DEPRECATED: Exercise embedding service
 * Supabase Vector integration removed. Needs migration to pgvector.
 */
export class ExerciseEmbeddingService {
  /**
   * DEPRECATED: Update exercise embedding
   * This function no longer works after Supabase removal.
   */
  async updateExerciseEmbedding(_exerciseId: string): Promise<void> {
    logger.warn(
      'ExerciseEmbeddingService.updateExerciseEmbedding is deprecated. ' +
      'Supabase Vector integration has been removed. ' +
      'Please migrate to pgvector or alternative vector database.',
      undefined,
      'embeddings'
    );
    throw new Error('Exercise embedding service is deprecated. Supabase Vector has been removed.');
  }

  /**
   * DEPRECATED: Search exercises semantically
   * This function no longer works after Supabase removal.
   */
  async searchExercises(
    _query: string,
    _options: {
      threshold?: number;
      limit?: number;
      organizationId?: string;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    logger.warn(
      'ExerciseEmbeddingService.searchExercises is deprecated. ' +
      'Supabase Vector integration has been removed. ' +
      'Please migrate to pgvector or alternative vector database.',
      undefined,
      'embeddings'
    );
    return [];
  }

  /**
   * DEPRECATED: Update all exercise embeddings
   * This function no longer works after Supabase removal.
   */
  async updateAllExerciseEmbeddings(): Promise<void> {
    logger.warn(
      'ExerciseEmbeddingService.updateAllExerciseEmbeddings is deprecated. ' +
      'Supabase Vector integration has been removed. ' +
      'Please migrate to pgvector or alternative vector database.',
      undefined,
      'embeddings'
    );
    throw new Error('Exercise embedding service is deprecated. Supabase Vector has been removed.');
  }
}

/**
 * DEPRECATED: Protocol embedding service
 * Supabase Vector integration removed. Needs migration to pgvector.
 */
export class ProtocolEmbeddingService {
  /**
   * DEPRECATED: Update protocol embedding
   * This function no longer works after Supabase removal.
   */
  async updateProtocolEmbedding(_protocolId: string): Promise<void> {
    logger.warn(
      'ProtocolEmbeddingService.updateProtocolEmbedding is deprecated. ' +
      'Supabase Vector integration has been removed. ' +
      'Please migrate to pgvector or alternative vector database.',
      undefined,
      'embeddings'
    );
    throw new Error('Protocol embedding service is deprecated. Supabase Vector has been removed.');
  }

  /**
   * DEPRECATED: Search protocols semantically
   * This function no longer works after Supabase removal.
   */
  async searchProtocols(
    _query: string,
    _options: {
      threshold?: number;
      limit?: number;
      organizationId?: string;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    logger.warn(
      'ProtocolEmbeddingService.searchProtocols is deprecated. ' +
      'Supabase Vector integration has been removed. ' +
      'Please migrate to pgvector or alternative vector database.',
      undefined,
      'embeddings'
    );
    return [];
  }
}

/**
 * DEPRECATED: Patient similarity service
 * Supabase Vector integration removed. Needs migration to pgvector.
 */
export class PatientSimilarityService {
  /**
   * DEPRECATED: Update patient embedding
   * This function no longer works after Supabase removal.
   */
  async updatePatientEmbedding(_patientId: string): Promise<void> {
    logger.warn(
      'PatientSimilarityService.updatePatientEmbedding is deprecated. ' +
      'Supabase Vector integration has been removed. ' +
      'Please migrate to pgvector or alternative vector database.',
      undefined,
      'embeddings'
    );
    throw new Error('Patient similarity service is deprecated. Supabase Vector has been removed.');
  }

  /**
   * DEPRECATED: Find similar patients
   * This function no longer works after Supabase removal.
   */
  async findSimilarPatients(
    _patientId: string,
    _options: {
      threshold?: number;
      limit?: number;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    logger.warn(
      'PatientSimilarityService.findSimilarPatients is deprecated. ' +
      'Supabase Vector integration has been removed. ' +
      'Please migrate to pgvector or alternative vector database.',
      undefined,
      'embeddings'
    );
    return [];
  }
}

// Export singleton instances (deprecated)
export const exerciseEmbedding = new ExerciseEmbeddingService();
export const protocolEmbedding = new ProtocolEmbeddingService();
export const patientSimilarity = new PatientSimilarityService();
