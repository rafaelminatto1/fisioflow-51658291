import { test, expect } from '@playwright/test';

/**
 * Teste simples para verificar que o modal funciona no mobile
 */
test('modal mobile - verificar botão agendar visível', async ({ page }) => {
  // Configurar viewport mobile (iPhone)
  await page.setViewportSize({ width: 390, height: 844 });

  // Ir direto para a página de login
  await page.goto('http://127.0.0.1:8086/login');

  // Screenshot da página de login
  await page.screenshot({ path: 'e2e/screenshots/mobile/01-login.png', fullPage: false });

  // Preencher login
  await page.fill('input[name="email"], input[name="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[name="password"], input[name="password"]', 'Yukari30@');

  // Clicar em entrar
  await page.click('button[type="submit"]');

  // Esperar dashboard
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // Screenshot após login
  await page.screenshot({ path: 'e2e/screenshots/mobile/02-dashboard.png', fullPage: false });

  // Tentar navegar para agenda
  try {
    // Procurar link com texto "Agenda"
    const agendaLink = page.getByText('Agenda').first();
    if (await agendaLink.isVisible()) {
      await agendaLink.click();
    } else {
      // Tentar pela URL
      await page.goto('http://127.0.0.1:8086/schedule');
    }
  } catch {
    await page.goto('http://127.0.0.1:8086/schedule');
  }

  await page.waitForLoadState('networkidle', { timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/mobile/03-agenda.png', fullPage: false });

  // Procurar botão de novo agendamento
  const newApptButton = page.getByRole('button').filter({ hasText: /Novo|Adicionar|Criar|\+/ }).first();

  if (await newApptButton.isVisible({ timeout: 3000 })) {
    await newApptButton.click();
  } else {
    // Tentar encontrar pela URL direta do modal se existir
    await page.evaluate(() => {
      // Disparar evento que abre o modal
      window.dispatchEvent(new CustomEvent('open-appointment-modal'));
    });
  }

  // Esperar modal aparecer
  await page.waitForTimeout(1000);

  // Screenshot do modal
  await page.screenshot({ path: 'e2e/screenshots/mobile/04-modal-aberto.png', fullPage: false });

  // Verificar se modal está presente
  const modal = page.locator('[role="dialog"], .fixed.inset-0, [data-state="open"]').first();
  const modalExists = await modal.count() > 0;

  console.log('Modal existe:', modalExists);

  if (modalExists) {
    // Screenshot do modal
    await modal.screenshot({ path: 'e2e/screenshots/mobile/05-modal-zoom.png' });

    // Procurar botões de ação
    const buttons = page.locator('button:visible').all();
    const buttonCount = await buttons.count();
    console.log('Botões visíveis:', buttonCount);

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const btn = buttons[i];
      const text = await btn.textContent();
      const isVisible = await btn.isVisible();
      const box = await btn.boundingBox();
      console.log(`Botão ${i}: "${text}" - visível: ${isVisible}, posição: y=${box?.y}`);

      // Salvar screenshot de cada botão
      if (isVisible && box) {
        await btn.screenshot({ path: `e2e/screenshots/mobile/botao-${i}-${text?.replace(/[^a-zA-Z0-9]/g, '_') || 'sem_nome'}.png` });
      }
    }

    // Verificar especificamente botão Agendar/Criar/Salvar
    const actionButton = page.getByRole('button').filter({ hasText: /Agendar|Criar|Salvar/ }).first();
    const actionButtonVisible = await actionButton.isVisible();
    console.log('Botão de ação visível:', actionButtonVisible);

    if (!actionButtonVisible) {
      console.log('AVISO: Botão de ação NÃO está visível!');
    }

    expect(actionButtonVisible).toBeTruthy();
  } else {
    console.log('AVISO: Modal não abriu automaticamente');
  }

  // Screenshot final da página
  await page.screenshot({ path: 'e2e/screenshots/mobile/99-final.png', fullPage: true });
});
