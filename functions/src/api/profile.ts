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
import { toValidUuid } from '../lib/uuid';
import { withErrorHandling } from '../lib/error-handler';

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
      const profile = result.rows[0] as Profile;
      const organizationId = toValidUuid(profile.organization_id);
      if (organizationId) {
        profile.organization_id = organizationId;
        return profile;
      }

      logger.warn('Invalid organization_id in PostgreSQL profile, trying Firestore fallback', {
        userId,
        organizationId: profile.organization_id,
      });
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
        const organizationId = (
          toValidUuid(data.organizationId)
          || toValidUuid(data.activeOrganizationId)
          || toValidUuid(data.organizationIds?.[0])
          || toValidUuid(data.organization_id?.[0])
          || toValidUuid(data.organization_id)
        );
        if (!organizationId) {
          throw new HttpsError('failed-precondition', 'Perfil sem organizationId válido');
        }

        // Convert Firestore profile to Profile format
        return {
          id: userId,
          user_id: userId,
          organization_id: organizationId,
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
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.info('Firestore query failed in getUserProfile:', error);
  }

  throw new HttpsError('not-found', 'Perfil não encontrado em PostgreSQL nem Firestore');
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
export const getProfile = onRequest(
  {
    region: 'southamerica-east1',
    maxInstances: 1,
    invoker: 'public',
  },
  withErrorHandling(async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Verify authentication
    const { uid } = await verifyAuth(req);

    // Get profile
    const profile = await getUserProfile(uid);

    res.json({ data: profile });
  }, 'getProfile')
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
export const updateProfile = onRequest(
  {
    region: 'southamerica-east1',
    maxInstances: 1,
    invoker: 'public',
  },
  withErrorHandling(async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

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
  }, 'updateProfile')
);
