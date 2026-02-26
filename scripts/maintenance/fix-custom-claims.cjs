/**
 * Script para corrigir Custom Claims do usuário
 * Execute: node fix-custom-claims.js
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Carregar service account
let serviceAccount;
try {
  serviceAccount = require('./functions/service-account-key.json');
} catch (error) {
  console.error('❌ Erro: Arquivo service-account-key.json não encontrado');
  console.error('   Certifique-se de que o arquivo está na pasta functions/');
  process.exit(1);
}

// Inicializar Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Obtém o organizationId do perfil do usuário no Firestore
 */
async function getUserOrganizationId(uid) {
  try {
    // Tentar pegar do profiles
    const profileDoc = await db.collection('profiles').doc(uid).get();
    if (profileDoc.exists) {
      const orgId = profileDoc.data()?.organizationId ||
                    profileDoc.data()?.organization_id ||
                    profileDoc.data()?.activeOrganizationId;
      if (orgId) {
        console.log(`✅ Organization ID encontrado no perfil: ${orgId}`);
        return orgId;
      }
    }

    // Tentar pegar do users
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const orgId = userDoc.data()?.organizationId ||
                    userDoc.data()?.organization_id;
      if (orgId) {
        console.log(`✅ Organization ID encontrado em users: ${orgId}`);
        return orgId;
      }
    }

    // Se não encontrou, listar organizações disponíveis
    console.log('⚠️  Organization ID não encontrado no perfil');
    console.log('   Listando organizações disponíveis...\n');

    const orgsSnapshot = await db.collection('organizations').limit(5).get();
    if (!orgsSnapshot.empty) {
      console.log('   Organizações disponíveis:');
      orgsSnapshot.forEach(doc => {
        console.log(`   - ${doc.id}: ${doc.data()?.name || 'Sem nome'}`);
      });
      console.log();
      return doc.id; // Usa a primeira organização
    }

    console.error('❌ Nenhuma organização encontrada no Firestore');
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar organizationId:', error.message);
    return null;
  }
}

/**
 * Obtém o role do perfil do usuário
 */
async function getUserRole(uid) {
  try {
    const profileDoc = await db.collection('profiles').doc(uid).get();
    if (profileDoc.exists) {
      const role = profileDoc.data()?.role;
      console.log(`✅ Role encontrado no perfil: ${role}`);
      return role;
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const role = userDoc.data()?.role;
      console.log(`✅ Role encontrado em users: ${role}`);
      return role;
    }

    return 'professional'; // Default
  } catch (error) {
    console.error('❌ Erro ao buscar role:', error.message);
    return 'professional';
  }
}

/**
 * Define Custom Claims para o usuário
 */
async function setCustomClaims(uid) {
  try {
    console.log(`\n🔧 Configurando Custom Claims para usuário: ${uid}`);

    const organizationId = await getUserOrganizationId(uid);
    const role = await getUserRole(uid);

    if (!organizationId) {
      console.error('❌ Não foi possível obter organizationId. Abortando.');
      return false;
    }

    const claims = {
      role: role,
      organizationId: organizationId,
      isProfessional: role === 'professional' || role === 'admin',
      admin: role === 'admin',
    };

    console.log('\n📋 Custom Claims a serem definidos:');
    console.log(JSON.stringify(claims, null, 2));
    console.log();

    await auth.setCustomUserClaims(uid, claims);
    console.log('✅ Custom Claims definidos com sucesso!');
    console.log('\n⚠️  IMPORTANTE: O usuário precisa fazer logout e login novamente');
    console.log('   para que as novas claims sejam aplicadas.\n');

    return true;
  } catch (error) {
    console.error('❌ Erro ao definir Custom Claims:', error.message);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('========================================================');
  console.log('  Script para Corrigir Custom Claims do Firebase');
  console.log('========================================================\n');

  // UID do usuário com erro nos logs
  const targetUid = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2';

  console.log(`👤 Usuário alvo: ${targetUid}\n`);

  // Verificar se o arquivo de service account existe
  if (!fs.existsSync('./functions/service-account-key.json')) {
    console.error('❌ Arquivo service-account-key.json não encontrado!');
    console.error('   Você precisa ter o service account da sua conta Firebase.');
    console.error('   Baixe em: https://console.firebase.google.com/');
    console.error('   Project Settings > Service Accounts > Generate New Private Key\n');
    process.exit(1);
  }

  const success = await setCustomClaims(targetUid);

  if (success) {
    console.log('========================================================');
    console.log('  ✅ Sucesso! Execute os passos abaixo:');
    console.log('========================================================');
    console.log('1. Faça logout no app profissional');
    console.log('2. Faça login novamente');
    console.log('3. Os erros de permissão devem desaparecer\n');
    process.exit(0);
  } else {
    console.log('========================================================');
    console.log('  ❌ Falha ao configurar Custom Claims');
    console.log('========================================================\n');
    process.exit(1);
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
