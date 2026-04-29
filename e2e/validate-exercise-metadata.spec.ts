import { test, expect } from '@playwright/test';

test.describe('Exercise Metadata Verification', () => {
  test('Verify clinical metadata in exercise modal', async ({ page }) => {
    // 1. Login
    await page.goto('https://moocafisio.com.br/auth');

    if (page.url().includes('/agenda') || page.url().includes('/dashboard')) {
      console.log('Already logged in');
    } else {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');
      await page.click('button:has-text("Entrar"), button[type="submit"]');
      await page.waitForURL('**/agenda**', { timeout: 30000 });
    }

    // 2. Navigate to Exercises
    await page.goto('https://moocafisio.com.br/exercises');
    await page.waitForSelector('input[placeholder*="Buscar"]');

    // 3. Search for "Ab Wheel Rollout"
    await page.fill('input[placeholder*="Buscar"]', 'Ab Wheel Rollout');
    await page.waitForTimeout(1000); // Wait for debounce

    // 4. Click on the exercise
    const exerciseCard = page.locator('text=Ab Wheel Rollout').first();
    await exerciseCard.click();

    // 5. Verify Modal Content
    await page.waitForSelector('text=Instruções de Execução');

    // Check Dosage Parameters
    const series = page.locator('div:has-text("Séries") >> .exercise-print-metric-value').first();
    const reps = page.locator('div:has-text("Repetições") >> .exercise-print-metric-value').first();

    await expect(series).not.toHaveText('-');
    await expect(reps).not.toHaveText('-');

    console.log('Dosage parameters verified:', await series.innerText(), 'sets,', await reps.innerText(), 'reps');

    // Check Clinical Intelligence (Pathologies)
    await expect(page.locator('text=Inteligência Clínica')).toBeVisible();
    await expect(page.locator('text=Indicações Principais')).toBeVisible();

    // Check if at least one badge is present in Indicated Pathologies
    const indicatedBadges = page.locator('span:has-text("Indicações Principais") + div >> .inline-flex');
    await expect(indicatedBadges.first()).toBeVisible();

    // Check Scientific Evidence
    await expect(page.locator('text=Evidência Científica')).toBeVisible();
    const references = page.locator('.exercise-print-references');
    await expect(references).toBeVisible();
    await expect(references).not.toBeEmpty();

    console.log('Clinical metadata and references verified successfully');
  });
});
