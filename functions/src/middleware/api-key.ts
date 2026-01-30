/**
 * API Key Authentication Middleware
 *
 * @description
 * Provides API key authentication for external integrations and webhooks.
 * Supports key rotation, scopes, and rate limiting per key.
 *
 * @module middleware/api-key
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { logger } from 'firebase-functions';

// ============================================================================================
// TYPES
// ============================================================================================

/**
 * API Key scopes for permission management
 */
export enum ApiKeyScope {
  /** Full access to all resources */
  FULL = 'full',

  /** Read-only access to patient data */
  PATIENTS_READ = 'patients:read',

  /** Write access to patient data */
  PATIENTS_WRITE = 'patients:write',

  /** Read-only access to appointments */
  APPOINTMENTS_READ = 'appointments:read',

  /** Write access to appointments */
  APPOINTMENTS_WRITE = 'appointments:write',

  /** Access to webhooks */
  WEBHOOKS = 'webhooks',

  /** Access to reports */
  REPORTS = 'reports:read',

  /** Access to financial data */
  FINANCIAL_READ = 'financial:read',

  /** Write access to financial data */
  FINANCIAL_WRITE = 'financial:write',
}

/**
 * API Key record from database
 */
export interface ApiKeyRecord {
  id: string;
  key_hash: string;
  name: string;
  organization_id: string;
  scopes: ApiKeyScope[];
  is_active: boolean;
  rate_limit?: number;
  last_used_at?: Date;
  expires_at?: Date;
  created_at: Date;
  created_by: string;
  metadata?: Record<string, any>;
}

/**
 * API Key authentication context
 */
export interface ApiKeyContext {
  /** API Key ID */
  keyId: string;

  /** Organization ID */
  organizationId: string;

  /** Key name */
  keyName: string;

  /** Granted scopes */
  scopes: ApiKeyScope[];

  /** Rate limit for this key (requests per minute) */
  rateLimit?: number;

  /** Metadata associated with the key */
  metadata?: Record<string, any>;
}

// ============================================================================================
// DATABASE OPERATIONS
// ============================================================================================

const API_KEYS_TABLE = 'api_keys';

/**
 * Initialize the API keys table
 */
async function initApiKeysTable(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${API_KEYS_TABLE} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key_hash VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      organization_id VARCHAR(255) NOT NULL,
      scopes TEXT[] NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      rate_limit INTEGER DEFAULT 1000,
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by VARCHAR(255) NOT NULL,
      metadata JSONB DEFAULT '{}',
      CONSTRAINT api_keys_organization_fk
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON ${API_KEYS_TABLE}(key_hash);
    CREATE INDEX IF NOT EXISTS idx_api_keys_organization ON ${API_KEYS_TABLE}(organization_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_active ON ${API_KEYS_TABLE}(is_active) WHERE is_active = true;
  `);

  logger.info('[ApiKey] API keys table initialized');
}

/**
 * Hash an API key for storage
 *
 * @param key - Raw API key
 * @returns Hashed key
 */
function hashApiKey(key: string): string {
  // Use SHA-256 hashing
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key
 *
 * @param prefix - Optional prefix for the key
 * @returns Generated API key
 */
export function generateApiKey(prefix: string = 'fio'): string {
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

/**
 * Get API key record by key hash
 *
 * @param keyHash - Hashed API key
 * @returns API key record or null
 */
async function getApiKeyByKeyHash(keyHash: string): Promise<ApiKeyRecord | null> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM ${API_KEYS_TABLE}
     WHERE key_hash = $1 AND is_active = true
     AND (expires_at IS NULL OR expires_at > NOW())`,
    [keyHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    key_hash: row.key_hash,
    name: row.name,
    organization_id: row.organization_id,
    scopes: row.scopes,
    is_active: row.is_active,
    rate_limit: row.rate_limit,
    last_used_at: row.last_used_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    created_by: row.created_by,
    metadata: row.metadata,
  };
}

/**
 * Update last used timestamp for an API key
 *
 * @param keyId - API key ID
 */
async function updateLastUsed(keyId: string): Promise<void> {
  const pool = getPool();

  await pool.query(
    `UPDATE ${API_KEYS_TABLE} SET last_used_at = NOW() WHERE id = $1`,
    [keyId]
  );
}

// ============================================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================================

/**
 * Authenticate a request using API key
 *
 * @description
 * Extracts API key from request headers and validates it against the database.
 * Returns the API key context if valid.
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   const apiKeyContext = await authenticateApiKey(request);
 *   // Use apiKeyContext.organizationId for queries
 * });
 * ```
 *
 * @param request - Firebase function request
 * @returns API key context
 *
 * @throws {HttpsError} 'unauthenticated' - No API key provided or invalid
 * @throws {HttpsError} 'permission-denied' - API key is inactive or expired
 */
export async function authenticateApiKey(
  request: { headers?: { [key: string]: string } }
): Promise<ApiKeyContext> {
  // Initialize table if needed
  await initApiKeysTable().catch(() => {});

  // Extract API key from headers
  const apiKey = extractApiKeyFromHeaders(request.headers);

  if (!apiKey) {
    throw new HttpsError(
      'unauthenticated',
      'API key is required. Provide it in the X-API-Key header or Authorization header as "Bearer {key}".'
    );
  }

  // Hash the key and look it up
  const keyHash = hashApiKey(apiKey);
  const apiKeyRecord = await getApiKeyByKeyHash(keyHash);

  if (!apiKeyRecord) {
    logger.warn('[ApiKey] Invalid API key attempted', { keyHash });
    throw new HttpsError('unauthenticated', 'Invalid or inactive API key');
  }

  // Update last used timestamp
  await updateLastUsed(apiKeyRecord.id).catch(() => {});

  logger.info('[ApiKey] Authenticated', {
    keyId: apiKeyRecord.id,
    keyName: apiKeyRecord.name,
    organizationId: apiKeyRecord.organization_id,
  });

  return {
    keyId: apiKeyRecord.id,
    organizationId: apiKeyRecord.organization_id,
    keyName: apiKeyRecord.name,
    scopes: apiKeyRecord.scopes,
    rateLimit: apiKeyRecord.rate_limit,
    metadata: apiKeyRecord.metadata,
  };
}

/**
 * Extract API key from various header formats
 *
 * @param headers - Request headers
 * @returns API key or null
 */
function extractApiKeyFromHeaders(headers?: { [key: string]: string }): string | null {
  if (!headers) {
    return null;
  }

  // Try X-API-Key header first
  const apiKey = headers['x-api-key'] || headers['X-API-Key'];
  if (apiKey) {
    return apiKey;
  }

  // Try Authorization header with Bearer token
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try api_key query parameter (for webhooks)
  // Note: This would need to be passed from the request object
  return null;
}

/**
 * Check if API key has required scope
 *
 * @param context - API key context
 * @param requiredScope - Required scope
 * @returns True if has scope
 *
 * @throws {HttpsError} 'permission-denied' - Missing required scope
 */
export function requireApiKeyScope(
  context: ApiKeyContext,
  requiredScope: ApiKeyScope
): boolean {
  // Full scope grants all permissions
  if (context.scopes.includes(ApiKeyScope.FULL)) {
    return true;
  }

  if (!context.scopes.includes(requiredScope)) {
    throw new HttpsError(
      'permission-denied',
      `API key missing required scope: ${requiredScope}`
    );
  }

  return true;
}

/**
 * Check if API key has any of the required scopes
 *
 * @param context - API key context
 * @param requiredScopes - Array of required scopes (any one is sufficient)
 * @returns True if has any of the scopes
 *
 * @throws {HttpsError} 'permission-denied' - Missing all required scopes
 */
export function requireAnyApiKeyScope(
  context: ApiKeyContext,
  requiredScopes: ApiKeyScope[]
): boolean {
  // Full scope grants all permissions
  if (context.scopes.includes(ApiKeyScope.FULL)) {
    return true;
  }

  const hasScope = requiredScopes.some(scope => context.scopes.includes(scope));

  if (!hasScope) {
    throw new HttpsError(
      'permission-denied',
      `API key missing required scope. One of: ${requiredScopes.join(', ')}`
    );
  }

  return true;
}

// ============================================================================================
// API KEY MANAGEMENT (ADMIN)
// ============================================================================================

/**
 * Create a new API key
 *
 * @param params - API key parameters
 * @returns Created API key (includes the raw key - return only on creation)
 */
export async function createApiKey(params: {
  name: string;
  organizationId: string;
  scopes: ApiKeyScope[];
  createdBy: string;
  rateLimit?: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}): Promise<{ key: string; record: ApiKeyRecord }> {
  await initApiKeysTable();

  const pool = getPool();

  // Generate the key
  const key = generateApiKey();
  const keyHash = hashApiKey(key);

  // Insert into database
  const result = await pool.query(
    `INSERT INTO ${API_KEYS_TABLE} (key_hash, name, organization_id, scopes, rate_limit, expires_at, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      keyHash,
      params.name,
      params.organizationId,
      params.scopes,
      params.rateLimit || 1000,
      params.expiresAt || null,
      params.createdBy,
      params.metadata || {},
    ]
  );

  const row = result.rows[0];

  logger.info('[ApiKey] Created', {
    keyId: row.id,
    name: params.name,
    organizationId: params.organizationId,
  });

  return {
    key, // Return the raw key only on creation
    record: {
      id: row.id,
      key_hash: row.key_hash,
      name: row.name,
      organization_id: row.organization_id,
      scopes: row.scopes,
      is_active: row.is_active,
      rate_limit: row.rate_limit,
      last_used_at: row.last_used_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
      created_by: row.created_by,
      metadata: row.metadata,
    },
  };
}

/**
 * Revoke an API key
 *
 * @param keyId - API key ID to revoke
 * @returns True if revoked
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  await initApiKeysTable();

  const pool = getPool();

  await pool.query(
    `UPDATE ${API_KEYS_TABLE} SET is_active = false WHERE id = $1`,
    [keyId]
  );

  logger.info('[ApiKey] Revoked', { keyId });

  return true;
}

/**
 * List API keys for an organization
 *
 * @param organizationId - Organization ID
 * @returns Array of API key records
 */
export async function listApiKeys(organizationId: string): Promise<ApiKeyRecord[]> {
  await initApiKeysTable();

  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM ${API_KEYS_TABLE}
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [organizationId]
  );

  return result.rows.map(row => ({
    id: row.id,
    key_hash: row.key_hash,
    name: row.name,
    organization_id: row.organization_id,
    scopes: row.scopes,
    is_active: row.is_active,
    rate_limit: row.rate_limit,
    last_used_at: row.last_used_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    created_by: row.created_by,
    metadata: row.metadata,
  }));
}

/**
 * Rotate an API key (create new, revoke old)
 *
 * @param oldKeyId - Old API key ID
 * @param revokedBy - User ID performing the rotation
 * @returns New API key
 */
export async function rotateApiKey(
  oldKeyId: string,
  revokedBy: string
): Promise<{ key: string; record: ApiKeyRecord }> {
  await initApiKeysTable();

  const pool = getPool();

  // Get old key details
  const oldKeyResult = await pool.query(
    `SELECT * FROM ${API_KEYS_TABLE} WHERE id = $1`,
    [oldKeyId]
  );

  if (oldKeyResult.rows.length === 0) {
    throw new Error('API key not found');
  }

  const oldKey = oldKeyResult.rows[0];

  // Create new key with same properties
  const newKey = await createApiKey({
    name: `${oldKey.name} (rotated)`,
    organizationId: oldKey.organization_id,
    scopes: oldKey.scopes,
    createdBy: revokedBy,
    rateLimit: oldKey.rate_limit,
    metadata: {
      ...oldKey.metadata,
      rotatedFrom: oldKeyId,
    },
  });

  // Revoke old key
  await revokeApiKey(oldKeyId);

  logger.info('[ApiKey] Rotated', {
    oldKeyId,
    newKeyId: newKey.record.id,
  });

  return newKey;
}
