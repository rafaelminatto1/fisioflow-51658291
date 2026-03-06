/**
 * Cria documentos essenciais no Firestore via Firebase CLI auth
 * Organização + Perfil do admin
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tenta usar o service account se existir, senão usa Application Default Credentials
let app;
const serviceAccountPath = resolve(__dirname, '../fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  app = initializeApp({ credential: cert(serviceAccount) });
  console.log('✅ Usando service account');
} catch {
  // Fallback: usa GOOGLE_APPLICATION_CREDENTIALS ou firebase-tools auth
  app = initializeApp({ projectId: 'fisioflow-migration' });
  console.log('✅ Usando Application Default Credentials');
}

const db = getFirestore(app);
const now = Timestamp.now();

const ORG_ID = 'ebe5dd27-f4e4-48b4-bd81-1b45b0bd3c02';
const USER_UID = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2';
const USER_EMAIL = 'rafael.minatto@yahoo.com.br';

async function run() {
  // 1. Organização
  console.log('\n🏢 Criando organização...');
  await db.collection('organizations').doc(ORG_ID).set({
    id: ORG_ID,
    name: 'FisioFlow',
    slug: 'fisioflow',
    plan: 'enterprise',
    is_active: true,
    owner_id: USER_UID,
    email: USER_EMAIL,
    settings: {
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
      currency: 'BRL',
    },
    max_patients: 9999,
    max_professionals: 99,
    created_at: now,
    updated_at: now,
  }, { merge: true });
  console.log(`   ✅ organizations/${ORG_ID}`);

  // 2. Perfil do admin
  console.log('\n👤 Criando perfil admin...');
  await db.collection('profiles').doc(USER_UID).set({
    id: USER_UID,
    user_id: USER_UID,
    full_name: 'Rafael Minatto',
    email: USER_EMAIL,
    role: 'admin',
    organization_id: ORG_ID,
    is_active: true,
    onboarding_completed: true,
    specialties: ['Administrador'],
    timezone: 'America/Sao_Paulo',
    created_at: now,
    updated_at: now,
  }, { merge: true });
  console.log(`   ✅ profiles/${USER_UID}`);

  // 3. Membro da organização
  console.log('\n👥 Criando membro da organização...');
  await db.collection('organization_members').doc(`${ORG_ID}_${USER_UID}`).set({
    organization_id: ORG_ID,
    user_id: USER_UID,
    role: 'admin',
    is_active: true,
    joined_at: now,
  }, { merge: true });
  console.log(`   ✅ organization_members/${ORG_ID}_${USER_UID}`);

  console.log('\n🎉 Firestore configurado com sucesso!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
