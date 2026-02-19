#!/usr/bin/env node

/**
 * Script para diagnosticar e corrigir problemas com agendamentos no Firestore
 * 
 * Verifica:
 * 1. Se o usuário tem organization_id no perfil
 * 2. Se existem agendamentos no banco
 * 3. Se os agendamentos têm os campos necessários
 * 
 * Uso: node scripts/fix-appointments-firestore.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Inicializar Firebase Admin
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  console.error('❌ Erro: serviceAccountKey.json não encontrado!');
  console.error('   Baixe a chave de serviço do Firebase Console:');
  console.error('   Project Settings > Service Accounts > Generate New Private Key');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();
const auth = admin.auth();

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Função para buscar usuário por email
async function findUserByEmail(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    return userRecord;
  } catch (error) {
    return null;
  }
}

// Função para verificar perfil no Firestore
async function checkProfile(uid) {
  const profileDoc = await db.collection('profiles').doc(uid).get();
  
  if (!profileDoc.exists) {
    return { exists: false };
  }
  
  const data = profileDoc.data();
  return {
    exists: true,
    data,
    hasOrganizationId: !!data.organization_id,
    organizationId: data.organization_id
  };
}

// Função para listar organizações disponíveis
async function listOrganizations() {
  const orgsSnapshot = await db.collection('organizations').limit(10).get();
  const orgs = [];
  
  orgsSnapshot.forEach(doc => {
    orgs.push({
      id: doc.id,
      name: doc.data().name || 'Sem nome',
      ...doc.data()
    });
  });
  
  return orgs;
}

// Função para contar agendamentos de uma organização
async function countAppointments(organizationId) {
  const appointmentsSnapshot = await db.collection('appointments')
    .where('organization_id', '==', organizationId)
    .limit(100)
    .get();
  
  const appointments = [];
  appointmentsSnapshot.forEach(doc => {
    appointments.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return {
    count: appointments.length,
    appointments: appointments.slice(0, 5) // Primeiros 5 para amostra
  };
}

// Função para atualizar organization_id no perfil
async function updateProfileOrganization(uid, organizationId) {
  await db.collection('profiles').doc(uid).update({
    organization_id: organizationId,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Função principal
async function main() {
  console.log('🔍 Diagnóstico de Agendamentos - FisioFlow\n');
  console.log('=' .repeat(60));
  
  // Passo 1: Obter email do usuário
  const email = await question('\n📧 Digite o email do usuário: ');
  
  if (!email || !email.includes('@')) {
    console.error('❌ Email inválido!');
    rl.close();
    process.exit(1);
  }
  
  console.log('\n🔎 Buscando usuário...');
  const user = await findUserByEmail(email);
  
  if (!user) {
    console.error(`❌ Usuário não encontrado: ${email}`);
    rl.close();
    process.exit(1);
  }
  
  console.log(`✅ Usuário encontrado: ${user.uid}`);
  console.log(`   Nome: ${user.displayName || 'N/A'}`);
  console.log(`   Email: ${user.email}`);
  
  // Passo 2: Verificar perfil
  console.log('\n🔎 Verificando perfil no Firestore...');
  const profile = await checkProfile(user.uid);
  
  if (!profile.exists) {
    console.error('❌ Perfil não encontrado no Firestore!');
    console.log('   O perfil precisa ser criado primeiro.');
    rl.close();
    process.exit(1);
  }
  
  console.log('✅ Perfil encontrado');
  console.log(`   Role: ${profile.data.role || 'N/A'}`);
  console.log(`   Nome: ${profile.data.full_name || 'N/A'}`);
  
  // Passo 3: Verificar organization_id
  console.log('\n🔎 Verificando Organization ID...');
  
  if (profile.hasOrganizationId) {
    console.log(`✅ Organization ID presente: ${profile.organizationId}`);
    
    // Verificar agendamentos
    console.log('\n🔎 Verificando agendamentos...');
    const appointmentsInfo = await countAppointments(profile.organizationId);
    
    console.log(`📊 Total de agendamentos: ${appointmentsInfo.count}`);
    
    if (appointmentsInfo.count > 0) {
      console.log('\n📋 Amostra de agendamentos:');
      appointmentsInfo.appointments.forEach((apt, index) => {
        console.log(`\n   ${index + 1}. ID: ${apt.id}`);
        console.log(`      Paciente: ${apt.patient_name || apt.patientName || 'N/A'}`);
        console.log(`      Data: ${apt.date || apt.appointment_date || 'N/A'}`);
        console.log(`      Hora: ${apt.start_time || apt.appointment_time || 'N/A'}`);
        console.log(`      Status: ${apt.status || 'N/A'}`);
      });
      
      console.log('\n✅ Tudo parece estar correto!');
      console.log('   Se os agendamentos não aparecem na interface:');
      console.log('   1. Verifique o console do navegador para erros de validação');
      console.log('   2. Verifique se os campos date, start_time e patient_id estão presentes');
      console.log('   3. Limpe o cache do navegador (Ctrl+Shift+R)');
    } else {
      console.log('\n⚠️  Nenhum agendamento encontrado para esta organização');
      console.log('   Isso é normal se você ainda não criou agendamentos.');
    }
  } else {
    console.log('❌ Organization ID NÃO está definido!');
    console.log('   Este é provavelmente o problema.');
    
    // Listar organizações disponíveis
    console.log('\n🔎 Buscando organizações disponíveis...');
    const orgs = await listOrganizations();
    
    if (orgs.length === 0) {
      console.error('\n❌ Nenhuma organização encontrada no banco!');
      console.log('   Você precisa criar uma organização primeiro.');
      rl.close();
      process.exit(1);
    }
    
    console.log(`\n📋 Organizações disponíveis (${orgs.length}):\n`);
    orgs.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.name}`);
      console.log(`      ID: ${org.id}`);
      console.log(`      Criada em: ${org.created_at || 'N/A'}\n`);
    });
    
    const choice = await question('Digite o número da organização para associar ao usuário (ou 0 para cancelar): ');
    const choiceNum = parseInt(choice);
    
    if (choiceNum === 0 || isNaN(choiceNum) || choiceNum < 1 || choiceNum > orgs.length) {
      console.log('❌ Operação cancelada.');
      rl.close();
      process.exit(0);
    }
    
    const selectedOrg = orgs[choiceNum - 1];
    console.log(`\n✅ Organização selecionada: ${selectedOrg.name}`);
    
    const confirm = await question('Confirmar atualização? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operação cancelada.');
      rl.close();
      process.exit(0);
    }
    
    console.log('\n🔄 Atualizando perfil...');
    await updateProfileOrganization(user.uid, selectedOrg.id);
    console.log('✅ Perfil atualizado com sucesso!');
    
    // Verificar agendamentos da organização
    console.log('\n🔎 Verificando agendamentos da organização...');
    const appointmentsInfo = await countAppointments(selectedOrg.id);
    console.log(`📊 Total de agendamentos: ${appointmentsInfo.count}`);
    
    if (appointmentsInfo.count > 0) {
      console.log('\n📋 Primeiros agendamentos:');
      appointmentsInfo.appointments.forEach((apt, index) => {
        console.log(`   ${index + 1}. ${apt.patient_name || 'N/A'} - ${apt.date || apt.appointment_date || 'N/A'}`);
      });
    }
    
    console.log('\n✅ Correção concluída!');
    console.log('   Agora faça logout e login novamente na aplicação.');
    console.log('   Os agendamentos devem aparecer normalmente.');
  }
  
  console.log('\n' + '='.repeat(60));
  rl.close();
  process.exit(0);
}

// Executar
main().catch(error => {
  console.error('\n❌ Erro:', error.message);
  console.error(error);
  rl.close();
  process.exit(1);
});
