import { test, expect } from '@playwright/test';

test.describe('Exercises Page Setup and Navigation', () => {
  test('Verify Tabs and Initial State', async ({ page }) => {
    // Aumentar o timeout do goto para evitar falhas em ambientes lentos
    await page.goto('/exercises');
    
    // Simplificado: Aguardar apenas o elemento principal da página
    await page.waitForSelector('[data-testid="exercise-library-title"], h1:has-text("Biblioteca")', { timeout: 15000 });

    // Navegar para Exercícios
    await page.getByRole('link', { name: /exercícios/i }).first().click();
    await expect(page).toHaveURL(/.*exercises/);

    // Verificar Títulos e Tabs
    // Test Library Tab (Default)
    await expect(page.getByTestId('tab-library')).toHaveAttribute('data-state', 'active');
    await expect(page.getByRole('button', { name: /novo exercício/i })).toBeVisible();

    // Test Templates Tab
    await page.getByTestId('tab-templates').click();
    await expect(page.getByTestId('tab-templates')).toHaveAttribute('data-state', 'active');
    // Global button should be hidden (we fixed this in Exercises.tsx)
    await expect(page.getByRole('button', { name: /novo exercício/i })).not.toBeVisible();
    // Inner button should be visible
    await expect(page.getByRole('button', { name: /novo template/i })).toBeVisible();

    // Test Protocols Tab
    await page.getByTestId('tab-protocols').click();
    await expect(page.getByTestId('tab-protocols')).toHaveAttribute('data-state', 'active');
    await expect(page.getByRole('button', { name: /novo exercício/i })).not.toBeVisible();
    // Inner button should be visible
    await expect(page.getByRole('button', { name: /novo protocolo/i })).toBeVisible();
  });
});
