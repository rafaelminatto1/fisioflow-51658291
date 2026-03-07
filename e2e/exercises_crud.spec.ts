import { test, expect } from '@playwright/test';

test.describe('Exercise Library CRUD', () => {
  test('Exercise CRUD Flow', async ({ page }) => {
    await page.goto('/exercises');
    
    // Simplificado: Aguardar apenas o elemento principal da página
    await page.waitForSelector('[data-testid="exercise-library-title"], h1:has-text("Biblioteca")', { timeout: 15000 });

    // Navigate to Exercises
    await page.getByRole('link', { name: /exercícios/i }).first().click();
    await expect(page).toHaveURL(/.*exercises/);

    // Create Exercise
    const exerciseName = `Test Exercise ${Date.now()}`;
    await page.getByRole('button', { name: /novo exercício/i }).click();
    await page.getByPlaceholder(/nome do exercício/i).fill(exerciseName);
    await page.getByPlaceholder(/descrição do exercício/i).fill('Test description');
    await page.getByRole('button', { name: /salvar/i }).click();

    // Verify Creation (Toast and List)
    await expect(page.getByText(/exercício criado com sucesso/i)).toBeVisible();
    await expect(page.locator('h3', { hasText: exerciseName })).toBeVisible();

    // Edit Exercise
    const updatedName = `${exerciseName} Updated`;
    await page.locator('div').filter({ hasText: exerciseName }).locator('button').filter({ hasText: /editar/i }).click();
    await page.getByPlaceholder(/nome do exercício/i).fill(updatedName);
    await page.getByRole('button', { name: /atualizar/i }).click();
    await expect(page.getByText(/exercício atualizado com sucesso/i)).toBeVisible();
    await expect(page.locator('h3', { hasText: updatedName })).toBeVisible();

    // Delete Exercise
    await page.locator('div').filter({ hasText: updatedName }).locator('button').filter({ hasText: /excluir/i }).click();
    await page.getByRole('button', { name: /excluir/i }).click(); // Confirm dialog
    await expect(page.getByText(/exercício excluído com sucesso/i)).toBeVisible();
    await expect(page.locator('h3', { hasText: updatedName })).not.toBeVisible();
  });
});
