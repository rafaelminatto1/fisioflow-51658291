import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'TESTES-APAGAR');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('Login...');
  await page.goto('https://www.moocafisio.com.br/login');
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button[type="submit"], [data-testid="auth-submit-button"]');
  await page.waitForURL('**/agenda');

  console.log('Navegando para Pacientes...');
  await page.goto('https://www.moocafisio.com.br/patients');
  await page.waitForLoadState('networkidle');
  
  // Salva screenshot para o log
  await page.screenshot({ path: path.join(TEST_DIR, '01-patients.png') });
  
  // Tentar encontrar botão de novo paciente
  console.log('Tentando clicar em Novo Paciente...');
  try {
     const button = page.locator('button:has-text("Paciente"), button:has-text("Adicionar"), button:has-text("Novo")').first();
     await button.click({ timeout: 5000 });
     await page.waitForTimeout(2000);
     await page.screenshot({ path: path.join(TEST_DIR, '02-novo-paciente-modal.png') });
  } catch (err) {
     console.log('Erro ao clicar em novo paciente:', err.message);
  }

  await browser.close();
})();
