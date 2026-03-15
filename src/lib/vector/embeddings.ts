/**
 * Vector Embeddings Service
 *
 * This service uses Google Gemini to generate embeddings.
 * For storing and searching vectors, consider using pgvector with PostgreSQL
 * or an alternative vector database service.
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

