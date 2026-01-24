"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.adminStorage = exports.adminAuth = exports.adminDb = void 0;
exports.getPool = getPool;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const pg_1 = require("pg");
// ============================================================================
// INICIALIZAÇÃO
// ============================================================================
// Inicializar Firebase Admin
const app = (0, app_1.getApps)().length === 0 ? (0, app_1.initializeApp)() : (0, app_1.getApps)()[0];
exports.adminDb = (0, firestore_1.getFirestore)(app);
exports.adminAuth = (0, auth_1.getAuth)(app);
exports.adminStorage = (0, storage_1.getStorage)(app);
// Pool de conexões Cloud SQL
let pool = null;
function getPool() {
    if (!pool) {
        const dbSocketPath = process.env.DB_SOCKET_PATH || '/cloudsql';
        pool = new pg_1.Pool({
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
exports.config = {
    pool: getPool,
    db: exports.adminDb,
    auth: exports.adminAuth,
    storage: exports.adminStorage,
};
//# sourceMappingURL=init.js.map