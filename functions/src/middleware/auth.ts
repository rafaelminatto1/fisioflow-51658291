/**
 * Middleware de Autenticação para Cloud Functions
 * Gerencia tokens Firebase Auth e contexto de organização
 */

import { getAuth } from 'firebase-admin/auth';
import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const auth = () => getAuth(getApp());
const firestore = () => getFirestore(getApp());
import { Pool } from 'pg';
import { HttpsError } from 'firebase-functions/v2/https';

// Re-exportar getPool do index
import { getPool } from '../init';
import { logger } from '../lib/logger';

/**
 * Contexto de autenticação
 */
export interface AuthContext {
  /** UID do Firebase Auth */
  userId: string;

  /** ID da organização do usuário */
  organizationId: string;

  /** Papel do usuário (admin, fisioterapeuta, recepcionista, paciente) */
  role: string;

  /** Email do usuário */
  email: string;

  /** ID do profile no banco de dados */
  profileId: string;
}

/**
 * Dados do token Firebase decodificado
 */
interface DecodedToken {
  uid: string;
  email: string;
  email_verified?: boolean;
}

/**
 * Dados do profile do banco de dados
 */
interface ProfileData {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

/**
 * Extrai e verifica o token Bearer do header Authorization
 *
 * @param authHeader - Header Authorization completo
 * @returns Token JWT puro
 * @throws HttpsError se o header for inválido
 */
export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new HttpsError('unauthenticated', 'Token de autenticação não fornecido');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new HttpsError('unauthenticated', 'Formato de token inválido. Use: Bearer <token>');
  }

  return parts[1];
}

/**
 * Verifica o token Firebase Auth e retorna os dados decodificados
 *
 * @param token - Token JWT
 * @returns Token decodificado
 * @throws HttpsError se o token for inválido
 */
export async function verifyToken(token: string): Promise<DecodedToken> {
  try {
    const decoded = await auth().verifyIdToken(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      email_verified: decoded.email_verified || false,
    };
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      throw new HttpsError('unauthenticated', 'Token expirado');
    }
    if (error.code === 'auth/id-token-revoked') {
      throw new HttpsError('unauthenticated', 'Token revogado');
    }
    throw new HttpsError('unauthenticated', 'Token inválido: ' + error.message);
  }
}

/**
 * Busca os dados do profile no banco de dados
 * Tenta PostgreSQL primeiro, depois Firestore como fallback
 *
 * @param userId - UID do Firebase Auth
 * @returns Dados do profile
 * @throws HttpsError se o profile não for encontrado
 */
async function getProfile(userId: string): Promise<ProfileData> {
  const pool = getPool();

  try {
    // First try PostgreSQL
    const result = await pool.query<ProfileData>(
      `SELECT id, user_id, organization_id, role, full_name, email, is_active
       FROM profiles
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      const profile = result.rows[0];
      if (!profile.is_active) {
        throw new HttpsError('permission-denied', 'Este usuário está desativado');
      }
      return profile;
    }
  } catch (error) {
    logger.info('[Auth Middleware] PostgreSQL query failed, trying Firestore:', error);
  }

  // Fallback to Firestore
  try {
    const profileDoc = await firestore().collection('profiles').doc(userId).get();

    if (profileDoc.exists) {
      const data = profileDoc.data();
      if (data) {
        // Convert Firestore profile to ProfileData format
        const organizationId = data.organizationId || data.organization_ids?.[0] || data.activeOrganizationId || 'default';
        return {
          id: userId,
          user_id: userId,
          organization_id: organizationId,
          role: data.role || 'user',
          full_name: data.displayName || data.name || data.full_name || '',
          email: data.email || '',
          is_active: data.isActive !== false,
        };
      }
    }
  } catch (firestoreError) {
    logger.info('[Auth Middleware] Firestore query failed:', firestoreError);
  }

  // If not found in either database, create default in PostgreSQL
  try {
    logger.info(`[Auth Middleware] No profile found for user: ${userId}, creating default organization and profile`);

    const organizationId = '00000000-0000-0000-0000-000000000000';
    const orgSlug = `clinica-${userId.substring(0, 8).toLowerCase()}`;

    try {
      await pool.query(
        `INSERT INTO organizations (id, name, slug, active, email)
           VALUES ($1, 'Clínica Principal', $2, true, $3)
           ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug`,
        [organizationId, orgSlug, 'admin@fisioflow.com.br']
      );
      logger.info(`[Auth Middleware] Created/updated organization: ${organizationId}`);
    } catch (orgError: any) {
      if (orgError.code === '23505') {
        const uniqueSlug = `${orgSlug}-${Date.now().toString(36)}`;
        await pool.query(`UPDATE organizations SET slug = $1 WHERE id = $2`, [uniqueSlug, organizationId]);
      }
    }

    const newProfile = await pool.query<ProfileData>(
      `INSERT INTO profiles (user_id, organization_id, role, full_name, email, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, organization_id, role, full_name, email, is_active`,
      [userId, organizationId, 'admin', 'Usuário Principal', 'admin@fisioflow.com.br', true]
    );

    logger.info(`[Auth Middleware] Created default profile: ${newProfile.rows[0].id}`);
    return newProfile.rows[0];
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        logger.error('[Auth Middleware] Database connection error:', error.message);
        throw new HttpsError(
          'internal',
          'Erro de conexão com o banco de dados. Verifique se o PostgreSQL/Cloud SQL está configurado e acessível.'
        );
      }
    }
    throw error;
  }
}

/**
 * Configura o contexto RLS (Row Level Security) para a conexão atual
 *
 * @param pool - Pool de conexões PostgreSQL
 * @param organizationId - ID da organização do usuário
 */
async function setRLSContext(pool: Pool, organizationId: string): Promise<void> {
  await pool.query("SELECT set_config('app.organization_id', $1, true)", [organizationId]);
  await pool.query("SELECT set_config('app.user_id', $1, true)", [organizationId]); // Fallback
}

/**
 * Autoriza uma requisição e retorna o contexto de autenticação completo
 *
 * Esta função deve ser chamada no início de cada Cloud Function que precisa
 * de autorização. Ela:
 * 1. Verifica o token Firebase Auth
 * 2. Busca os dados do profile no banco
 * 3. Configura o contexto RLS para isolamento multi-tenant
 *
 * @param token - Token JWT do Firebase Auth
 * @returns Contexto de autenticação com dados do usuário
 * @throws HttpsError se a autorização falhar
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   const auth = await authorizeRequest(request.auth.token);
 *   // Use auth.organizationId, auth.role, etc.
 * });
 * ```
 */
export async function authorizeRequest(tokenOrUid: string | { uid: string }): Promise<AuthContext> {
  let uid: string;

  if (typeof tokenOrUid === 'string') {
    // 1. Verificar token Firebase se for string
    const decoded = await verifyToken(tokenOrUid);
    uid = decoded.uid;
  } else {
    // Já é um objeto decodificado ou { uid }
    uid = tokenOrUid.uid;
  }

  // 2. Buscar profile no banco
  const profile = await getProfile(uid);

  // 3. Configurar contexto RLS
  const pool = getPool();
  await setRLSContext(pool, profile.organization_id);

  // 4. Retornar contexto completo
  return {
    userId: uid,
    organizationId: profile.organization_id,
    role: profile.role,
    email: profile.email,
    profileId: profile.id,
  };
}

/**
 * Wrapper para criar callable functions com autorização automática
 *
 * @param handler - Função handler que recebe o AuthContext
 * @returns Cloud Function callable com autenticação
 *
 * @example
 * ```typescript
 * export const myFunction = withAuth(async (data, auth) => {
 *   // auth já contém userId, organizationId, role, etc.
 *   return { success: true };
 * });
 * ```
 */
export function withAuth<T = any, R = any>(
  handler: (data: T, auth: AuthContext) => Promise<R>
): (request: { data: T; auth: { token: string } }) => Promise<R> {
  return async (request) => {
    const auth = await authorizeRequest(request.auth.token);
    return handler(request.data, auth);
  };
}

/**
 * Verifica se o usuário tem permissão baseada em papel
 *
 * @param auth - Contexto de autenticação
 * @param allowedRoles - Array de papéis permitidos
 * @throws HttpsError se o usuário não tiver permissão
 */
export function requireRole(auth: AuthContext, allowedRoles: string[]): void {
  if (!allowedRoles.includes(auth.role)) {
    throw new HttpsError(
      'permission-denied',
      `Acesso negado. Requer um dos papéis: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Verifica se o usuário é admin ou tem role específico
 * Admins têm acesso a tudo
 *
 * @param auth - Contexto de autenticação
 * @param role - Papel necessário (opcional, se omitido verifica se é admin)
 * @returns true se tem permissão
 */
export function hasPermission(auth: AuthContext, role?: string): boolean {
  if (auth.role === 'admin') return true;
  if (!role) return false;
  return auth.role === role;
}

/**
 * Criar um cliente PostgreSQL com contexto RLS configurado
 *
 * Útil para queries que precisam ser executadas dentro de uma transação
 * ou com contexto específico
 *
 * @param auth - Contexto de autenticação
 * @returns Cliente PostgreSQL com RLS configurado
 */
export async function createAuthorizedClient(auth: AuthContext): Promise<Pool> {
  const pool = getPool();
  await setRLSContext(pool, auth.organizationId);
  return pool;
}
