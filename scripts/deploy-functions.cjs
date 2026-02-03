/**
 * Script de Deploy das Cloud Functions
 * Configuração e deploy das funções do Firebase Functions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Preparando deploy das Cloud Functions...\n');

// ============================================================================
// 1. Verificar pré-requisitos
// ============================================================================

console.log('1️⃣ Verificando pré-requisitos...');

// Verificar se o Firebase CLI está instalado
try {
  execSync('firebase --version', { stdio: 'pipe' });
  console.log('   ✅ Firebase CLI instalado');
} catch {
  console.error('   ❌ Firebase CLI não encontrado. Instale com: npm install -g firebase-tools');
  process.exit(1);
}

// Verificar se está logado
try {
  execSync('firebase login:list', { stdio: 'pipe' });
  console.log('   ✅ Autenticado no Firebase');
} catch {
  console.log('   ⚠️  Não autenticado. Execute: firebase login');
}

// Verificar arquivo .firebaserc
const firebasercPath = path.join(__dirname, '../.firebaserc');
if (!fs.existsSync(firebasercPath)) {
  console.log('\n   Criando .firebaserc...');
  fs.writeFileSync(
    firebasercPath,
    JSON.stringify({
      projects: {
        default: 'fisioflow-production',
      },
    }, null, 2)
  );
}

// ============================================================================
// 2. Criar/verificar firebase.json
// ============================================================================

console.log('\n2️⃣ Configurando firebase.json...');

const firebaseJsonPath = path.join(__dirname, '../firebase.json');

const firebaseConfig = {
  functions: [
    {
      source: 'functions',
      codebase: 'default',
      ignore: [
        'node_modules',
        '.git',
        'firebase-debug.log',
        'firebase-debug.*.log',
      ],
      predeploy: [
        'npm --prefix "$RESOURCE_DIR" run build',
      ],
    },
  ],
};

if (!fs.existsSync(firebaseJsonPath)) {
  fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseConfig, null, 2));
  console.log('   ✅ firebase.json criado');
} else {
  console.log('   ✅ firebase.json já existe');
}

// ============================================================================
// 3. Instalar dependências das functions
// ============================================================================

console.log('\n3️⃣ Instalando dependências das Functions...');

const functionsDir = path.join(__dirname, '../functions');

try {
  console.log('   Instalando pacotes...');
  execSync('pnpm install', { cwd: functionsDir, stdio: 'inherit' });
  console.log('   ✅ Dependências instaladas');
} catch (error) {
  console.error('   ❌ Erro ao instalar dependências:', error.message);
}

// ============================================================================
// 4. Deploy
// ============================================================================

console.log('\n4️⃣ Fazendo deploy das Cloud Functions...');

try {
  // Deploy apenas das functions
  execSync('firebase deploy --only functions', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  console.log('\n   ✅ Deploy concluído com sucesso!');
} catch (error) {
  console.error('\n   ❌ Erro no deploy:', error.message);
  console.log('\n   Possíveis soluções:');
  console.log('   - Verifique se o projeto Firebase está criado');
  console.log('   - Execute: firebase projects:list');
  console.log('   - Execute: firebase use <your-project-id>');
  process.exit(1);
}

// ============================================================================
// 5. Verificar functions deployadas
// ============================================================================

console.log('\n5️⃣ Verificando functions deployadas...');

try {
  const result = execSync('firebase functions:list', {
    encoding: 'utf-8',
  });
  console.log(result);
} catch {
  console.log('   ℹ️  Lista de functions não disponível');
}

console.log('\n✨ Deploy completo!');
console.log('\n📋 Functions disponíveis:');
console.log('   - executeAutomationCall: Executa automação manualmente');
console.log('   - testAutomationCall: Testa automação (dry run)');
console.log('   - triggerAutomationEvent: Webhook para disparar eventos');
console.log('   - scheduledAutomations: Executa automações agendadas');
console.log('   - onTimeEntryCreated: Trigger quando time entry é criada');
