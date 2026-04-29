import { test, expect } from '@playwright/test';

test('update saturday to 07:00-13:00 final validation', async ({ page }) => {
  await page.goto('https://www.moocafisio.com.br/auth/login');
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button:has-text("Acessar Minha Conta")');
  await page.waitForURL('**/agenda');
  await page.goto('https://www.moocafisio.com.br/profile?tab=agenda');
  await page.waitForSelector('text=Sábado');

  const saturdayContainer = page.locator('div').filter({ hasText: /^Sábado$/ }).locator('..').locator('..');
  const inputs = saturdayContainer.locator('input[type="time"]');

  await inputs.nth(0).fill('07:00');
  await inputs.nth(1).fill('13:00');
  await inputs.nth(2).fill('11:00');
  await inputs.nth(3).fill('11:30');

  console.log('Clicando em Salvar...');
  await page.click('button:has-text("SALVAR HORÁRIOS")');
  await page.waitForTimeout(4000);

  console.log('Recarregando...');
  await page.reload();
  await page.waitForSelector('text=Sábado');

  const finalOpen = await saturdayContainer.locator('input[type="time"]').nth(0).inputValue();
  const finalClose = await saturdayContainer.locator('input[type="time"]').nth(1).inputValue();
  console.log(`Sábado em produção: ${finalOpen} até ${finalClose}`);

  if (finalOpen === '07:00' && finalClose === '13:00') {
      console.log('CONFIGURAÇÃO DE SÁBADO VALIDADA COM SUCESSO!');
  } else {
      console.log('FALHA NA PERSISTÊNCIA.');
  }
});
