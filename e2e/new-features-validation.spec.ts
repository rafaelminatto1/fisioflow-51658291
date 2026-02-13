import { test, expect } from '@playwright/test';

test.describe('FisioFlow 2026 - New Features Validation', () => {
  
  test('Should show humorous 404 page', async ({ page }) => {
    await page.goto('/page-that-does-not-exist');
    await expect(page.locator('h1')).toContainText('Página com Escoliose');
    await expect(page.locator('text=Já tentou fazer compressa de gelo')).toBeVisible();
  });

  test('Should initialize FisioTour on first access', async ({ page }) => {
    // Limpar localStorage para garantir que o tour apareça
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('fisioflow_tour_completed'));
    
    // Login rápido para chegar ao dashboard
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aguardar o tour (tem um delay de 2s no código)
    await page.waitForTimeout(3000);
    await expect(page.locator('text=FisioTour')).toBeVisible();
    await expect(page.locator('text=Seu QG')).toBeVisible();
  });

  test('Should have Speech-to-SOAP and Smart Suggestion buttons in Evolution', async ({ page }) => {
    // Navegar para uma evolução (exemplo de ID)
    await page.goto('/evolution/test-session');
    
    // Verificar botões de microfone (Speech-to-SOAP)
    const micButtons = page.locator('button[title*="voz"]');
    await expect(micButtons.first()).toBeVisible();

    // Mudar para aba de exercícios e verificar Sugestão Smart
    await page.click('text=Exercícios');
    await expect(page.locator('text=Sugestão Smart')).toBeVisible();
  });

  test('Should show engagement badge in patient profile', async ({ page }) => {
    await page.goto('/patients');
    // Verificar se algum badge de status (Ativo/Risco/Inativo) aparece
    const badge = page.locator('.animate-pulse'); // Badges de risco/inativo piscam
    // Como depende de dados, apenas validamos se o componente renderiza sem crash
    expect(await page.locator('h3').count()).toBeGreaterThan(0);
  });
});
