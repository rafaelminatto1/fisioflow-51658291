import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://www.moocafisio.com.br/login');
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/agenda');

  console.log('Navegando para lista...');
  await page.goto('https://www.moocafisio.com.br/patients');
  await page.waitForLoadState('networkidle');
  
  // Achar o primeiro paciente Dr. Robot
  const patient = page.locator('text=Dr. Robot').first();
  await patient.click();
  console.log('Paciente clicado.');
  
  await page.waitForTimeout(4000);
  // Clicar na tab ou link de Evolução se necessário, ou ir direto via URL
  const currentUrl = page.url();
  await page.goto(currentUrl + '/evolution');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(6000);

  console.log('Tentando baixar PDF Premium...');
  try {
    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('button:has-text("Relatório Premium")').click()
    ]);
    await download.saveAs('TESTES-APAGAR/RELATORIO_PREMIUM_PRODUCAO.pdf');
    console.log('✅ SUCESSO: RELATORIO_PREMIUM_PRODUCAO.pdf salvo.');
  } catch (e) {
    console.log('❌ Falha final:', e.message);
    await page.screenshot({ path: 'TESTES-APAGAR/final_error.png' });
  }

  await browser.close();
})();
