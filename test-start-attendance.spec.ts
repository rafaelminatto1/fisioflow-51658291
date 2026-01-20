import { test, expect } from '@playwright/test';

test('testar iniciar atendimento - debug', async ({ page }) => {
  // Ir para a página inicial
  await page.goto('http://localhost:8080');

  // Fazer login
  await page.goto('http://localhost:8080/auth/login');
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button[type="submit"]');

  // Esperar login completar
  await page.waitForURL('**/schedule', { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Capturar screenshot da agenda
  await page.screenshot({ path: 'screenshots/test-01-agenda-carregada.avif' });
  console.log('Screenshot da agenda salva');

  // Tentar encontrar agendamentos
  const appointments = await page.locator('[data-appointment-id]').all();
  console.log(`Encontrados ${appointments.length} agendamentos`);

  if (appointments.length > 0) {
    // Clicar no primeiro agendamento
    await appointments[0].click();
    await page.waitForTimeout(2000);

    // Procurar botão "Iniciar"
    const startButton = page.locator('button:has-text("Iniciar"), button:has-text("atendimento")').first();

    const isVisible = await startButton.isVisible({ timeout: 3000 });
    console.log(`Botão iniciar visível: ${isVisible}`);

    if (isVisible) {
      await page.screenshot({ path: 'screenshots/test-02-modal-aberto.avif' });
      console.log('Screenshot do modal salva');

      // Clicar no botão
      await startButton.click();
      console.log('Botão Iniciar clicado');

      // Esperar navegação
      await page.waitForTimeout(5000);

      // Verificar URL atual
      const currentUrl = page.url();
      console.log(`URL atual: ${currentUrl}`);

      // Capturar screenshot final
      await page.screenshot({ path: 'screenshots/test-03-apos-click.avif', fullPage: true });
      console.log('Screenshot após clicar salva');

      // Verificar se há erros na página
      const hasError = await page.locator('text=Erro, text=Error, text=Ops').count();
      console.log(`Erros encontrados na página: ${hasError}`);

      // Verificar se estamos na página de evolução do paciente
      const isEvolutionPage = currentUrl.includes('/patient-evolution/');
      console.log(`Está na página de evolução: ${isEvolutionPage}`);

      expect(isEvolutionPage).toBe(true);
    } else {
      console.log('Botão Iniciar não encontrado ou não visível');
      await page.screenshot({ path: 'screenshots/test-erro-botao-nao-visivel.avif', fullPage: true });
    }
  } else {
    console.log('Nenhum agendamento encontrado');
    await page.screenshot({ path: 'screenshots/test-erro-sem-agendamentos.avif', fullPage: true });
  }

  // Manter página aberta para inspeção manual
  await page.waitForTimeout(10000);
});
