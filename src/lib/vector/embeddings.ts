/**
 * Supabase Vector Embeddings Service
 *
 * Manages vector embeddings for semantic search using Supabase Vector
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface SemanticSearchResult<T = any> {
  id: string;
  similarity: number;
  data: T;
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model,
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  model: string = 'text-embedding-3-small'
): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model,
      input: texts,
      encoding_format: 'float',
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
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
 * Exercise embedding service
 */
export class ExerciseEmbeddingService {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  /**
   * Generate and store embedding for an exercise
   */
  async updateExerciseEmbedding(exerciseId: string): Promise<void> {
    try {
      // Get exercise data
      const { data: exercise, error } = await this.supabase
        .from('exercises')
        .select('id, name, description, instructions, category, difficulty, muscle_groups')
        .eq('id', exerciseId)
        .single();

      if (error || !exercise) {
        throw new Error('Exercise not found');
      }

      // Combine text fields for embedding
      const combinedText = [
        exercise.name,
        exercise.description,
        exercise.instructions || '',
        exercise.category,
        exercise.difficulty,
        ...(exercise.muscle_groups || []),
      ].join(' ');

      // Generate embedding
      const embedding = await generateEmbedding(combinedText);

      // Update exercise with embedding
      const { error: updateError } = await this.supabase
        .from('exercises')
        .update({ embedding })
        .eq('id', exerciseId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating exercise embedding:', error);
      throw error;
    }
  }

  /**
   * Semantic search for exercises
   */
  async searchExercises(
    query: string,
    options: {
      threshold?: number;
      limit?: number;
      organizationId?: string;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    const { threshold = 0.75, limit = 10, organizationId } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await generateEmbedding(query);

      // Call Supabase RPC function
      const { data, error } = await this.supabase.rpc('search_exercises_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        organization_id_param: organizationId || null,
      });

      if (error) {
        throw error;
      }

      return (data || []).map(result => ({
        id: result.id,
        similarity: result.similarity,
        data: {
          name: result.name,
          description: result.description,
          category: result.category,
          difficulty: result.difficulty,
        },
      }));
    } catch (error) {
      console.error('Error searching exercises:', error);
      throw error;
    }
  }

  /**
   * Batch update embeddings for all exercises
   */
  async updateAllExerciseEmbeddings(): Promise<void> {
    try {
      const { data: exercises, error } = await this.supabase
        .from('exercises')
        .select('id, name, description, instructions, category, difficulty, muscle_groups')
        .is('embedding', null);

      if (error) {
        throw error;
      }

      console.log(`Updating embeddings for ${exercises?.length || 0} exercises...`);

      for (const exercise of exercises || []) {
        try {
          const combinedText = [
            exercise.name,
            exercise.description,
            exercise.instructions || '',
            exercise.category,
            exercise.difficulty,
            ...(exercise.muscle_groups || []),
          ].join(' ');

          const embedding = await generateEmbedding(combinedText);

          await this.supabase
            .from('exercises')
            .update({ embedding })
            .eq('id', exercise.id);

          // Rate limiting - avoid hitting OpenAI rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error updating embedding for exercise ${exercise.id}:`, error);
        }
      }

      console.log('Finished updating exercise embeddings');
    } catch (error) {
      console.error('Error in batch update:', error);
      throw error;
    }
  }
}

/**
 * Protocol embedding service
 */
export class ProtocolEmbeddingService {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  /**
   * Generate and store embedding for a protocol
   */
  async updateProtocolEmbedding(protocolId: string): Promise<void> {
    try {
      const { data: protocol, error } = await this.supabase
        .from('protocols')
        .select('*')
        .eq('id', protocolId)
        .single();

      if (error || !protocol) {
        throw new Error('Protocol not found');
      }

      const combinedText = [
        protocol.name,
        protocol.description,
        protocol.objectives || '',
        protocol.category || '',
        protocol.indications || '',
        protocol.contraindications || '',
      ].join(' ');

      const embedding = await generateEmbedding(combinedText);

      const { error: updateError } = await this.supabase
        .from('protocols')
        .update({ embedding })
        .eq('id', protocolId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating protocol embedding:', error);
      throw error;
    }
  }

  /**
   * Semantic search for protocols
   */
  async searchProtocols(
    query: string,
    options: {
      threshold?: number;
      limit?: number;
      organizationId?: string;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    const { threshold = 0.75, limit = 10, organizationId } = options;

    try {
      const queryEmbedding = await generateEmbedding(query);

      const { data, error } = await this.supabase.rpc('search_protocols_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        organization_id_param: organizationId || null,
      });

      if (error) {
        throw error;
      }

      return (data || []).map(result => ({
        id: result.id,
        similarity: result.similarity,
        data: {
          name: result.name,
          description: result.description,
          category: result.category,
          duration_weeks: result.duration_weeks,
        },
      }));
    } catch (error) {
      console.error('Error searching protocols:', error);
      throw error;
    }
  }
}

/**
 * Patient similarity service
 */
export class PatientSimilarityService {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  /**
   * Generate and store embedding for patient clinical history
   */
  async updatePatientEmbedding(patientId: string): Promise<void> {
    try {
      // Get patient data including medical records
      const { data: patient, error } = await this.supabase
        .from('patients')
        .select('id, name, date_of_birth, primary_diagnosis, secondary_diagnoses, surgeries, pathologies')
        .eq('id', patientId)
        .single();

      if (error || !patient) {
        throw new Error('Patient not found');
      }

      // Combine clinical information
      const combinedText = [
        patient.primary_diagnosis || '',
        ...(patient.secondary_diagnoses || []),
        ...(patient.surgeries || []),
        ...(patient.pathologies || []),
      ].join(' ');

      const embedding = await generateEmbedding(combinedText);

      const { error: updateError } = await this.supabase
        .from('patients')
        .update({ clinical_history_embedding: embedding })
        .eq('id', patientId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating patient embedding:', error);
      throw error;
    }
  }

  /**
   * Find similar patients based on clinical history
   */
  async findSimilarPatients(
    patientId: string,
    options: {
      threshold?: number;
      limit?: number;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    const { threshold = 0.8, limit = 5 } = options;

    try {
      // Get patient's embedding
      const { data: patient, error } = await this.supabase
        .from('patients')
        .select('clinical_history_embedding, organization_id')
        .eq('id', patientId)
        .single();

      if (error || !patient?.clinical_history_embedding) {
        throw new Error('Patient embedding not found');
      }

      // Call similarity search function
      const { data, error: searchError } = await this.supabase.rpc('find_similar_patients', {
        clinical_embedding: patient.clinical_history_embedding,
        match_threshold: threshold,
        match_count: limit,
        organization_id_param: patient.organization_id,
      });

      if (searchError) {
        throw searchError;
      }

      return (data || []).map(result => ({
        id: result.id,
        similarity: result.similarity,
        data: {
          name: result.name,
          age: result.age,
          primary_diagnosis: result.primary_diagnosis,
        },
      }));
    } catch (error) {
      console.error('Error finding similar patients:', error);
      throw error;
    }
  }
}

// Export singleton instances
export const exerciseEmbedding = new ExerciseEmbeddingService();
export const protocolEmbedding = new ProtocolEmbeddingService();
export const patientSimilarity = new PatientSimilarityService();
