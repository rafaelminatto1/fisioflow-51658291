/**
 * AI COACH PLAN E2E
 *
 * Validates AI Coach plan generation and template linkage to exercise library.
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.use({ browserName: 'chromium' });
test.setTimeout(180000);

const PLAN_RESPONSE = {
  planName: 'Plano IA Teste Lombalgia',
  goal: 'Redução de dor lombar e ganho de força',
  frequency: '3x por semana',
  durationWeeks: 6,
  exercises: [
    {
      name: 'Ponte IA Teste',
      sets: 3,
      reps: '12',
      rest: '45s',
      notes: 'Manter coluna neutra durante o movimento.',
      videoQuery: 'ponte glutea',
    },
  ],
  warmup: 'Caminhada leve por 5 minutos.',
  cooldown: 'Alongamento de flexores do quadril.',
};

async function login(page: any) {
  if (!page.url().includes('/auth')) {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  }
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#login-email').fill(testUsers.rafael.email);
  await page.locator('#login-password').fill(testUsers.rafael.password);
  await page.getByRole('button', { name: /entrar na plataforma|entrar|login/i }).click();
  await page.waitForURL((url: any) => !url.pathname.includes('/auth'), { timeout: 45000 });
}

test('gera plano AI Coach e salva template vinculado', async ({ page }) => {
  await page.goto('/exercises', { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/auth')) {
    await login(page);
    await page.goto('/exercises', { waitUntil: 'domcontentloaded' });
  }
  await expect(page.getByRole('button', { name: /novo exerc[ií]cio/i })).toBeVisible({ timeout: 15000 });

  // Criar exercício na biblioteca para garantir vínculo
  await page.getByRole('button', { name: /novo exerc[ií]cio/i }).click();
  await page.getByLabel('Nome*').fill('Ponte IA Teste');
  await page.getByLabel('Categoria').fill('Fortalecimento');
  await page.getByRole('button', { name: /criar/i }).click();
  await page.getByPlaceholder(/buscar exerc[ií]cios/i).fill('Ponte IA Teste');
  await expect(page.getByText('Ponte IA Teste')).toBeVisible({ timeout: 15000 });

  // Navegar para IA Assistente
  await page.getByRole('tab', { name: /ia assistente/i }).click();
  await page.getByRole('tab', { name: /plano ai coach/i }).click();

  // Mock da função callable do Firebase
  await page.route('**/generateExercisePlan**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: PLAN_RESPONSE }),
    });
  });

  await page.getByLabel('Nome do paciente').fill('Paciente IA Teste');
  await page.getByLabel('Condição principal').fill('Lombalgia');
  await page.getByLabel('Objetivo principal').fill('Reduzir dor e melhorar mobilidade');

  await page.getByRole('button', { name: /gerar plano completo estruturado/i }).click();
  await expect(page.getByText(PLAN_RESPONSE.planName)).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: /salvar como template/i }).click();
  await page.getByLabel('Nome do template').fill('Template IA Teste Lombalgia');
  await page.getByLabel('Condição').fill('Lombalgia');
  await page.getByRole('button', { name: /salvar template/i }).click();
  await expect(page.getByText(/template salvo/i)).toBeVisible({ timeout: 20000 });

  // Validar vínculo: template deve listar o exercício criado
  await page.getByRole('tab', { name: /templates/i }).click();
  await page.getByPlaceholder(/buscar templates/i).fill('Template IA Teste Lombalgia');
  await page.getByRole('button', { name: /ver/i }).first().click();
  await expect(page.getByText('Ponte IA Teste')).toBeVisible({ timeout: 20000 });
});
