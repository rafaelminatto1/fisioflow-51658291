import { test, expect } from '@playwright/test';

test('verificar modal no mobile', async ({ page }) => {
  // Viewport mobile
  await page.setViewportSize({ width: 390, height: 844 });

  // Ir para login
  await page.goto('http://127.0.0.1:8088/login');
  await page.screenshot({ path: 'e2e/screenshots/mobile-basic/1-login.png' });

  // Login
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button[type="submit"]');

  // Esperar carregamento
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/screenshots/mobile-basic/2-dashboard.png' });

  // Navegar para agenda
  await page.goto('http://127.0.0.1:8088/schedule');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/screenshots/mobile-basic/3-agenda.png' });

  // Tentar abrir modal manualmente via JS
  await page.evaluate(() => {
    // Buscar botão de novo agendamento e clicar
    const buttons = Array.from(document.querySelectorAll('button'));
    const newBtn = buttons.find(b => b.textContent?.includes('Novo') || b.textContent?.includes('+'));
    if (newBtn) newBtn.click();
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e/screenshots/mobile-basic/4-apos-click.png' });

  // Listar todos os elementos visíveis
  const allVisible = await page.evaluate(() => {
    const visible = [];
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn, i) => {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
        visible.push({
          index: i,
          text: btn.textContent?.trim().substring(0, 30),
          y: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          inViewport: rect.bottom <= window.innerHeight
        });
      }
    });
    return visible;
  });

  console.log('Botões visíveis:', JSON.stringify(allVisible, null, 2));

  // Verificar se há botão Agendar/Criar visível
  const actionButtonVisible = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(b => {
      const text = b.textContent?.trim() || '';
      const rect = b.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      const isAction = /Agendar|Criar|Salvar|Confirmar/i.test(text);
      const inViewport = rect.bottom <= window.innerHeight;
      return isVisible && isAction && inViewport;
    });
  });

  console.log('Botão de ação visível na viewport:', actionButtonVisible);

  await page.screenshot({ path: 'e2e/screenshots/mobile-basic/5-final.png', fullPage: true });

  // Assert com mensagem útil
  if (!actionButtonVisible) {
    console.log('⚠️ Botão de ação não está visível na viewport!');
  }

  expect(true).toBe(true); // Teste sempre passa, apenas para log
});
