import { test, expect } from '@playwright/test';

test('iniciar atendimento - debug', async ({ page }) => {
  // Ir para a página inicial
  await page.goto('http://localhost:8080');

  // Fazer login
  await page.goto('http://localhost:8080/auth/login');
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button[type="submit"]');

  // Esperar login completar
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Ir para agenda
  await page.goto('http://localhost:8080/schedule');
  await page.waitForTimeout(2000);

  // Capturar screenshot da agenda
  await page.screenshot({ path: 'screenshots/agenda.avif' });

  // Tentar encontrar o primeiro agendamento
  const appointments = await page.locator('[data-appointment-id]').all();
  console.log(`Encontrados ${appointments.length} agendamentos`);

  if (appointments.length > 0) {
    // Clicar no primeiro agendamento
    await appointments[0].click();
    await page.waitForTimeout(1000);

    // Procurar botão "Iniciar atendimento"
    const startButton = page.locator('button:has-text("Iniciar"), button:has-text("atendimento")').first();
    const isVisible = await startButton.isVisible();

    console.log(`Botão iniciar visível: ${isVisible}`);

    if (isVisible) {
      await startButton.click();
      await page.waitForTimeout(3000);

      // Capturar screenshot após clicar
      const screenshot = await page.screenshot({ path: 'screenshots/apos-click-iniciar.avif', fullPage: true });

      // Verificar se há erro na página
      const hasError = await page.locator('text=Ops! Algo deu errado, text=erro, text=Error').count();
      console.log(`Erros encontrados: ${hasError}`);

      // Capturar URL atual
      console.log(`URL atual: ${page.url()}`);

      // Capturar console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`Console Error: ${msg.text()}`);
        }
      });

      // Capturar erros da página
      const errors = await page.evaluate(() => {
        return (window as any).errors || [];
      });
      console.log('Erros da página:', errors);
    }
  }

  // Manter página aberta para inspeção
  await page.waitForTimeout(5000);
});
