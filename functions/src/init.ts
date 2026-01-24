import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { Pool } from 'pg';

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

// Inicializar Firebase Admin
const app = getApps().length === 0 ? initializeApp() : getApps()[0];
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);

// Pool de conexões Cloud SQL
let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        const dbSocketPath = process.env.DB_SOCKET_PATH || '/cloudsql';

        pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASS,
            database: process.env.DB_NAME || 'fisioflow',
            host: `${dbSocketPath}/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
            port: parseInt(process.env.DB_PORT || '5432'),
            max: 20,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 30000,
        });
    }
    return pool;
}

export const config = {
    pool: getPool,
    db: adminDb,
    auth: adminAuth,
    storage: adminStorage,
};
