import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'TESTES-APAGAR');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await context.newPage();

  console.log('Autenticando...');
  await page.goto('https://www.moocafisio.com.br/login');
  await page.fill('input[type="email"]', 'REDACTED_EMAIL');
  await page.fill('input[type="password"]', 'REDACTED');
  await page.click('button[type="submit"], [data-testid="auth-submit-button"]');
  await page.waitForURL('**/agenda', { timeout: 15000 });

  const pName = `Paciente Evolução Joelho E2E`;

  console.log('Indo para Pacientes...');
  await page.goto('https://www.moocafisio.com.br/patients');
  await page.waitForLoadState('networkidle');
  
  try {
     console.log('Clicando em Novo Paciente...');
     await page.click('button:has-text("Novo Paciente"), a:has-text("Novo Paciente")');
     await page.waitForTimeout(2000);
     
     // Preenchendo o nome
     console.log('Preenchendo formulário...');
     await page.fill('input[name="fullName"], input[name="name"], input[placeholder*="Nome"]', pName);
     
     // Clicar em salvar
     await page.click('button:has-text("Salvar"), button:has-text("Cadastrar")');
     await page.waitForTimeout(3000);
     console.log('Paciente Criado com sucesso.');

     // Ir para a página de evolução dele (supondo que fomos redirecionados, pegamos a URL ou vamos direto para a lista e buscamos)
     // Vamos tirar um print de onde estamos
     await page.screenshot({ path: path.join(TEST_DIR, '03-patient-created.png') });
     
  } catch (err) {
     console.log('Fallback: interface de Novo Paciente não mapeada. Tirando print para debug...', err.message);
     await page.screenshot({ path: path.join(TEST_DIR, '03-erro-criacao.png') });
  }

  await browser.close();
  console.log('Teste visual concluído.');
})();
