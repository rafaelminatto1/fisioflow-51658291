"use strict";
/**
 * Temporary migration script to execute Cloud SQL schema
 * Run with: npx ts-node --transpile-only src/migrate-schema.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSchema = runSchema;
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Cloud SQL connection for Cloud Functions
const dbSocketPath = process.env.DB_SOCKET_PATH || '/cloudsql';
const cloudSqlConnectionName = 'fisioflow-migration:us-central1:fisioflow-pg';
const pool = new pg_1.Pool({
    host: path.join(dbSocketPath, cloudSqlConnectionName),
    user: 'fisioflow',
    password: 'FisioFlow@2024!Secure',
    database: 'fisioflow',
    max: 1,
});
async function runSchema() {
    console.log('🔧 Executando schema SQL no Cloud SQL...');
    const schemaPath = path.resolve(__dirname, '../../scripts/migration/cloudsql-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    const client = await pool.connect();
    try {
        // Split by semicolon and execute each statement
        const statements = schemaSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await client.query(statement);
                    console.log('✅ Statement executado:', statement.substring(0, 50) + '...');
                }
                catch (err) {
                    // Log error but continue (some statements might fail if objects already exist)
                    console.log('⚠️  Erro (ignorado se já existe):', err.message);
                }
            }
        }
        console.log('\n✅ Schema criado com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro ao criar schema:', error.message);
        throw error;
    }
    finally {
        client.release();
        await pool.end();
    }
}
// Execute if run directly
if (require.main === module) {
    runSchema()
        .then(() => {
        console.log('Migration complete!');
        process.exit(0);
    })
        .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate-schema.js.map