const admin = require('firebase-admin');
const { Pool } = require('pg');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'fisioflow-migration'
});

const db = admin.firestore();

async function syncPatients() {
  // Get connection string from environment
  const connString = process.env.POSTGRES_CONNECTION_STRING || 
                     process.env.DATABASE_URL ||
                     'postgres://fisioflow-migration:WQgqE5ZxtjGQ8vRv@34.151.232.249/fisioflow?host=/cloudsql/fisioflow-migration/southamerica-east1';

  const pool = new Pool({
    connectionString: connString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Fetching patients from Firestore...');
    const snap = await db.collection('patients').limit(50).get();
    console.log('Found', snap.size, 'patients');

    // Get organization
    const orgId = 'default';

    let synced = 0;
    for (const doc of snap.docs) {
      const p = doc.data();
      const name = p.name || p.full_name || 'Sem nome';
      
      await pool.query(`
        INSERT INTO patients (id, name, organization_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET organization_id = $3
      `, [doc.id, name, orgId]);
      
      console.log('✓', name);
      synced++;
    }

    console.log('✅ Synced', synced, 'patients');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

syncPatients().then(() => process.exit(0));
