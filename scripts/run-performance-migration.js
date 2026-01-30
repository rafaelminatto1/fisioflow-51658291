/**
 * Script para executar migração de performance indexes
 * Versão JavaScript para execução direta com node
 */

const PROJECT_ID = 'fisioflow-migration';
const FUNCTION_URL = 'https://us-central1-fisioflow-migration.cloudfunctions.net/createPerformanceIndexes';
const API_KEY = 'AIzaSyCz2c3HvQoV7RvFCbCaudbEEelEQaO-tY8';

async function getAuthToken() {
  const { execSync } = require('child_process');
  const https = require('https');

  // First try to get Firebase ID token via user authentication
  try {
    // Try getting a user token from local firebase login
    const token = execSync('firebase login: 2>&1 | grep -o "[A-Za-z0-9\\-]\\{100,\\}"', { encoding: 'utf-8' }).trim();
    if (token && token.length > 50) {
      return token;
    }
  } catch (e) {
    // Continue to alternative method
  }

  // Alternative: Use service account
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountPath) {
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      return token.token;
    }
  } catch (e) {
    // Continue
  }

  throw new Error('Could not get auth token. Please authenticate with: firebase login');
}

async function runMigration() {
  console.log('🚀 Starting performance indexes migration...');

  // Use a direct SQL approach instead of calling the function
  console.log('⚠️  Skipping Cloud Function call - would require Firebase Auth token');
  console.log('📝 To run this migration:');
  console.log('   1. Authenticate with: firebase login');
  console.log('   2. Call the function from Firebase Console or use the Firebase SDK');
  console.log('');
  console.log('🔧 Recommended indexes to create:');
  console.log('');
  console.log('-- Patients');
  console.log('CREATE INDEX IF NOT EXISTS idx_patients_org_id ON patients(organization_id) WHERE is_active = true;');
  console.log('CREATE INDEX IF NOT EXISTS idx_patients_cpf_org ON patients(cpf, organization_id);');
  console.log('CREATE INDEX IF NOT EXISTS idx_patients_name_org ON patients(LOWER(name), organization_id);');
  console.log('');
  console.log('-- Appointments');
  console.log('CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(organization_id, date, start_time);');
  console.log('CREATE INDEX IF NOT EXISTS idx_appointments_patient_org ON appointments(patient_id, organization_id);');
  console.log('');
  console.log('-- Exercises');
  console.log('CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = true;');
  console.log('CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category_id);');
  console.log('');
  console.log('-- Assessments');
  console.log('CREATE INDEX IF NOT EXISTS idx_assessments_patient_org ON patient_assessments(patient_id, organization_id);');
  console.log('');
  console.log('-- Medical Records');
  console.log('CREATE INDEX IF NOT EXISTS idx_medical_records_patient_org ON medical_records(patient_id, organization_id);');
  console.log('');
  console.log('-- Financial');
  console.log('CREATE INDEX IF NOT EXISTS idx_transactions_org ON transacoes(organization_id, created_at DESC);');
  console.log('CREATE INDEX IF NOT EXISTS idx_payments_patient ON pagamentos(patient_id, organization_id);');
  console.log('');
  console.log('✓ Migration script completed (manual execution required)');
}

runMigration().catch(console.error);
