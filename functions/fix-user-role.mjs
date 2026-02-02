import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import pg from 'pg';

const { Pool } = pg;

const app = initializeApp({ projectId: 'fisioflow-migration' });
const db = getFirestore(app);
const auth = getAuth(app);

const email = 'rafael.minatto@yahoo.com.br';
const targetRole = 'admin';

// Create PostgreSQL pool
const pool = new Pool({
  host: '34.151.232.43',
  port: 5432,
  database: 'fisioflow',
  user: 'fisioflow',
  password: 'F1s10Fl0w2024',
  ssl: { rejectUnauthorized: false }
});

try {
  // Get user
  const userRecord = await auth.getUserByEmail(email);
  console.log('User UID:', userRecord.uid);
  
  // Check PostgreSQL
  const pgResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userRecord.uid]);
  
  if (pgResult.rows.length > 0) {
    const currentRole = pgResult.rows[0].role;
    console.log('Current role in PostgreSQL:', currentRole);
    
    if (currentRole !== targetRole) {
      console.log('Updating role to:', targetRole);
      await pool.query('UPDATE profiles SET role = $1 WHERE user_id = $2', [targetRole, userRecord.uid]);
      console.log('✅ Updated PostgreSQL');
    } else {
      console.log('✅ Role already correct in PostgreSQL');
    }
  } else {
    console.log('User not found in PostgreSQL - this is expected, using Firestore');
  }
  
  // Verify Firestore
  const profileDoc = await db.collection('profiles').doc(userRecord.uid).get();
  if (profileDoc.exists) {
    const firestoreRole = profileDoc.data().role;
    console.log('Role in Firestore:', firestoreRole);
    
    if (firestoreRole !== targetRole) {
      console.log('Updating Firestore role to:', targetRole);
      await profileDoc.ref.update({ role: targetRole });
      console.log('✅ Updated Firestore');
    } else {
      console.log('✅ Role already correct in Firestore');
    }
  }
  
  console.log('\nDone! Please refresh the page to see the changes.');
  await pool.end();
  process.exit(0);
} catch (error) {
  console.error('Error:', error.message);
  await pool.end();
  process.exit(1);
}
