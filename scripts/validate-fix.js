#!/usr/bin/env node

/**
 * Script de validação para confirmar que o organization_id foi configurado corretamente
 * 
 * Uso: node scripts/validate-fix.js
 */

const admin = require('firebase-admin');

// Verificar se serviceAccountKey existe
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  console.log('⚠️  serviceAccountKey.json não encontrado.');
  console.log('   Este script requer a chave de serviço do Firebase.');
  console.log('   Mas você já fez a correção manualmente pelo Console!');
  console.log('');
  console.log('✅ Para validar, faça o seguinte na aplicação:');
  console.log('   1. Faça LOGOUT');
  console.log('   2. Faça LOGIN novamente');
  console.log('   3. Vá para /agenda');
  console.log('   4. Verifique o painel de diagnóstico');
  console.log('');
  process.exit(0);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function validateFix() {
  console.log('🔍 Validando correção do organization_id\n');
  console.log('='.repeat(60));
  
  const email = 'rafael.minatto@yahoo.com.br';
  
  try {
    // Buscar usuário
    console.log(`\n📧 Buscando usuário: ${email}`);
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Usuário encontrado: ${userRecord.uid}`);
    
    // Buscar perfil
    console.log('\n🔎 Verificando perfil no Firestore...');
    const profileDoc = await db.collection('profiles').doc(userRecord.uid).get();
    
    if (!profileDoc.exists) {
      console.log('❌ Perfil não encontrado!');
      process.exit(1);
    }
    
    const profile = profileDoc.data();
    console.log('✅ Perfil encontrado');
    
    // Verificar organization_id
    console.log('\n🔎 Verificando organization_id...');
    if (!profile.organization_id) {
      console.log('❌ organization_id NÃO está definido!');
      console.log('   Por favor, adicione o campo manualmente no Firebase Console.');
      process.exit(1);
    }
    
    console.log(`✅ organization_id presente: ${profile.organization_id}`);
    
    // Verificar se a organização existe
    console.log('\n🔎 Verificando se a organização existe...');
    const orgDoc = await db.collection('organizations').doc(profile.organization_id).get();
    
    if (!orgDoc.exists) {
      console.log('⚠️  Organização não encontrada no banco!');
      console.log(`   ID: ${profile.organization_id}`);
      console.log('   Isso pode causar problemas. Verifique se o ID está correto.');
    } else {
      const org = orgDoc.data();
      console.log(`✅ Organização encontrada: ${org.name || 'Sem nome'}`);
    }
    
    // Verificar agendamentos
    console.log('\n🔎 Verificando agendamentos...');
    const appointmentsSnapshot = await db.collection('appointments')
      .where('organization_id', '==', profile.organization_id)
      .limit(5)
      .get();
    
    console.log(`📊 Agendamentos encontrados: ${appointmentsSnapshot.size}`);
    
    if (appointmentsSnapshot.size > 0) {
      console.log('\n📋 Primeiros agendamentos:');
      appointmentsSnapshot.forEach((doc, index) => {
        const apt = doc.data();
        console.log(`   ${index + 1}. ${apt.patient_name || 'N/A'} - ${apt.date || apt.appointment_date || 'N/A'} às ${apt.start_time || apt.appointment_time || 'N/A'}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Faça LOGOUT na aplicação');
    console.log('2. Faça LOGIN novamente');
    console.log('3. Vá para /agenda');
    console.log('4. Os agendamentos devem aparecer!');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

validateFix();
