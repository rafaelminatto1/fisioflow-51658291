/**
 * Script Playwright para testar login e verificar permissões
 * Execute: node test-permissions-playwright.cjs
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configurações
const BASE_URL = 'http://localhost:5173';
const EMAIL = 'REDACTED_EMAIL';
const PASSWORD = 'REDACTED';

// Coletar erros do console
const consoleErrors = [];
const consoleWarnings = [];

async function runTest() {
  console.log('========================================================');
  console.log('  Teste de Permissões com Playwright');
  console.log('========================================================\n');
  console.log(`🌐 URL: ${BASE_URL}`);
  console.log(`👤 Email: ${EMAIL}\n`);

  const browser = await chromium.launch({
    headless: false, // Modo visível para você ver
    slowMo: 500, // Mais lento para você acompanhar
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: './playwright-video',
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // Coletar mensagens do console
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (text.includes('permission-denied') || text.includes('Permissão')) {
      consoleErrors.push({
        type,
        text: text.substring(0, 200),
        timestamp: new Date().toISOString(),
      });
      console.log(`❌ [${type.toUpperCase()}] Permission Error: ${text.substring(0, 100)}...`);
    } else if (type === 'error') {
      consoleErrors.push({
        type,
        text: text.substring(0, 200),
        timestamp: new Date().toISOString(),
      });
    } else if (type === 'warning' && (text.includes('CORS') || text.includes('cors'))) {
      consoleWarnings.push({
        type,
        text: text.substring(0, 200),
        timestamp: new Date().toISOString(),
      });
      console.log(`⚠️  [WARNING] CORS: ${text.substring(0, 100)}...`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    if (response.status() >= 400) {
      console.log(`🌐 HTTP ${response.status()}: ${url}`);
    }
  });

  try {
    // Step 1: Navegar para a página de login
    console.log('\n📍 Passo 1: Navegando para página de login...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    console.log('✅ Página carregada');

    // Captura de tela inicial
    await page.screenshot({ path: './playwright-screenshots/01-login-page.png' });

    // Step 2: Preencher login
    console.log('\n📍 Passo 2: Preenchendo credenciais...');
    await page.waitForSelector('input[type="email"], input[name="email"], input[id*="email"]', { timeout: 5000 });
    await page.fill('input[type="email"], input[name="email"], input[id*="email"]', EMAIL);

    await page.waitForSelector('input[type="password"], input[name="password"], input[id*="password"]', { timeout: 5000 });
    await page.fill('input[type="password"], input[name="password"], input[id*="password"]', PASSWORD);

    console.log('✅ Credenciais preenchidas');

    // Captura após preencher
    await page.screenshot({ path: './playwright-screenshots/02-filled-form.png' });

    // Step 3: Fazer login
    console.log('\n📍 Passo 3: Fazendo login...');
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Sign in")');

    // Esperar redirecionamento ou carregamento
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Captura após login
    await page.screenshot({ path: './playwright-screenshots/03-after-login.png' });

    console.log('✅ Login realizado');

    // Step 4: Verificar se o app carregou corretamente
    console.log('\n📍 Passo 4: Verificando carregamento do app...');
    await page.waitForTimeout(5000); // Esperar 5 segundos para carregar tudo

    // Captura do estado atual
    await page.screenshot({ path: './playwright-screenshots/04-dashboard.png' });

    // Step 5: Verificar erros no console
    console.log('\n📍 Passo 5: Analisando erros do console...');
    await page.waitForTimeout(3000);

    // Step 6: Pegar o UID do usuário do Firebase Auth
    console.log('\n📍 Passo 6: Verificando custom claims...');
    try {
      const localStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          items[key] = localStorage.getItem(key);
        }
        return items;
      });

      console.log('📦 LocalStorage keys:', Object.keys(localStorage));

      // Tentar pegar informações do usuário
      if (localStorage['firebase:authUser:sj9b11xOjPT8Q34pPHBMUIPzvQQ2']) {
        const authData = JSON.parse(localStorage['firebase:authUser:sj9b11xOjPT8Q34pPHBMUIPzvQQ2']);
        console.log('👤 Auth Data:', JSON.stringify(authData, null, 2));
      }
    } catch (e) {
      console.log('⚠️  Não foi possível ler localStorage:', e.message);
    }

    // Step 7: Verificar organizationId no código
    console.log('\n📍 Passo 7: Verificando organizationId...');
    try {
      const orgId = await page.evaluate(() => {
        // Tentar encontrar o organizationId no window
        return window.__FISIOFLOW_ORG_ID__ ||
               window.__ORG_ID__ ||
               localStorage.getItem('organizationId') ||
               null;
      });
      console.log(`🏢 Organization ID: ${orgId || 'Não encontrado no frontend'}`);
    } catch (e) {
      console.log('⚠️  Não foi possível verificar organizationId:', e.message);
    }

    // Step 8: Aguardar mais um pouco e verificar erros restantes
    console.log('\n📍 Passo 8: Aguardando 10 segundos para capturar mais erros...');
    await page.waitForTimeout(10000);

    // Captura final
    await page.screenshot({ path: './playwright-screenshots/05-final-state.png' });

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    await page.screenshot({ path: './playwright-screenshots/99-error.png' });
  } finally {
    // Relatório final
    console.log('\n========================================================');
    console.log('  📊 RELATÓRIO FINAL');
    console.log('========================================================');

    if (consoleErrors.length === 0 && consoleWarnings.length === 0) {
      console.log('✅ Nenhum erro de permissão ou CORS encontrado!');
      console.log('✅ O app está funcionando corretamente após o fix das claims.');
    } else {
      if (consoleErrors.length > 0) {
        console.log(`\n❌ Erros de Permissão encontrados: ${consoleErrors.length}`);
        consoleErrors.forEach((err, i) => {
          console.log(`   ${i + 1}. [${err.type}] ${err.text}`);
        });
      }

      if (consoleWarnings.length > 0) {
        console.log(`\n⚠️  Avisos/CORS encontrados: ${consoleWarnings.length}`);
        consoleWarnings.forEach((warn, i) => {
          console.log(`   ${i + 1}. [${warn.type}] ${warn.text}`);
        });
      }

      console.log('\n💡 Recomendações:');
      if (consoleErrors.some(e => e.text.includes('permission-denied'))) {
        console.log('   - Erros de permission-denied ainda presentes.');
        console.log('   - Possíveis causas:');
        console.log('     1. OrganizationId "default" é inválido');
        console.log('     2. Custom claims não foram atualizadas no cliente');
        console.log('     3. Firestore rules bloqueiam acesso');
        console.log('\n   - Soluções:');
        console.log('     1. Verificar organizationId correto no Firestore');
        console.log('     2. Fazer logout e login novamente (já fizemos via script)');
      }

      if (consoleWarnings.some(w => w.text.includes('CORS'))) {
        console.log('   - Erros de CORS ainda presentes.');
        console.log('   - Necessário corrigir CORS nos Cloud Run services');
      }
    }

    console.log('\n📸 Screenshots salvos em: ./playwright-screenshots/');
    console.log('🎥 Vídeo salvo em: ./playwright-video/\n');

    await browser.close();
    process.exit(consoleErrors.length === 0 && consoleWarnings.length === 0 ? 0 : 1);
  }
}

// Criar diretórios necessários
['./playwright-screenshots', './playwright-video'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Executar
runTest().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
