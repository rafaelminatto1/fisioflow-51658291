/**
 * API Functions: Profile (HTTP with CORS fix)
 * Cloud Functions para gestão do perfil do usuário
 * Using onRequest to fix authentication and CORS issues
 */

import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getPool, CORS_ORIGINS } from '../init';
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
 * Tries PostgreSQL first, then Firestore as fallback
 */
async function getUserProfile(userId: string): Promise<Profile> {
  // First try PostgreSQL
  try {
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

    if (result.rows.length > 0) {
      return result.rows[0] as Profile;
    }
  } catch (error) {
    logger.info('PostgreSQL query failed in getUserProfile, trying Firestore:', error);
  }

  // Fallback to Firestore
  try {
    const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
    if (profileDoc.exists) {
      const data = profileDoc.data();
      if (data) {
        // Convert Firestore profile to Profile format
        return {
          id: userId,
          user_id: userId,
          organization_id: data.organizationId || data.activeOrganizationId || data.organizationIds?.[0] || 'default',
          full_name: data.displayName || data.name || '',
          email: data.email || '',
          phone: data.phone || data.phoneNumber || '',
          avatar_url: data.photoURL || data.avatarUrl || '',
          role: data.role || 'user',
          crefito: data.crefito || '',
          specialties: data.specialties || [],
          bio: data.bio || '',
          birth_date: data.birthDate || null,
          is_active: data.isActive !== false,
          last_login_at: data.lastLoginAt || null,
          email_verified: data.emailVerified || false,
          preferences: data.preferences || {},
          created_at: data.createdAt?.toDate?.() || new Date(),
          updated_at: data.updatedAt?.toDate?.() || new Date(),
        } as Profile;
      }
    }
  } catch (error) {
    logger.info('Firestore query failed in getUserProfile:', error);
  }

  throw new HttpsError('not-found', 'Perfil não encontrado em PostgreSQL nem Firestore');
}

/**
 * CORS headers helper - reflect Origin when allowed (e.g. localhost:8085)
 */
function setCorsHeaders(req: any, res: any) {
  const origin = req?.headers?.origin || req?.headers?.Origin;
  const allowOrigin = (origin && CORS_ORIGINS.includes(origin)) ? origin : '*';
  res.set('Access-Control-Allow-Origin', allowOrigin);
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
}

/**
 * Handler para getProfile
 */
export const getProfileHandler = async (request: any) => {
  const uid = request.auth?.uid || (request.auth?.token as any)?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  // Get profile
  const profile = await getUserProfile(uid);
  return { data: profile };
};

/**
 * POST /getProfile - Retorna o perfil do usuário autenticado
 */
/**
 * Handler HTTP para getProfile
 */
export const getProfileHttpHandler = async (req: any, res: any) => {
  // Handle OPTIONS preflight FIRST
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(204).send('');
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  setCorsHeaders(req, res);

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
};

/**
 * POST /getProfile - Retorna o perfil do usuário autenticado
 */
export const getProfile = onRequest(
  {
    region: 'southamerica-east1',
    maxInstances: 10,
    cors: CORS_ORIGINS,
  },
  getProfileHttpHandler
);

/**
 * Handler para updateProfile
 */
export const updateProfileHandler = async (request: any) => {
  const uid = request.auth?.uid || (request.auth?.token as any)?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }

  const updates = request.data;
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
    throw new HttpsError('invalid-argument', 'Nenhum campo válido para atualização');
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

  const result = await pool.query(query, values);
  return { data: result.rows[0] as Profile };
};

/**
 * POST /updateProfile - Atualiza o perfil do usuário
 */
/**
 * Handler HTTP para updateProfile
 */
export const updateProfileHttpHandler = async (req: any, res: any) => {
  // Handle OPTIONS preflight FIRST
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(204).send('');
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  setCorsHeaders(req, res);

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

    const result = await pool.query(query, values);

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
};

/**
 * POST /updateProfile - Atualiza o perfil do usuário
 */
export const updateProfile = onRequest(
  {
    region: 'southamerica-east1',
    maxInstances: 10,
    cors: [
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
      /moocafisio\.com\.br$/,
      /fisioflow\.web\.app$/,
    ],
  },
  updateProfileHttpHandler
);
