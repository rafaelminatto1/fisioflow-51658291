import { CORS_ORIGINS, getPool } from '../init';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { Exercise } from '../types/models';
import { logger } from '../lib/logger';
import { setCorsHeaders } from '../lib/cors';

function getAuthHeader(req: any): string | undefined {
  const h = req.headers?.authorization || req.headers?.Authorization;
  return Array.isArray(h) ? h[0] : h;
}

function parseBody(req: any): any {
  return typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
}

// ============================================================================
// HTTP VERSIONS (CORS fix)
// ============================================================================

export const listExercisesHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { category, difficulty, search, limit = 100, offset = 0 } = parseBody(req);
    const pool = getPool();
    let query = `SELECT id,name,slug,category,description,instructions,muscles,equipment,difficulty,video_url,image_url,duration_minutes,sets_recommended,reps_recommended,precautions,benefits,tags FROM exercises WHERE is_active = true`;
    const params: (string | number)[] = [];
    let paramCount = 0;
    if (category) { paramCount++; query += ` AND category = $${paramCount}`; params.push(category); }
    if (difficulty) { paramCount++; query += ` AND difficulty = $${paramCount}`; params.push(difficulty); }
    if (search) { paramCount++; query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`; params.push(`%${search}%`); }
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    const categoriesResult = await pool.query('SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category');
    res.json({ data: result.rows, categories: categoriesResult.rows.map((r: { category: string }) => r.category) });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('listExercisesHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao listar exercícios' });
  }
});

export const searchSimilarExercisesHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { exerciseId, query: searchQuery, limit = 10 } = parseBody(req);
    if (!exerciseId && !searchQuery) { res.status(400).json({ error: 'exerciseId ou query é obrigatório' }); return; }
    const pool = getPool();
    let result;
    if (exerciseId) {
      const baseResult = await pool.query('SELECT category FROM exercises WHERE id = $1', [exerciseId]);
      if (baseResult.rows.length === 0) { res.status(404).json({ error: 'Exercício não encontrado' }); return; }
      result = await pool.query(`SELECT * FROM exercises WHERE is_active = true AND id != $1 AND category = $2 ORDER BY name LIMIT $3`, [exerciseId, baseResult.rows[0].category, limit]);
    } else {
      result = await pool.query(`SELECT * FROM exercises WHERE is_active = true AND (name ILIKE $1 OR description ILIKE $1 OR $1 = ANY(tags)) ORDER BY name LIMIT $2`, [`%${searchQuery}%`, limit]);
    }
    res.json({ data: result.rows });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('searchSimilarExercisesHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao buscar similares' });
  }
});

export const getExerciseHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { exerciseId } = parseBody(req);
    if (!exerciseId) { res.status(400).json({ error: 'exerciseId é obrigatório' }); return; }
    const pool = getPool();
    const result = await pool.query('SELECT * FROM exercises WHERE id = $1 AND is_active = true', [exerciseId]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Exercício não encontrado' }); return; }
    res.json({ data: result.rows[0] });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('getExerciseHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao buscar exercício' });
  }
});

export const getExerciseCategoriesHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const pool = getPool();
    const result = await pool.query('SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category');
    res.json({ data: result.rows.map((r: { category: string }) => ({ id: r.category.toLowerCase().replace(/\s+/g, '-'), name: r.category })) });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('getExerciseCategoriesHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao listar categorias' });
  }
});

export const getPrescribedExercisesHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId } = parseBody(req);
    if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }
    const pool = getPool();
    const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
    if (patientCheck.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }
    const result = await pool.query(`SELECT pe.id,pe.patient_id,pe.exercise_id,pe.sets,pe.reps,pe.duration,pe.frequency,pe.is_active,pe.created_at,e.id as exercise_data_id,e.name,e.category,e.difficulty,e.video_url,e.image_url FROM prescribed_exercises pe JOIN exercises e ON pe.exercise_id=e.id WHERE pe.patient_id=$1 AND pe.is_active=true`, [patientId]);
    const data = result.rows.map((row: any) => ({ id: row.id, patient_id: row.patient_id, exercise_id: row.exercise_id, sets: row.sets, reps: row.reps, duration: row.duration, frequency: row.frequency, is_active: row.is_active, created_at: row.created_at, exercise: { id: row.exercise_data_id, name: row.name, category: row.category, difficulty_level: row.difficulty, video_url: row.video_url, thumbnail_url: row.image_url, image_url: row.image_url } }));
    res.json({ data });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('getPrescribedExercisesHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao buscar prescrições' });
  }
});

export const logExerciseHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId, prescriptionId, difficulty, notes } = parseBody(req);
    if (!patientId || !prescriptionId) { res.status(400).json({ error: 'patientId e prescriptionId são obrigatórios' }); return; }
    const pool = getPool();
    const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
    if (patientCheck.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }
    const result = await pool.query(`INSERT INTO exercise_logs (patient_id, prescribed_exercise_id, difficulty_rating, notes, complete_date) VALUES ($1,$2,$3,$4,NOW()) RETURNING *`, [patientId, prescriptionId, difficulty ?? 0, notes || null]);
    res.json({ data: result.rows[0] });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('logExerciseHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao registrar exercício' });
  }
});

export const createExerciseHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') { res.status(403).json({ error: 'Permissão insuficiente' }); return; }
    const exercise = parseBody(req);
    const imageUrl = exercise.image_url || exercise.thumbnail_url || null;
    const pool = getPool();
    const result = await pool.query(`INSERT INTO exercises (name,category,difficulty,description,instructions,muscles,equipment,video_url,image_url,duration_minutes,sets_recommended,reps_recommended,precautions,benefits,tags,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true) RETURNING *`, [exercise.name, exercise.category, exercise.difficulty || 'médio', exercise.description || null, exercise.instructions || null, exercise.muscles || [], exercise.equipment || [], exercise.video_url || null, imageUrl, exercise.duration_minutes || 0, exercise.sets_recommended || 3, exercise.reps_recommended || 10, exercise.precautions || null, exercise.benefits || null, exercise.tags || []]);
    res.status(201).json({ data: result.rows[0] });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('createExerciseHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao criar exercício' });
  }
});

export const updateExerciseHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') { res.status(403).json({ error: 'Permissão insuficiente' }); return; }
    const { id, ...updates } = parseBody(req);
    if (!id) { res.status(400).json({ error: 'ID do exercício é obrigatório' }); return; }
    const pool = getPool();
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) {
      const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
      if (result.rows.length === 0) { res.status(404).json({ error: 'Exercício não encontrado' }); return; }
      res.json({ data: result.rows[0] });
      return;
    }
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f]);
    const result = await pool.query(`UPDATE exercises SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...values]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Exercício não encontrado' }); return; }
    res.json({ data: result.rows[0] });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('updateExerciseHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao atualizar exercício' });
  }
});

export const deleteExerciseHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    if (auth.role !== 'admin') { res.status(403).json({ error: 'Apenas administradores podem excluir' }); return; }
    const { id } = parseBody(req);
    if (!id) { res.status(400).json({ error: 'ID do exercício é obrigatório' }); return; }
    const pool = getPool();
    const result = await pool.query('UPDATE exercises SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Exercício não encontrado' }); return; }
    res.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('deleteExerciseHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao excluir exercício' });
  }
});

export const mergeExercisesHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    if (auth.role !== 'admin') { res.status(403).json({ error: 'Apenas administradores podem unir' }); return; }
    const { keepId, mergeIds } = parseBody(req);
    if (!keepId || !mergeIds?.length) { res.status(400).json({ error: 'keepId e mergeIds são obrigatórios' }); return; }
    const pool = getPool();
    for (const mid of mergeIds) {
      await pool.query('UPDATE prescribed_exercises SET exercise_id = $1 WHERE exercise_id = $2', [keepId, mid]);
      await pool.query('UPDATE exercises SET is_active = false WHERE id = $1', [mid]);
    }
    res.json({ success: true, deletedCount: mergeIds.length });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('mergeExercisesHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao unir exercícios' });
  }
});

// ============================================================================
// INTERFACES & CALLABLE
// ============================================================================

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

/**
 * Lista exercícios cadastrados
 */
export const listExercisesHandler = async (request: any) => {
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
        video_url, image_url, duration_minutes,
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

    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
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
};

export const listExercises = onCall<ListExercisesRequest, Promise<ListExercisesResponse>>(
  { cors: CORS_ORIGINS },
  listExercisesHandler
);

interface GetExerciseRequest {
  exerciseId: string;
}

interface GetExerciseResponse {
  data: Exercise;
}

/**
 * Busca um exercício por ID
 */
export const getExerciseHandler = async (request: any) => {
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
};

export const getExercise = onCall<GetExerciseRequest, Promise<GetExerciseResponse>>(
  { cors: CORS_ORIGINS },
  getExerciseHandler
);

/**
 * Registra a realização de um exercício
 */
export const logExerciseHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  const auth = await authorizeRequest(request.auth.token);
  const { prescriptionId, exerciseId, sets, reps, load, effort, notes } = request.data;

  if (!exerciseId || !sets || !reps) {
    throw new HttpsError('invalid-argument', 'exercício, séries e repetições são obrigatórios');
  }

  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO exercise_logs (
        organization_id, user_id, prescription_id, exercise_id,
        sets, reps, load, effort_level, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [auth.organizationId, auth.userId, prescriptionId || null, exerciseId, sets, reps, load || null, effort || null, notes || '']
    );

    return { data: result.rows[0] };
  } catch (error: unknown) {
    logger.error('Error in logExercise:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao registrar exercício';
    throw new HttpsError('internal', errorMessage);
  }
};

interface SearchSimilarExercisesRequest {
  exerciseId?: string;
  query?: string;
  limit?: number;
}

interface SearchSimilarExercisesResponse {
  data: Exercise[];
}

/**
 * Busca exercícios similares
 */
export const searchSimilarExercisesHandler = async (request: any) => {
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
         ORDER BY name
         LIMIT $3`,
        [exerciseId, baseExercise.category, limit]
      );
    } else {
      // Busca textual
      result = await pool.query(
        `SELECT * FROM exercises
         WHERE is_active = true
           AND (name ILIKE $1 OR description ILIKE $1 OR $1 = ANY(tags))
         ORDER BY name
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
};

export const searchSimilarExercises = onCall<SearchSimilarExercisesRequest, Promise<SearchSimilarExercisesResponse>>(
  { cors: CORS_ORIGINS },
  searchSimilarExercisesHandler
);

interface GetExerciseCategoriesResponse {
  data: { id: string, name: string }[];
}

/**
 * Lista categorias de exercícios
 */
export const getExerciseCategoriesHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category ASC`
    );

    return {
      data: result.rows.map((r: { category: string }) => ({
        id: r.category.toLowerCase().replace(/\s+/g, '-'),
        name: r.category,
      }))
    };
  } catch (error: unknown) {
    logger.error('Error in getExerciseCategories:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar categorias';
    throw new HttpsError('internal', errorMessage);
  }
};

export const getExerciseCategories = onCall<Record<string, never>, Promise<GetExerciseCategoriesResponse>>(
  { cors: CORS_ORIGINS },
  getExerciseCategoriesHandler
);

interface LogExerciseRequest {
  prescriptionId?: string;
  exerciseId: string;
  sets: number;
  reps: number;
  load?: number;
  effort?: number;
  notes?: string;
}

interface LogExerciseResponse {
  data: any; // Using explicit any for now as ExerciseLog model is not strictly defined in models.ts yet
}

export const logExercise = onCall<LogExerciseRequest, Promise<LogExerciseResponse>>(
  { cors: CORS_ORIGINS },
  logExerciseHandler
);

interface GetPrescribedExercisesRequest {
  patientId: string;
}

interface GetPrescribedExercisesResponse {
  data: any[]; // Using explicit any for PrescribedExercise rich type
}

/**
 * Lista exercícios prescritos para um paciente
 */
export const getPrescribedExercisesHandler = async (request: any) => {
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
        e.video_url, e.image_url
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
        thumbnail_url: row.image_url,
        image_url: row.image_url
      }
    }));

    return { data };
  } catch (error: unknown) {
    logger.error('Error in getPrescribedExercises:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar prescrições';
    throw new HttpsError('internal', errorMessage);
  }
};

export const getPrescribedExercises = onCall<GetPrescribedExercisesRequest, Promise<GetPrescribedExercisesResponse>>(
  { cors: CORS_ORIGINS },
  getPrescribedExercisesHandler
);

interface CreateExerciseRequest {
  name: string;
  category: string;
  difficulty?: string;
  description?: string;
  instructions?: string;
  muscles?: string[];
  equipment?: string[];
  video_url?: string;
  image_url?: string;
  duration_minutes?: number;
  sets_recommended?: number;
  reps_recommended?: number;
  precautions?: string;
  benefits?: string;
  tags?: string[];
}

interface CreateExerciseResponse {
  data: Exercise;
}

/**
 * Cria um novo exercício
 */
export const createExerciseHandler = async (request: any) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);

  if (auth.role !== 'admin' && auth.role !== 'fisioterapeuta') {
    throw new HttpsError('permission-denied', 'Permissão insuficiente para criar exercícios');
  }

  const exercise = request.data;
  const imageUrl = exercise.image_url || exercise.thumbnail_url || null;

  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO exercises (
        name, category, difficulty, description, instructions,
        muscles, equipment, video_url, image_url,
        duration_minutes, sets_recommended, reps_recommended,
        precautions, benefits, tags, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
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
        imageUrl,
        exercise.duration_minutes || 0,
        exercise.sets_recommended || 3,
        exercise.reps_recommended || 10,
        exercise.precautions || null,
        exercise.benefits || null,
        exercise.tags || []
      ]
    );

    return { data: result.rows[0] as Exercise };
  } catch (error: unknown) {
    logger.error('Error in createExercise:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar exercício';
    throw new HttpsError('internal', errorMessage);
  }
};

export const createExercise = onCall<CreateExerciseRequest, Promise<CreateExerciseResponse>>(
  { cors: CORS_ORIGINS },
  createExerciseHandler
);

interface UpdateExerciseRequest {
  id: string;
  [key: string]: any;
}

/**
 * Atualiza um exercício existente
 */
export const updateExerciseHandler = async (request: any) => {
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
};

export const updateExercise = onCall<UpdateExerciseRequest, Promise<{ data: Exercise }>>(
  { cors: CORS_ORIGINS },
  updateExerciseHandler
);

interface DeleteExerciseRequest {
  id: string;
}

/**
 * Exclui logicamente um exercício
 */
export const deleteExerciseHandler = async (request: any) => {
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
};

export const deleteExercise = onCall<DeleteExerciseRequest, Promise<{ success: boolean }>>(
  { cors: CORS_ORIGINS },
  deleteExerciseHandler
);

interface MergeExercisesRequest {
  keepId: string;
  mergeIds: string[];
}

/**
 * Une exercícios duplicados
 */
export const mergeExercisesHandler = async (request: any) => {
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
};

export const mergeExercises = onCall<MergeExercisesRequest, Promise<{ success: boolean, deletedCount: number }>>(
  { cors: CORS_ORIGINS },
  mergeExercisesHandler
);
