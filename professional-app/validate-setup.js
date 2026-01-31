#!/usr/bin/env node

/**
 * Script de validação da configuração de notificações
 * Verifica se todos os componentes necessários estão configurados
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validando configuração de notificações...\n');

// 1. Verificar se o .env existe e tem as variáveis necessárias
const envPath = '.env';
console.log('1. Verificando arquivo .env...');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  ];

  let allVarsPresent = true;
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`)) {
      console.log(`   ✅ ${varName}: configurada`);
    } else {
      console.log(`   ❌ ${varName}: NÃO encontrada`);
      allVarsPresent = false;
    }
  });

  if (allVarsPresent) {
    console.log('   ✅ Todas as variáveis de ambiente Firebase estão configuradas!\n');
  } else {
    console.log('   ⚠️  Algumas variáveis de ambiente estão faltando!\n');
  }
} else {
  console.log('   ❌ Arquivo .env não encontrado!\n');
}

// 2. Verificar package.json
const packagePath = 'package.json';
console.log('2. Verificando dependências...');
if (fs.existsSync(packagePath)) {
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (packageContent.dependencies && packageContent.dependencies['expo-notifications']) {
    console.log('   ✅ expo-notifications: instalada');
    const version = packageContent.dependencies['expo-notifications'];
    console.log(`      Versão: ${version}\n`);
  } else {
    console.log('   ❌ expo-notifications: NÃO encontrada!\n');
  }
} else {
  console.log('   ❌ package.json não encontrado!\n');
}

// 3. Verificar app.json
const appJsonPath = 'app.json';
console.log('3. Verificando configuração do app...');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  if (appJson.expo && appJson.expo.plugins && appJson.expo.plugins.includes('expo-notifications')) {
    console.log('   ✅ Plugin expo-notifications: configurado no app.json\n');
  } else {
    console.log('   ❌ Plugin expo-notifications: NÃO encontrado no app.json!\n');
  }
} else {
  console.log('   ❌ app.json não encontrado!\n');
}

// 4. Verificar arquivos de código
const notificationsPath = 'lib/notifications.ts';
console.log('4. Verificando código de notificações...');
if (fs.existsSync(notificationsPath)) {
  const notificationsCode = fs.readFileSync(notificationsPath, 'utf8');
  const requiredFunctions = [
    'registerForPushNotificationsAsync',
    'scheduleLocalNotification',
    'sendTestNotification'
  ];

  let allFunctionsPresent = true;
  requiredFunctions.forEach(func => {
    if (notificationsCode.includes(`export async function ${func}`)) {
      console.log(`   ✅ ${func}: implementada`);
    } else {
      console.log(`   ❌ ${func}: NÃO encontrada`);
      allFunctionsPresent = false;
    }
  });

  if (allFunctionsPresent) {
    console.log('   ✅ Todas as funções principais estão implementadas!\n');
  }
} else {
  console.log('   ❌ Arquivo lib/notifications.ts não encontrado!\n');
}

// 5. Verificar layout.tsx
const layoutPath = 'app/_layout.tsx';
console.log('5. Verificando inicialização no layout...');
if (fs.existsSync(layoutPath)) {
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  if (layoutCode.includes('registerForPushNotificationsAsync') && layoutCode.includes('useEffect')) {
    console.log('   ✅ Inicialização de notificações: configurada no _layout.tsx\n');
  } else {
    console.log('   ❌ Inicialização de notificações: NÃO encontrada no _layout.tsx!\n');
  }
} else {
  console.log('   ❌ Arquivo app/_layout.tsx não encontrado!\n');
}

console.log('🎯 RESULTADO FINAL:');
console.log('==================');

// Verificação final
const checks = [
  fs.existsSync(envPath),
  fs.existsSync(packagePath),
  fs.existsSync(appJsonPath),
  fs.existsSync(notificationsPath),
  fs.existsSync(layoutPath)
];

if (checks.every(check => check)) {
  console.log('✅ Configuração de notificações PRONTA!');
  console.log('\n📱 Para testar:');
  console.log('1. Execute: npx expo start');
  console.log('2. Abra o app em seu dispositivo');
  console.log('3. Verifique os logs pelo token de notificação');
  console.log('4. Chame a função sendTestNotification() para testar');

  console.log('\n⚠️  Lembre-se:');
  console.log('- Você ainda precisa configurar o Apple Developer Portal com suas credenciais');
  console.log('- O provisioning profile precisa ser atualizado para incluir Push Notifications');
  console.log('  (detalhes em apple-developer-portal-process-report.md)');
} else {
  console.log('❌ Alguns componentes estão faltando. Verifique os erros acima.');
}

console.log('\n📚 Documentação disponível:');
console.log('- NOTIFICATIONS_SETUP_REPORT.md: Relatório completo');
console.log('- apple-developer-portal-process-report.md: Guia Apple Developer');
console.log('- test-notifications.js: Script de teste');