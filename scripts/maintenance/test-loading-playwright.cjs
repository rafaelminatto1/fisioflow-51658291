const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const EMAIL = 'REDACTED_EMAIL';
const PASSWORD = 'REDACTED';

const consoleErrors = [];
const consoleWarnings = [];
let stillLoading = false;

const logsDir = './playwright-logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

async function runTest() {
  console.log('========================================================');
  console.log('  Diagnóstico de Carregamento Infinito');
  console.log('========================================================\n');
  console.log(`🌐 URL: ${BASE_URL}`);
  console.log(`👤 Email: ${EMAIL}\n`);

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: logsDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    const logPrefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📝';
    console.log(`${logPrefix} [${type.toUpperCase()}] ${text.substring(0, 150)}...`);

    if (text.includes('permission-denied') || text.includes('Permissão')) {
      consoleErrors.push({ type, text: text.substring(0, 500) });
    }
    if (text.includes('CORS') || text.includes('cors')) {
      consoleWarnings.push({ type, text: text.substring(0, 300) });
    }
  });

  try {
    console.log('📍 Passo 1: Navegando para página...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.screenshot({ path: `${logsDir}/01-homepage.png` });

    console.log('\n📍 Passo 2: Aguardando estabilização (30s)...');
    let previousUrl = page.url();
    let urlStableCount = 0;

    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      const currentUrl = page.url();

      if (currentUrl === previousUrl) {
        urlStableCount++;
        console.log(`   ⏱ URL estável: ${urlStableCount}/3 (${currentUrl})`);
      } else {
        urlStableCount = 0;
        console.log(`   🔄 URL mudou: ${currentUrl}`);
      }

      previousUrl = currentUrl;

      if (urlStableCount >= 3) {
        console.log('\n✅ URL estabilizada!\n');
        break;
      }
    }

    await page.screenshot({ path: `${logsDir}/02-after-wait.png` });

    console.log('📍 Passo 3: Procurando campos de login...');
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    const submitButton = await page.$('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');

    if (!emailInput || !passwordInput) {
      console.log('⚠️  Campos de login não encontrados!');
      const bodyText = await page.$eval('body', el => el.innerText.substring(0, 500));
      console.log('\n📄 Texto na página:');
      console.log(bodyText);
    } else {
      console.log('✅ Campos encontrados!');

      console.log('📍 Passo 4: Preenchendo login...');
      if (emailInput) await emailInput.fill(EMAIL);
      if (passwordInput) await passwordInput.fill(PASSWORD);
      console.log('✅ Credenciais preenchidas');

      await page.screenshot({ path: `${logsDir}/03-filled.png` });

      if (submitButton) {
        console.log('📍 Passo 5: Clicando em login...');
        await submitButton.click();
        console.log('✅ Clicado!');
        await page.screenshot({ path: `${logsDir}/04-clicked.png` });

        console.log('\n📍 Passo 6: Aguardando redirecionamento...');
        await page.waitForTimeout(5000);

        console.log(`   URL atual: ${page.url()}`);
        await page.screenshot({ path: `${logsDir}/05-after-redirect.png` });

        console.log('\n📍 Passo 7: Aguardando 15 segundos para auth carregar...');
        await page.waitForTimeout(15000);

        await page.screenshot({ path: `${logsDir}/06-final.png` });

        console.log('\n📍 Passo 8: Verificando localStorage...');
        const localStorageData = await page.evaluate(() => {
          const items = {};
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            items[key] = window.localStorage.getItem(key);
          }
          return items;
        });

        console.log('📦 Chaves do localStorage:');
        Object.keys(localStorage).forEach(key => {
          const value = localStorage.getItem(key);
          if (key.includes('firebase:authUser')) {
            console.log(`   ${key}: ${value ? 'SIM' : 'NÃO'}`);
          }
        });

        const authKey = Object.keys(localStorage).find(k => k.includes('firebase:authUser:sj9b11xOjPT8Q34pPHBMUIPzvQQ2'));
        if (authKey) {
          try {
            const authData = JSON.parse(localStorage[authKey]);
            console.log('\n👤 Dados de auth:');
            console.log(JSON.stringify(authData, null, 2));
          } catch (e) {
            console.log('\n⚠️  Não foi possível parsear auth');
          }
        }
      } else {
        console.error('❌ Erro durante login');
      }

      await page.screenshot({ path: `${logsDir}/07-final-check.png` });
    }

  } catch (error) {
    console.error('\n❌ Erro durante teste:', error.message);
    await page.screenshot({ path: `${logsDir}/99-error.png` });
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log('  📊 RELATÓRIO FINAL');
    console.log('='.repeat(60) + '\n');

    console.log(`📋 Total mensagens console: ${consoleErrors.length + consoleWarnings.length}`);
    console.log(`   Erros de permissão: ${consoleErrors.length}`);
    console.log(`   Warnings/CORS: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n❌ ERROS:');
      consoleErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.text}`);
      });
    }

    if (consoleWarnings.length > 0) {
      console.log('\n⚠️ AVISOS:');
      consoleWarnings.forEach((warn, i) => {
        console.log(`   ${i + 1}. ${warn.text}`);
      });
    }

    if (consoleErrors.length === 0 && consoleWarnings.length === 0) {
      console.log('\n✅ SEM ERROS!');
      console.log('✅ Custom Claims funcionando corretamente');
    } else {
      console.log('\n⚠️ HÁ ERROS PRESENTES');
    }

    console.log('\n📸 Logs salvos em: ./playwright-logs/\n');

    await browser.close();
    process.exit(consoleErrors.length > 0 ? 1 : 0);
  }
}

runTest().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});
