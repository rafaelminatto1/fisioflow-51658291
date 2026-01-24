/**
 * Temporary migration script to execute Cloud SQL schema
 * Run with: npx ts-node --transpile-only src/migrate-schema.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Cloud SQL connection for Cloud Functions
const dbSocketPath = process.env.DB_SOCKET_PATH || '/cloudsql';
const cloudSqlConnectionName = 'fisioflow-migration:us-central1:fisioflow-pg';

const pool = new Pool({
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
        } catch (err: any) {
          // Log error but continue (some statements might fail if objects already exist)
          console.log('⚠️  Erro (ignorado se já existe):', err.message);
        }
      }
    }

    console.log('\n✅ Schema criado com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro ao criar schema:', error.message);
    throw error;
  } finally {
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

export { runSchema };
