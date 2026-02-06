/**
 * Cache Helpers - Otimizações de cache para queries frequentes
 *
 * Reduz carga no banco de dados e melhora tempo de resposta
 */

import { getPool } from '../init';
import { HttpsError } from 'firebase-functions/v2/https';
import { organizationCache, SimpleCache } from './function-config';
import { logger } from './logger';
import * as admin from 'firebase-admin';

// ============================================================================
// ORGANIZATION ID CACHE
// ============================================================================

/**
 * Get organization ID from user ID with caching
 *
 * Tenta cache em memória primeiro, depois PostgreSQL, e por último Firestore
 * Cache expira em 5 minutos
 */
export async function getOrganizationIdCached(userId: string): Promise<string> {
  // Try memory cache first
  const cached = organizationCache.get(`org:${userId}`);
  if (cached) {
    return cached;
  }

  // Try PostgreSQL
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT organization_id FROM profiles WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (result.rows.length > 0) {
      const orgId = result.rows[0].organization_id;
      organizationCache.set(`org:${userId}`, orgId);
      return orgId;
    }
  } catch (error) {
    logger.info('PostgreSQL query failed for organization ID, trying Firestore:', error);
  }

  // Fallback to Firestore
  try {
    const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
    if (profileDoc.exists) {
      const profile = profileDoc.data();
      const orgId = profile?.organizationId || profile?.activeOrganizationId || profile?.organizationIds?.[0] || 'default';

      // Cache the result
      organizationCache.set(`org:${userId}`, orgId);

      // Optionally update PostgreSQL with the found organization ID
      try {
        const pool = getPool();
        await pool.query(
          'INSERT INTO profiles (user_id, organization_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET organization_id = $2',
          [userId, orgId]
        );
      } catch (pgError) {
        // Ignore PostgreSQL update errors
      }

      return orgId;
    }
  } catch (error) {
    logger.info('Firestore query failed for organization ID:', error);
  }

  throw new HttpsError('not-found', 'Perfil não encontrado');
}

/**
 * Invalidate organization cache for a user
 * Call this when user's organization changes
 */
export function invalidateOrganizationCache(userId: string): void {
  organizationCache.delete(`org:${userId}`);
}

// ============================================================================
// PATIENT DATA CACHE
// ============================================================================

const patientCache = new SimpleCache<any>(120000); // 2 minutos

export async function getPatientCached(patientId: string, organizationId: string): Promise<any | null> {
  const cacheKey = `patient:${organizationId}:${patientId}`;
  const cached = patientCache.get(cacheKey);
  if (cached) return cached;

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, name, email, phone, cpf, status FROM patients WHERE id = $1 AND organization_id = $2',
      [patientId, organizationId]
    );

    if (result.rows.length > 0) {
      const patient = result.rows[0];
      patientCache.set(cacheKey, patient);
      return patient;
    }
    return null;
  } catch (error) {
    logger.error('Error fetching patient:', error);
    return null;
  }
}

export function invalidatePatientCache(patientId: string, organizationId: string): void {
  patientCache.delete(`patient:${organizationId}:${patientId}`);
}

// ============================================================================
// APPOINTMENT COUNT CACHE
// ============================================================================

const appointmentCountCache = new SimpleCache<number>(30000); // 30 segundos

export async function getAppointmentCountCached(
  organizationId: string,
  date: string
): Promise<number> {
  const cacheKey = `apptCount:${organizationId}:${date}`;
  const cached = appointmentCountCache.get(cacheKey);
  if (cached !== null) return cached;

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM appointments WHERE organization_id = $1 AND DATE(date) = $2',
      [organizationId, date]
    );

    const count = parseInt(result.rows[0].count, 10);
    appointmentCountCache.set(cacheKey, count);
    return count;
  } catch (error) {
    logger.error('Error fetching appointment count:', error);
    return 0;
  }
}

export function invalidateAppointmentCountCache(organizationId: string, date: string): void {
  appointmentCountCache.delete(`apptCount:${organizationId}:${date}`);
}

// ============================================================================
// DOCTOR LIST CACHE
// ============================================================================

const doctorListCache = new SimpleCache<any[]>(180000); // 3 minutos

export async function getDoctorsCached(organizationId: string): Promise<any[]> {
  const cacheKey = `doctors:${organizationId}`;
  const cached = doctorListCache.get(cacheKey);
  if (cached) return cached;

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT user_id, full_name, specialties, is_active FROM profiles WHERE organization_id = $1 AND role IN ($2, $3) ORDER BY full_name',
      [organizationId, 'admin', 'therapist']
    );

    const doctors = result.rows;
    doctorListCache.set(cacheKey, doctors);
    return doctors;
  } catch (error) {
    logger.error('Error fetching doctors:', error);
    return [];
  }
}

export function invalidateDoctorsCache(organizationId: string): void {
  doctorListCache.delete(`doctors:${organizationId}`);
}

// ============================================================================
// CACHE CLEANUP TASK
// ============================================================================

/**
 * Run periodic cache cleanup
 * Call this from a scheduled function or on a timer
 */
export function runCacheCleanup(): void {
  organizationCache.cleanup();
  patientCache.cleanup();
  appointmentCountCache.cleanup();
  doctorListCache.cleanup();
}

// Schedule cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(runCacheCleanup, 300000);
}
