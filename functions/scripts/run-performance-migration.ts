/**
 * Script para executar migração de performance indexes
 */

const PROJECT_ID = 'fisioflow-migration';
const FUNCTION_URL = 'https://us-central1-fisioflow-migration.cloudfunctions.net/createPerformanceIndexes';

interface ErrorResponse {
  error?: {
    message: string;
    status: number;
  };
}

interface MigrationResponse {
  success?: boolean;
  results?: Array<{ index: string; status: string }>;
  totalIndexes?: number;
  existingIndexes?: number;
  indexes?: any[];
}

async function getAuthToken(): Promise<string> {
  const { execSync } = require('child_process');
  try {
    // Try to get token from gcloud
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
    return token;
  } catch (error) {
    throw new Error('Failed to get auth token. Please run: gcloud auth login');
  }
}

async function runMigration(): Promise<void> {
  console.log('🚀 Starting performance indexes migration...');

  try {
    const token = await getAuthToken();
    console.log('✓ Got auth token');

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ data: {} }),
    });

    const result = (await response.json()) as ErrorResponse | MigrationResponse;

    if (!response.ok) {
      const errorResult = result as ErrorResponse;
      console.error('❌ Migration failed:', errorResult.error?.message);
      process.exit(1);
    }

    const successResult = result as MigrationResponse;
    console.log('✓ Migration completed successfully!');
    console.log(`  Total indexes: ${successResult.totalIndexes}`);
    console.log(`  Existing indexes: ${successResult.existingIndexes}`);

    if (successResult.results) {
      console.log('\n📊 Index results:');
      successResult.results.forEach((r) => {
        const icon = r.status === 'created' ? '✓' : r.status === 'exists' ? '-' : '✗';
        console.log(`  ${icon} ${r.index}: ${r.status}`);
      });
    }
  } catch (error: any) {
    console.error('❌ Error running migration:', error.message);
    process.exit(1);
  }
}

// Run migration
runMigration();
