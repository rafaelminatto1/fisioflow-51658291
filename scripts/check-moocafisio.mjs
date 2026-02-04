#!/usr/bin/env node
/**
 * Verifica moocafisio.com.br: carrega a página, checa console e conteúdo.
 */
import { chromium } from 'playwright';

const URL = 'https://moocafisio.com.br';
const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    console.log('1. Navegando para', URL);
    const response = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = response?.status();
    console.log('   Status HTTP:', status);

    await page.waitForTimeout(4000);

    const title = await page.title();
    const currentUrl = page.url();
    console.log('2. Título:', title);
    console.log('   URL atual:', currentUrl);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasLogin = /entrar|login|e-mail|email|senha/i.test(bodyText);
    const hasError = /erro|error|ops|algo deu errado/i.test(bodyText);
    console.log('3. Página contém login/form:', hasLogin);
    console.log('   Página contém mensagem de erro:', hasError);

    const corsErrors = consoleErrors.filter((t) => t.includes('CORS') || t.includes('Access-Control'));
    const otherErrors = consoleErrors.filter((t) => !t.includes('CORS') && !t.includes('Access-Control'));
    console.log('4. Console:');
    console.log('   Erros CORS:', corsErrors.length);
    console.log('   Outros erros:', otherErrors.length);
    if (otherErrors.length > 0) console.log('   Exemplo:', otherErrors[0]?.slice(0, 150));

    console.log('\n=== Resumo ===');
    console.log('OK:', status === 200 && hasLogin && !hasError && corsErrors.length === 0 ? 'Sim' : 'Verificar');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
})();
