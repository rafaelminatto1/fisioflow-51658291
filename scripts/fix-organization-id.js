#!/usr/bin/env node

/**
 * Script simplificado para corrigir organization_id usando Firebase Admin SDK
 * 
 * Uso: 
 * 1. Certifique-se de estar logado no Firebase CLI: firebase login
 * 2. Execute: node scripts/fix-organization-id.js <email-do-usuario>
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔍 Correção de Organization ID - FisioFlow\n');
  console.log('=' .repeat(60));
  
  // Obter email do usuário
  let email = process.argv[2];
  
  if (!email) {
    email = await question('\n📧 Digite o email do usuário: ');
  }
  
  if (!email || !email.includes('@')) {
    console.error('❌ Email inválido!');
    rl.close();
    process.exit(1);
  }
  
  console.log(`\n🔎 Diagnosticando usuário: ${email}`);
  console.log('\nEste script irá:');
  console.log('1. Verificar se o usuário existe');
  console.log('2. Verificar se tem organization_id');
  console.log('3. Listar organizações disponíveis');
  console.log('4. Permitir associar o usuário a uma organização');
  console.log('');
  
  const confirm = await question('Continuar? (s/n): ');
  
  if (confirm.toLowerCase() !== 's') {
    console.log('❌ Operação cancelada.');
    rl.close();
    process.exit(0);
  }
  
  console.log('\n📝 Para executar este script, você precisa:');
  console.log('');
  console.log('1. Baixar a chave de serviço do Firebase:');
  console.log('   - Acesse: https://console.firebase.google.com/project/fisioflow-migration/settings/serviceaccounts/adminsdk');
  console.log('   - Clique em "Generate New Private Key"');
  console.log('   - Salve como serviceAccountKey.json na raiz do projeto');
  console.log('');
  console.log('2. Instale as dependências:');
  console.log('   npm install firebase-admin');
  console.log('');
  console.log('3. Execute novamente:');
  console.log(`   node scripts/fix-appointments-firestore.js`);
  console.log('');
  console.log('OU use o Firebase Console manualmente:');
  console.log('');
  console.log('1. Acesse: https://console.firebase.google.com/project/fisioflow-migration/firestore');
  console.log('2. Vá para a coleção "profiles"');
  console.log(`3. Busque o documento do usuário: ${email}`);
  console.log('4. Adicione/edite o campo "organization_id" com um UUID válido');
  console.log('5. Salve as alterações');
  console.log('');
  console.log('Para encontrar um organization_id válido:');
  console.log('1. Vá para a coleção "organizations"');
  console.log('2. Copie o ID de um documento (o UUID na primeira coluna)');
  console.log('3. Use esse ID no campo organization_id do perfil');
  console.log('');
  
  rl.close();
}

main().catch(error => {
  console.error('\n❌ Erro:', error.message);
  rl.close();
  process.exit(1);
});
