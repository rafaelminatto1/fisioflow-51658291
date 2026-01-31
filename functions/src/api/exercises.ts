import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool, CORS_ORIGINS } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { Exercise } from '../types/models';
import { logger } from '../lib/logger';

/**
 * Interfaces
 */
interface ListExercisesRequest {
  category?: string;
  difficulty?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface ListExercisesResponse {
  data: Exercise[];
  categories: string[];
}

export const listExercises = onCall<ListExercisesRequest, Promise<ListExercisesResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  await authorizeRequest(request.auth.token);

  const { category, difficulty, search, limit = 100, offset = 0 } = request.data;

  const pool = getPool();

  try {
    let query = `
      SELECT
        id, name, slug, category, description,
        instructions, muscles, equipment, difficulty,
        video_url, thumbnail_url, duration_minutes,
        sets_recommended, reps_recommended, precautions,
        benefits, tags
      FROM exercises
      WHERE is_active = true
    `;
    const params: (string | number)[] = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (difficulty) {
      paramCount++;
      query += ` AND difficulty = $${paramCount}`;
      params.push(difficulty);
    }

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY display_order, name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Buscar categorias distintas
    const categoriesResult = await pool.query(
      `SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category`
    );

    return {
      data: result.rows as Exercise[],
      categories: categoriesResult.rows.map((r: { category: string }) => r.category),
    };
  } catch (error: unknown) {
    logger.error('Error in listExercises:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar exercícios';
    throw new HttpsError('internal', errorMessage);
  }
});

interface GetExerciseRequest {
  exerciseId: string;
}

interface GetExerciseResponse {
  data: Exercise;
}

export const getExercise = onCall<GetExerciseRequest, Promise<GetExerciseResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  await authorizeRequest(request.auth.token);
  const { exerciseId } = request.data;

  if (!exerciseId) {
    throw new HttpsError('invalid-argument', 'exerciseId é obrigatório');
  }

  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT * FROM exercises WHERE id = $1 AND is_active = true`,
      [exerciseId]
    );

    if (result.rows.length === 0) {
      throw new HttpsError('not-found', 'Exercício não encontrado');
    }

    return { data: result.rows[0] as Exercise };
  } catch (error: unknown) {
    logger.error('Error in getExercise:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar exercício';
    throw new HttpsError('internal', errorMessage);
  }
});

interface SearchSimilarExercisesRequest {
  exerciseId?: string;
  query?: string;
  limit?: number;
}

interface SearchSimilarExercisesResponse {
  data: Exercise[];
}

export const searchSimilarExercises = onCall<SearchSimilarExercisesRequest, Promise<SearchSimilarExercisesResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  await authorizeRequest(request.auth.token);
  const { exerciseId, query: searchQuery, limit = 10 } = request.data;

  if (!exerciseId && !searchQuery) {
    throw new HttpsError('invalid-argument', 'exerciseId ou query é obrigatório');
  }

  const pool = getPool();

  try {
    let result;

    if (exerciseId) {
      // Buscar exercício base para pegar categoria
      const baseResult = await pool.query(
        'SELECT category FROM exercises WHERE id = $1',
        [exerciseId]
      );

      if (baseResult.rows.length === 0) {
        throw new HttpsError('not-found', 'Exercício não encontrado');
      }

      const baseExercise = baseResult.rows[0];

      // Buscar exercícios similares da mesma categoria
      result = await pool.query(
        `SELECT * FROM exercises
         WHERE is_active = true
           AND id != $1
           AND category = $2
         ORDER BY display_order, name
         LIMIT $3`,
        [exerciseId, baseExercise.category, limit]
      );
    } else {
      // Busca textual
      result = await pool.query(
        `SELECT * FROM exercises
         WHERE is_active = true
           AND (name ILIKE $1 OR description ILIKE $1 OR $1 = ANY(tags))
         ORDER BY display_order, name
         LIMIT $2`,
        [`%${searchQuery}%`, limit]
      );
    }

    return { data: result.rows as Exercise[] };
  } catch (error: unknown) {
    logger.error('Error in searchSimilarExercises:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar exercícios similares';
    throw new HttpsError('internal', errorMessage);
  }
});

interface GetExerciseCategoriesResponse {
  data: { id: string, name: string }[];
}

export const getExerciseCategories = onCall<{}, Promise<GetExerciseCategoriesResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  await authorizeRequest(request.auth.token);

  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT DISTINCT category
       FROM exercises
       WHERE is_active = true
       ORDER BY category`
    );

    return {
      data: result.rows.map((r: { category: string }) => ({
        id: r.category.toLowerCase().replace(/\s+/g, '-'),
        name: r.category,
      })),
    };
  } catch (error: unknown) {
    logger.error('Error in getExerciseCategories:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar categorias';
    throw new HttpsError('internal', errorMessage);
  }
});

interface LogExerciseRequest {
  patientId: string;
  prescriptionId: string;
  difficulty: number;
  notes?: string;
}

interface LogExerciseResponse {
  data: any; // Using explicit any for now as ExerciseLog model is not strictly defined in models.ts yet
}

export const logExercise = onCall<LogExerciseRequest, Promise<LogExerciseResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, prescriptionId, difficulty, notes } = request.data;

  if (!patientId || !prescriptionId) {
    throw new HttpsError('invalid-argument', 'patientId e prescriptionId são obrigatórios');
  }

  const pool = getPool();

  try {
    // Verificar se paciente pertence à organização
    const patientCheck = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (patientCheck.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    const result = await pool.query(
      `INSERT INTO exercise_logs (
        patient_id, prescribed_exercise_id,
        difficulty_rating, notes, complete_date
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [
        patientId,
        prescriptionId,
        difficulty,
        notes || null,
      ]
    );

    return { data: result.rows[0] };
  } catch (error: unknown) {
    logger.error('Error in logExercise:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao registrar exercício';
    throw new HttpsError('internal', errorMessage);
  }
});

interface GetPrescribedExercisesRequest {
  patientId: string;
}

interface GetPrescribedExercisesResponse {
  data: any[]; // Using explicit any for PrescribedExercise rich type
}

export const getPrescribedExercises = onCall<GetPrescribedExercisesRequest, Promise<GetPrescribedExercisesResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId } = request.data;

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = getPool();

  try {
    // Verificar se paciente pertence à organização
    const patientCheck = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, auth.organizationId]
    );

    if (patientCheck.rows.length === 0) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }

    const result = await pool.query(
      `SELECT
        pe.id, pe.patient_id, pe.exercise_id, pe.sets, pe.reps,
        pe.duration, pe.frequency, pe.is_active, pe.created_at,
        e.id as exercise_data_id, e.name, e.category, e.difficulty,
        e.video_url, e.thumbnail_url
      FROM prescribed_exercises pe
      JOIN exercises e ON pe.exercise_id = e.id
      WHERE pe.patient_id = $1
        AND pe.is_active = true`,
      [patientId]
    );

    const data = result.rows.map((row: any) => ({
      id: row.id,
      patient_id: row.patient_id,
      exercise_id: row.exercise_id,
      sets: row.sets,
      reps: row.reps,
      duration: row.duration,
      frequency: row.frequency,
      is_active: row.is_active,
      created_at: row.created_at,
      exercise: {
        id: row.exercise_data_id,
        name: row.name,
        category: row.category,
        difficulty_level: row.difficulty,
        video_url: row.video_url,
        thumbnail_url: row.thumbnail_url
      }
    }));

    return { data };
  } catch (error: unknown) {
    logger.error('Error in getPrescribedExercises:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar prescrições';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CreateExerciseRequest {
  name: string;
  category: string;
  difficulty?: string;
  description?: string;
  instructions?: string;
  muscles?: string[];
  equipment?: string[];
  video_url?: string;
  thumbnail_url?: string;
  duration_minutes?: number;
  sets_recommended?: number;
  reps_recommended?: number;
  precautions?: string;
  benefits?: string;
  tags?: string[];
  display_order?: number;
}

interface CreateExerciseResponse {
  data: Exercise;
}

export const createExercise = onCall<CreateExerciseRequest, Promise<CreateExerciseResponse>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
    throw new HttpsError('permission-denied', 'Permissão insuficiente para criar exercícios');
  }

  const exercise = request.data;

  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO exercises (
        name, category, difficulty, description, instructions,
        muscles, equipment, video_url, thumbnail_url,
        duration_minutes, sets_recommended, reps_recommended,
        precautions, benefits, tags, display_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
      RETURNING *`,
      [
        exercise.name,
        exercise.category,
        exercise.difficulty || 'médio',
        exercise.description || null,
        exercise.instructions || null,
        exercise.muscles || [],
        exercise.equipment || [],
        exercise.video_url || null,
        exercise.thumbnail_url || null,
        exercise.duration_minutes || 0,
        exercise.sets_recommended || 3,
        exercise.reps_recommended || 10,
        exercise.precautions || null,
        exercise.benefits || null,
        exercise.tags || [],
        exercise.display_order || 0
      ]
    );

    return { data: result.rows[0] as Exercise };
  } catch (error: unknown) {
    logger.error('Error in createExercise:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar exercício';
    throw new HttpsError('internal', errorMessage);
  }
});

interface UpdateExerciseRequest {
  id: string;
  [key: string]: any;
}

export const updateExercise = onCall<UpdateExerciseRequest, Promise<{ data: Exercise }>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
    throw new HttpsError('permission-denied', 'Permissão insuficiente para atualizar exercícios');
  }

  const { id, ...updates } = request.data;

  if (!id) {
    throw new HttpsError('invalid-argument', 'ID do exercício é obrigatório');
  }

  const pool = getPool();

  try {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) {
      const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
      return { data: result.rows[0] as Exercise };
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE exercises SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      throw new HttpsError('not-found', 'Exercício não encontrado');
    }

    return { data: result.rows[0] as Exercise };
  } catch (error: unknown) {
    logger.error('Error in updateExercise:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar exercício';
    throw new HttpsError('internal', errorMessage);
  }
});

interface DeleteExerciseRequest {
  id: string;
}

export const deleteExercise = onCall<DeleteExerciseRequest, Promise<{ success: boolean }>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem excluir exercícios');
  }

  const { id } = request.data;

  if (!id) {
    throw new HttpsError('invalid-argument', 'ID do exercício é obrigatório');
  }

  const pool = getPool();

  try {
    // Soft delete preferencialmente
    const result = await pool.query(
      `UPDATE exercises SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new HttpsError('not-found', 'Exercício não encontrado');
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('Error in deleteExercise:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir exercício';
    throw new HttpsError('internal', errorMessage);
  }
});

interface MergeExercisesRequest {
  keepId: string;
  mergeIds: string[];
}

export const mergeExercises = onCall<MergeExercisesRequest, Promise<{ success: boolean, deletedCount: number }>>({ cors: CORS_ORIGINS }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem unir exercícios');
  }

  const { keepId, mergeIds } = request.data;

  if (!keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
    throw new HttpsError('invalid-argument', 'keepId e mergeIds (array) são obrigatórios');
  }

  const pool = getPool();

  try {
    await pool.query('BEGIN');

    // 1. Atualizar todas as prescrições que usam os IDs a serem removidos
    await pool.query(
      `UPDATE prescribed_exercises SET exercise_id = $1 WHERE exercise_id = ANY($2)`,
      [keepId, mergeIds]
    );

    // 2. Atualizar todos os logs que usam os IDs a serem removidos
    await pool.query(
      `UPDATE exercise_logs SET prescribed_exercise_id = (
         SELECT id FROM prescribed_exercises WHERE exercise_id = $1 LIMIT 1
       ) WHERE prescribed_exercise_id IN (
         SELECT id FROM prescribed_exercises WHERE exercise_id = ANY($2)
       )`,
      [keepId, mergeIds]
    );

    // 3. Remover os exercícios duplicados
    const deleteResult = await pool.query(
      `DELETE FROM exercises WHERE id = ANY($1) AND id != $2`,
      [mergeIds, keepId]
    );

    await pool.query('COMMIT');

    return { success: true, deletedCount: deleteResult.rowCount || 0 };
  } catch (err: unknown) {
    await pool.query('ROLLBACK');
    logger.error('Error in mergeExercises:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro ao unir exercícios';
    throw new HttpsError('internal', errorMessage);
  }
});
