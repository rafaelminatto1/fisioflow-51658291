/**
 * API Functions: Profile (HTTP with CORS fix)
 * Cloud Functions para gestão do perfil do usuário
 * Using onRequest to fix authentication and CORS issues
 */

import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getPool } from '../init';
import { Profile } from '../types/models';
import { logger } from '../lib/logger';

const auth = admin.auth();

/**
 * Helper to verify Firebase ID token from Authorization header
 */
async function verifyAuth(req: any): Promise<{ uid: string; token: any }> {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpsError('unauthenticated', 'No authorization header');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return { uid: decodedToken.uid, token: decodedToken };
  } catch (error) {
    throw new HttpsError('unauthenticated', 'Invalid token');
  }
}

/**
 * Helper to get user profile from database
 */
async function getUserProfile(userId: string): Promise<Profile> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT
      id, user_id, organization_id, full_name, email,
      phone, avatar_url, role, crefito, specialties,
      bio, birth_date, is_active, last_login_at,
      email_verified, preferences, created_at, updated_at
    FROM profiles
    WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new HttpsError('not-found', 'Perfil não encontrado');
  }

  return result.rows[0] as Profile;
}

/**
 * CORS headers helper
 */
function setCorsHeaders(res: any) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * POST /getProfile - Retorna o perfil do usuário autenticado
 */
export const getProfile = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
  },
  async (req, res) => {
    // Handle OPTIONS preflight FIRST, before any other processing
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.status(204).send('');
      return;
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    setCorsHeaders(res);

    try {
      // Verify authentication
      const { uid } = await verifyAuth(req);

      // Get profile
      const profile = await getUserProfile(uid);

      res.json({ data: profile });
    } catch (error: unknown) {
      logger.error('Erro ao buscar perfil:', error);

      if (error instanceof HttpsError) {
        const statusCode = error.code === 'unauthenticated' ? 401 :
                          error.code === 'not-found' ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno ao buscar perfil' });
      }
    }
  }
);

/**
 * POST /updateProfile - Atualiza o perfil do usuário
 */
export const updateProfile = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 100,
  },
  async (req, res) => {
    // Handle OPTIONS preflight FIRST
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.status(204).send('');
      return;
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    setCorsHeaders(res);

    try {
      // Verify authentication
      const { uid } = await verifyAuth(req);

      const updates = req.body;
      const pool = getPool();

      // Campos permitidos para atualização
      const allowedFields = [
        'full_name', 'phone', 'avatar_url', 'crefito',
        'specialties', 'bio', 'birth_date', 'preferences'
      ];

      const setClauses: string[] = [];
      const values: (string | number | Date)[] = [];
      let paramCount = 0;

      for (const field of allowedFields) {
        if (field in updates) {
          paramCount++;
          setClauses.push(`${field} = $${paramCount}`);

          if (field === 'specialties' || field === 'preferences') {
            values.push(JSON.stringify(updates[field]));
          } else {
            values.push(updates[field]);
          }
        }
      }

      if (setClauses.length === 0) {
        res.status(400).json({ error: 'Nenhum campo válido para atualização' });
        return;
      }

      // Adicionar updated_at
      paramCount++;
      setClauses.push(`updated_at = $${paramCount}`);
      values.push(new Date());

      // Adicionar WHERE
      paramCount++;
      values.push(uid);

      const query = `
        UPDATE profiles
        SET ${setClauses.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query);

      res.json({ data: result.rows[0] as Profile });
    } catch (error: unknown) {
      logger.error('Erro ao atualizar perfil:', error);

      if (error instanceof HttpsError) {
        const statusCode = error.code === 'unauthenticated' ? 401 :
                          error.code === 'not-found' ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno ao atualizar perfil' });
      }
    }
  }
);
