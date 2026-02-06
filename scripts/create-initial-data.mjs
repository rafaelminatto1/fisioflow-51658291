
// Initialize with your service account

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./fisioflow-migration-firebase-adminsdk.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createInitialData() {
  try {
    console.log('🔐 Creating initial Firestore data...\n');

    // 1. Create default organization
    const orgRef = db.collection('organizations').doc('default');
    await orgRef.set({
      name: 'Clínica Padrão',
      slug: 'default',
      active: true,
      settings: {
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR'
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Organization created: organizations/default');

    // 2. Create user profile
    const userId = 'yiFvTUpMhYhQiKk2fYgqWlBNA1';
    const profileRef = db.collection('profiles').doc(userId);
    
    await profileRef.set({
      user_id: userId,
      name: 'Usuário Teste QA',
      email: 'teste.qa@fisioflow.com',
      role: 'admin',
      organization_id: 'default',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Profile created: profiles/' + userId);

    // 3. Verify the data
    const orgDoc = await orgRef.get();
    const profileDoc = await profileRef.get();
    
    console.log('\n📋 Verification:');
    console.log('Organization exists:', orgDoc.exists);
    console.log('Profile exists:', profileDoc.exists);

    if (orgDoc.exists && profileDoc.exists) {
      console.log('\n🎉 Initial data created successfully!');
      console.log('Organization ID: default');
      console.log('Profile user_id:', userId);
      console.log('Profile role:', profileDoc.data().role);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

createInitialData();
