import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'TESTES-APAGAR');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

(async () => {
  console.log('Iniciando o navegador para geração de dados em PRODUÇÃO...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('Fazendo login...');
  await page.goto('https://www.moocafisio.com.br/login');
  await page.fill('input[type="email"]', 'REDACTED_EMAIL');
  await page.fill('input[type="password"]', 'REDACTED');
  await page.click('button[type="submit"], [data-testid="auth-submit-button"]');
  
  await page.waitForURL('**/agenda', { timeout: 15000 });
  console.log('Login realizado com sucesso!');

  // Extrair o token de autenticação local (para facilitar criação via API fetch em vez de clicar em 50 telas)
  const token = await page.evaluate(() => {
    return localStorage.getItem('auth-token') || localStorage.getItem('supabase.auth.token') || localStorage.getItem('access_token') || sessionStorage.getItem('token');
  });

  if (!token) {
    console.log('Aviso: Token não encontrado diretamente no localStorage. Vamos pela interface UI se possível.');
  }

  // TODO: Em seguida vamos criar os pacientes e evoluções. Primeiro vamos mapear a UI do Patient Creation.
  
  console.log('Navegando para Pacientes...');
  await page.goto('https://www.moocafisio.com.br/patients');
  await page.waitForLoadState('networkidle');

  // Printar o HTML body de pacientes para que a IA (eu) entenda o fluxo de criação.
  const html = await page.content();
  fs.writeFileSync(path.join(TEST_DIR, 'patients-page.html'), html);
  
  await browser.close();
  console.log('Passo 1 completo. HTML salvo para inspeção da estrutura.');
})();
