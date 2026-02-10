/**
 * HTTP endpoint to create doctors table
 *
 * Usage: curl -X POST "https://REGION-PROJECT.cloudfunctions.net/runDoctorsTable?key=YOUR_API_KEY"
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getPool } from '../init';

export const runDoctorsTable = onRequest({
  secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
  memory: '256MiB',
  timeoutSeconds: 60,
}, async (req, res) => {
  // Simple API key check
  const apiKey = req.query.key || req.headers['x-migration-key'];
  if (apiKey !== 'fisioflow-migration-2026') {
    res.status(403).json({ error: 'Forbidden - Invalid API key' });
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed - use POST' });
    return;
  }

  // Use the existing pool from init.ts
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('🔄 Starting Doctors Table Migration...');

    // Enable pg_trgm extension if not exists
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    console.log('✅ pg_trgm extension enabled');

    // Create doctors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        specialty TEXT,
        crm TEXT,
        crm_state TEXT,
        phone TEXT,
        email TEXT,
        clinic_name TEXT,
        clinic_address TEXT,
        clinic_phone TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_by TEXT REFERENCES profiles(user_id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ doctors table created');

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_doctors_org_active ON doctors(organization_id, is_active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty) WHERE specialty IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_doctors_name_trgm ON doctors USING GIN (name gin_trgm_ops)`);
    console.log('✅ doctors indexes created');

    // Create trigger for updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors
    `);
    await client.query(`
      CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✅ doctors trigger created');

    // Enable RLS
    await client.query(`ALTER TABLE doctors ENABLE ROW LEVEL SECURITY`);

    // Create RLS policy
    await client.query(`
      DROP POLICY IF EXISTS doctors_org_policy ON doctors
    `);
    await client.query(`
      CREATE POLICY doctors_org_policy ON doctors
        FOR ALL
        USING (organization_id = current_setting('app.organization_id', true)::uuid)
    `);
    console.log('✅ doctors RLS policy created');

    // Verify table was created
    const checkResult = await client.query(`
      SELECT COUNT(*) as count FROM doctors
    `);

    console.log('✅ Doctors Table Migration completed successfully!');
    console.log(`📊 Current doctors count: ${checkResult.rows[0].count}`);

    res.json({
      success: true,
      message: 'Doctors table migration completed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: error?.message || String(error),
    });
  } finally {
    client.release();
  }
});
