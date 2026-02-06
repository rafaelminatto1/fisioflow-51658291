import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || './service-account.json';
const TARGET_EMAIL = 'rafael.minatto@yahoo.com.br'; // Email do admin principal

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('👑 FisioFlow - Admin Claim Setter');
  console.log('==================================');

  // 1. Inicializar Firebase Admin
  try {
    // Tenta ler do caminho relativo ou absoluto
    let serviceAccount;
    try {
        const raw = await readFile(SERVICE_ACCOUNT_PATH, 'utf-8');
        serviceAccount = JSON.parse(raw);
    } catch (e) {
        // Tenta resolver a partir da raiz do projeto se falhar
        const resolvedPath = join(__dirname, '..', SERVICE_ACCOUNT_PATH);
        console.log(`ℹ️ Tentando ler credenciais de: ${resolvedPath}`);
        const raw = await readFile(resolvedPath, 'utf-8');
        serviceAccount = JSON.parse(raw);
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log('✅ Firebase Admin inicializado.');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
    console.error('👉 Certifique-se de que o arquivo service-account.json existe e o caminho está correto no .env');
    process.exit(1);
  }

  // 2. Buscar Usuário
  try {
    console.log(`🔍 Buscando usuário: ${TARGET_EMAIL}...`);
    const user = await admin.auth().getUserByEmail(TARGET_EMAIL);
    console.log(`✅ Usuário encontrado: ${user.uid}`);

    // 3. Definir Claims
    const currentClaims = user.customClaims || {};
    const newClaims = {
      ...currentClaims,
      admin: true,
      role: 'admin',
      org_admin: true // Garante acesso à organização
    };

    await admin.auth().setCustomUserClaims(user.uid, newClaims);
    console.log('✅ Custom Claims atualizados com sucesso!');
    console.log('📋 Claims atuais:', newClaims);
    console.log('\n⚠️  IMPORTANTE: O usuário precisa fazer logout e login novamente para que as alterações surtam efeito.');

  } catch (error) {
    console.error('❌ Erro ao processar usuário:', error.message);
    if (error.code === 'auth/user-not-found') {
        console.error('👉 O usuário não existe no Firebase Auth. Crie a conta primeiro.');
    }
  }
}

main();
