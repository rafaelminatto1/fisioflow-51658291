/**
 * API Functions: Exercises
 * Cloud Functions para gestão de exercícios
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Pool } from 'pg';
import { authorizeRequest } from '../middleware/auth';

/**
 * Lista exercícios com filtros
 */
export const listExercises = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  await authorizeRequest(request.auth.token);

  const { category, difficulty, search, limit = 100, offset = 0 } = request.data || {};

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

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
    const params: any[] = [];
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
      data: result.rows,
      categories: categoriesResult.rows.map((r: any) => r.category),
    };
  } finally {
    await pool.end();
  }
});

/**
 * Busca um exercício por ID
 */
export const getExercise = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  await authorizeRequest(request.auth.token);
  const { exerciseId } = request.data || {};

  if (!exerciseId) {
    throw new HttpsError('invalid-argument', 'exerciseId é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(
      `SELECT * FROM exercises WHERE id = $1 AND is_active = true`,
      [exerciseId]
    );

    if (result.rows.length === 0) {
      throw new HttpsError('not-found', 'Exercício não encontrado');
    }

    return { data: result.rows[0] };
  } finally {
    await pool.end();
  }
});

/**
 * Busca exercícios similares (usando pgvector se disponível)
 */
export const searchSimilarExercises = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  await authorizeRequest(request.auth.token);
  const { exerciseId, query: searchQuery, limit = 10 } = request.data || {};

  if (!exerciseId && !searchQuery) {
    throw new HttpsError('invalid-argument', 'exerciseId ou query é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    let result;

    if (exerciseId) {
      // Buscar exercício base para pegar categoria
      const baseResult = await pool.query(
        'SELECT category, muscles FROM exercises WHERE id = $1',
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

    return { data: result.rows };
  } finally {
    await pool.end();
  }
});

/**
 * Lista categorias de exercícios
 */
export const getExerciseCategories = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  await authorizeRequest(request.auth.token);

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(
      `SELECT DISTINCT category
       FROM exercises
       WHERE is_active = true
       ORDER BY category`
    );

    return {
      data: result.rows.map((r: any) => ({
        id: r.category.toLowerCase().replace(/\s+/g, '-'),
        name: r.category,
      })),
    };
  } finally {
    await pool.end();
  }
});

/**
 * Registra a realização de um exercício por um paciente
 */
export const logExercise = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId, prescriptionId, difficulty, notes } = request.data || {};

  if (!patientId || !prescriptionId) {
    throw new HttpsError('invalid-argument', 'patientId e prescriptionId são obrigatórios');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

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
  } finally {
    await pool.end();
  }
});

/**
 * Busca exercícios prescritos para um paciente
 */
export const getPrescribedExercises = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { patientId } = request.data || {};

  if (!patientId) {
    throw new HttpsError('invalid-argument', 'patientId é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

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
  } finally {
    await pool.end();
  }
});

/**
 * Cria um novo exercício
 */
export const createExercise = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
    throw new HttpsError('permission-denied', 'Permissão insuficiente para criar exercícios');
  }

  const exercise = request.data || {};

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

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

    return { data: result.rows[0] };
  } finally {
    await pool.end();
  }
});

/**
 * Atualiza um exercício existente
 */
export const updateExercise = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
    throw new HttpsError('permission-denied', 'Permissão insuficiente para atualizar exercícios');
  }

  const { id, ...updates } = request.data || {};

  if (!id) {
    throw new HttpsError('invalid-argument', 'ID do exercício é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) {
      const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
      return { data: result.rows[0] };
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

    return { data: result.rows[0] };
  } finally {
    await pool.end();
  }
});

/**
 * Remove (desativa) um exercício
 */
export const deleteExercise = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem excluir exercícios');
  }

  const { id } = request.data || {};

  if (!id) {
    throw new HttpsError('invalid-argument', 'ID do exercício é obrigatório');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

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
  } finally {
    await pool.end();
  }
});

/**
 * Une exercícios duplicados
 */
export const mergeExercises = onCall(async (request) => {
  if (!request.auth?.token) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem unir exercícios');
  }

  const { keepId, mergeIds } = request.data || {};

  if (!keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
    throw new HttpsError('invalid-argument', 'keepId e mergeIds (array) são obrigatórios');
  }

  const pool = new Pool({
    connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

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

    return { success: true, deletedCount: deleteResult.rowCount };
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  } finally {
    await pool.end();
  }
});
