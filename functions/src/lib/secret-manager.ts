/**
 * Secret Manager Integration
 *
 * Integrates with Google Cloud Secret Manager for secure secret storage
 *
 * @module lib/secret-manager
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { getLogger } from './logger';

const logger = getLogger('secret-manager');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ENABLE_CACHING = process.env.SECRET_MANAGER_CACHE !== 'false';

// ============================================================================
// TYPES
// ============================================================================

export interface SecretOptions {
  version?: string;
  caching?: boolean;
}

interface CachedSecret {
  value: string;
  expires: number;
}

// ============================================================================
// SINGLETON CLIENT
// ============================================================================

let client: SecretManagerServiceClient | null = null;
const secretCache = new Map<string, CachedSecret>();

/**
 * Get or create Secret Manager client (singleton)
 */
function getClient(): SecretManagerServiceClient {
  if (!client) {
    client = new SecretManagerServiceClient({
      projectId: PROJECT_ID,
    });
    logger.info('Secret Manager client initialized', { projectId: PROJECT_ID });
  }
  return client;
}

// ============================================================================
// SECRET ACCESS FUNCTIONS
// ============================================================================

/**
 * Access a secret from Secret Manager
 *
 * @param name - Secret name (without project prefix)
 * @param options - Options for accessing the secret
 * @returns Secret value or null if not found
 */
export async function accessSecret(
  name: string,
  options: SecretOptions = {}
): Promise<string | null> {
  const { version = 'latest', caching = ENABLE_CACHING } = options;

  // Check cache first if caching is enabled
  if (caching) {
    const cached = secretCache.get(`${name}:${version}`);
    if (cached && cached.expires > Date.now()) {
      logger.debug(`Returning cached secret: ${name}`);
      return cached.value;
    }
  }

  try {
    const clientInstance = getClient();
    const secretPath = `projects/${PROJECT_ID}/secrets/${name}/versions/${version}`;

    logger.debug(`Accessing secret: ${name}@${version}`);

    const [versionResult] = await clientInstance.accessSecretVersion({
      name: secretPath,
    });

    const payload = versionResult.payload;
    if (!payload || !payload.data) {
      logger.warn(`Secret ${name} has no payload`);
      return null;
    }

    const value = payload.data.toString();

    // Cache the result if caching is enabled
    if (caching) {
      secretCache.set(`${name}:${version}`, {
        value,
        expires: Date.now() + CACHE_TTL,
      });
    }

    logger.debug(`Successfully accessed secret: ${name}`);
    return value;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    logger.error(`Failed to access secret ${name}:`, err);

    // Secret not found
    if (err.code === 5) {
      logger.warn(`Secret not found: ${name}`);
      return null;
    }

    throw new Error(`Secret Manager error for ${name}: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Access a required secret (throws if not found)
 *
 * @param name - Secret name
 * @param options - Options for accessing the secret
 * @returns Secret value
 * @throws Error if secret not found
 */
export async function accessSecretRequired(
  name: string,
  options: SecretOptions = {}
): Promise<string> {
  const value = await accessSecret(name, options);
  if (!value) {
    throw new Error(`Required secret '${name}' not found in Secret Manager`);
  }
  return value;
}

/**
 * Access a secret with caching
 *
 * @param name - Secret name
 * @param version - Secret version (default: 'latest')
 * @returns Secret value or null
 */
export async function getCachedSecret(
  name: string,
  version: string = 'latest'
): Promise<string | null> {
  return accessSecret(name, { version, caching: true });
}

/**
 * Access multiple secrets at once
 *
 * @param names - Array of secret names
 * @returns Map of secret name to value (null for secrets not found)
 */
export async function accessSecrets(
  names: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  await Promise.all(
    names.map(async (name) => {
      const value = await accessSecret(name);
      results.set(name, value);
    })
  );

  return results;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear cached secret values
 *
 * @param name - Optional specific secret name to clear (clears all if not provided)
 */
export function clearSecretCache(name?: string): void {
  if (name) {
    // Clear all versions of the specified secret
    for (const [key] of secretCache.entries()) {
      if (key.startsWith(`${name}:`)) {
        secretCache.delete(key);
      }
    }
    logger.debug(`Cleared cache for secret: ${name}`);
  } else {
    // Clear all cached secrets
    secretCache.clear();
    logger.debug('Cleared all secret cache');
  }
}

/**
 * Get cache statistics
 */
export function getSecretCacheStats(): {
  size: number;
  keys: string[];
  expiredCount: number;
} {
  const now = Date.now();
  let expiredCount = 0;

  for (const cached of secretCache.values()) {
    if (cached.expires <= now) {
      expiredCount++;
    }
  }

  return {
    size: secretCache.size,
    keys: Array.from(secretCache.keys()),
    expiredCount,
  };
}

// ============================================================================
// SECRET MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new secret
 *
 * @param name - Secret name
 * @param value - Secret value
 */
export async function createSecret(
  name: string,
  value: string
): Promise<void> {
  try {
    const clientInstance = getClient();
    const parent = `projects/${PROJECT_ID}`;

    logger.info(`Creating secret: ${name}`);

    // Create the secret
    const [secret] = await clientInstance.createSecret({
      parent,
      secretId: name,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });

    logger.info(`Secret created: ${secret.name}`);

    // Add the first version
    await clientInstance.addSecretVersion({
      parent: secret.name,
      payload: {
        data: Buffer.from(value),
      },
    });

    logger.info(`Secret version added for: ${name}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to create secret ${name}:`, err);
    throw new Error(`Failed to create secret ${name}: ${err.message}`);
  }
}

/**
 * Update a secret with a new version
 *
 * @param name - Secret name
 * @param value - New secret value
 */
export async function updateSecret(
  name: string,
  value: string
): Promise<void> {
  try {
    const clientInstance = getClient();
    const secretPath = `projects/${PROJECT_ID}/secrets/${name}`;

    logger.info(`Adding new version for secret: ${name}`);

    await clientInstance.addSecretVersion({
      parent: secretPath,
      payload: {
        data: Buffer.from(value),
      },
    });

    // Clear the cache for this secret
    clearSecretCache(name);

    logger.info(`Secret version added for: ${name}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to update secret ${name}:`, err);
    throw new Error(`Failed to update secret ${name}: ${err.message}`);
  }
}

/**
 * Delete a secret and all its versions
 *
 * @param name - Secret name
 */
export async function deleteSecret(name: string): Promise<void> {
  try {
    const clientInstance = getClient();
    const secretPath = `projects/${PROJECT_ID}/secrets/${name}`;

    logger.warn(`Deleting secret: ${name}`);

    await clientInstance.deleteSecret({
      name: secretPath,
    });

    // Clear the cache for this secret
    clearSecretCache(name);

    logger.info(`Secret deleted: ${name}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to delete secret ${name}:`, err);
    throw new Error(`Failed to delete secret ${name}: ${err.message}`);
  }
}

/**
 * List all secrets
 *
 * @returns Array of secret names
 */
export async function listSecrets(): Promise<string[]> {
  try {
    const clientInstance = getClient();
    const parent = `projects/${PROJECT_ID}`;

    const [secrets] = await clientInstance.listSecrets({
      parent,
    });

    return (secrets || [])
      .map((secret) => secret.name?.split('/').pop())
      .filter((name): name is string => !!name);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Failed to list secrets:', err);
    throw new Error(`Failed to list secrets: ${err.message}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Execute a function with a secret as parameter
 *
 * @param secretName - Name of the secret
 * @param fn - Function to execute with the secret value
 * @returns Result of the function
 */
export async function withSecret<T>(
  secretName: string,
  fn: (secret: string) => Promise<T>
): Promise<T> {
  const secret = await accessSecretRequired(secretName);
  return fn(secret);
}

/**
 * Execute a function with multiple secrets
 *
 * @param secretNames - Array of secret names
 * @param fn - Function to execute with secrets map
 * @returns Result of the function
 */
export async function withSecrets<T>(
  secretNames: string[],
  fn: (secrets: Map<string, string>) => Promise<T>
): Promise<T> {
  const secrets = await accessSecrets(secretNames);

  // Filter out null values and throw if any required secret is missing
  const validSecrets = new Map<string, string>();
  for (const [name, value] of secrets.entries()) {
    if (value === null) {
      throw new Error(`Required secret '${name}' not found`);
    }
    validSecrets.set(name, value);
  }

  return fn(validSecrets);
}

/**
 * Check if Secret Manager should be used
 */
export function isSecretManagerEnabled(): boolean {
  return process.env.USE_SECRET_MANAGER === 'true' || process.env.NODE_ENV === 'production';
}
