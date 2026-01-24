"use strict";
/**
 * API Functions: Exercises
 * Cloud Functions para gestão de exercícios
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExerciseCategories = exports.searchSimilarExercises = exports.getExercise = exports.listExercises = void 0;
const https_1 = require("firebase-functions/v2/https");
const pg_1 = require("pg");
const auth_1 = require("../middleware/auth");
/**
 * Lista exercícios com filtros
 */
exports.listExercises = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.token) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const { category, difficulty, search, limit = 100, offset = 0 } = request.data || {};
    const pool = new pg_1.Pool({
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
        const params = [];
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
        const categoriesResult = await pool.query(`SELECT DISTINCT category FROM exercises WHERE is_active = true ORDER BY category`);
        return {
            data: result.rows,
            categories: categoriesResult.rows.map((r) => r.category),
        };
    }
    finally {
        await pool.end();
    }
});
/**
 * Busca um exercício por ID
 */
exports.getExercise = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.token) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const { exerciseId } = request.data || {};
    if (!exerciseId) {
        throw new https_1.HttpsError('invalid-argument', 'exerciseId é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        const result = await pool.query(`SELECT * FROM exercises WHERE id = $1 AND is_active = true`, [exerciseId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
        }
        return { data: result.rows[0] };
    }
    finally {
        await pool.end();
    }
});
/**
 * Busca exercícios similares (usando pgvector se disponível)
 */
exports.searchSimilarExercises = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.token) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const { exerciseId, query: searchQuery, limit = 10 } = request.data || {};
    if (!exerciseId && !searchQuery) {
        throw new https_1.HttpsError('invalid-argument', 'exerciseId ou query é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        let result;
        if (exerciseId) {
            // Buscar exercício base para pegar categoria
            const baseResult = await pool.query('SELECT category, muscles FROM exercises WHERE id = $1', [exerciseId]);
            if (baseResult.rows.length === 0) {
                throw new https_1.HttpsError('not-found', 'Exercício não encontrado');
            }
            const baseExercise = baseResult.rows[0];
            // Buscar exercícios similares da mesma categoria
            result = await pool.query(`SELECT * FROM exercises
         WHERE is_active = true
           AND id != $1
           AND category = $2
         ORDER BY display_order, name
         LIMIT $3`, [exerciseId, baseExercise.category, limit]);
        }
        else {
            // Busca textual
            result = await pool.query(`SELECT * FROM exercises
         WHERE is_active = true
           AND (name ILIKE $1 OR description ILIKE $1 OR $1 = ANY(tags))
         ORDER BY display_order, name
         LIMIT $2`, [`%${searchQuery}%`, limit]);
        }
        return { data: result.rows };
    }
    finally {
        await pool.end();
    }
});
/**
 * Lista categorias de exercícios
 */
exports.getExerciseCategories = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.token) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária');
    }
    await (0, auth_1.authorizeRequest)(request.auth.token);
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        const result = await pool.query(`SELECT DISTINCT category
       FROM exercises
       WHERE is_active = true
       ORDER BY category`);
        return {
            data: result.rows.map((r) => ({
                id: r.category.toLowerCase().replace(/\s+/g, '-'),
                name: r.category,
            })),
        };
    }
    finally {
        await pool.end();
    }
});
//# sourceMappingURL=exercises.js.map