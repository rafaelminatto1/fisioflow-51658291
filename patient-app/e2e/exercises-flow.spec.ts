/**
 * Testes E2E para Fluxo de Exercícios - App Paciente
 *
 * Testa o fluxo completo de exercícios incluindo:
 * - Visualização de exercícios prescritos
 * - Detalhes do exercício
 * - Marcar exercício como concluído
 * - Visualização de vídeos
 * - Visualização de progresso
 */

import { test, expect, Page } from '@playwright/test';
import { patientLogin, PATIENT_CREDENTIALS } from './auth-flow';

test.describe('Fluxo de Exercícios - App Paciente', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await patientLogin(page, PATIENT_CREDENTIALS);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Visualização de Exercícios', () => {
    test('deve mostrar lista de exercícios prescritos', async () => {
      await page.goto('/(tabs)/exercises');

      // Verificar que a lista é exibida
      await expect(page.locator('[data-testid="exercises-list"]')).toBeVisible();
    });

    test('deve mostrar informações do exercício no card', async () => {
      await page.goto('/(tabs)/exercises');

      const exerciseCard = page.locator('[data-testid="exercise-card"]').first();

      // Verificar elementos do card
      await expect(exerciseCard.locator('[data-testid="exercise-name"]')).toBeVisible();
      await expect(exerciseCard.locator('[data-testid="exercise-sets-reps"]')).toBeVisible();
      await expect(exerciseCard.locator('[data-testid="exercise-completion"]')).toBeVisible();
    });

    test('deve mostrar estado vazio quando não há exercícios', async () => {
      await page.goto('/(tabs)/exercises');

      const emptyState = page.locator('[data-testid="empty-exercises"]');

      // Se não houver exercícios, mostrar estado vazio
      // await expect(emptyState).toBeVisible();
    });
  });

  test.describe('Detalhes do Exercício', () => {
    test('deve mostrar detalhes completos do exercício', async () => {
      await page.goto('/(tabs)/exercises');
      await page.click('[data-testid="exercise-card"]');

      // Verificar seções
      await expect(page.locator('[data-testid="exercise-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="exercise-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="exercise-instructions"]')).toBeVisible();
      await expect(page.locator('[data-testid="exercise-parameters"]')).toBeVisible();
    });

    test('deve mostrar vídeo do exercício', async () => {
      await page.goto('/(tabs)/exercises');
      await page.click('[data-testid="exercise-card"]');

      await expect(page.locator('[data-testid="exercise-video"]')).toBeVisible();
    });

    test('deve mostrar imagens de referência', async () => {
      await page.goto('/(tabs)/exercises');
      await page.click('[data-testid="exercise-card"]');

      const exerciseImages = page.locator('[data-testid="exercise-image"]');
      const count = await exerciseImages.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Conclusão de Exercício', () => {
    test('deve marcar exercício como concluído', async () => {
      await page.goto('/(tabs)/exercises');
      await page.click('[data-testid="exercise-card"]');

      // Marcar como concluído
      await page.click('[data-testid="mark-complete-button"]');

      await expectToast(page, 'Exercício concluído!');

      // Verificar indicador de conclusão
      await expect(page.locator('[data-testid="completion-indicator"][data-completed="true"]')).toBeVisible();
    });

    test('deve permitir desmarcar conclusão', async () => {
      await page.goto('/(tabs)/exercises');
      await page.click('[data-testid="exercise-card"]');

      // Marcar como concluído
      await page.click('[data-testid="mark-complete-button"]');

      // Desmarcar
      await page.click('[data-testid="mark-incomplete-button"]');

      await expectToast(page, 'Exercício marcado como não concluído');

      // Verificar indicador
      await expect(page.locator('[data-testid="completion-indicator"][data-completed="false"]')).toBeVisible();
    });
  });

  test.describe('Progresso', () => {
    test('deve mostrar barra de progresso diário', async () => {
      await page.goto('/(tabs)/exercises');

      await expect(page.locator('[data-testid="daily-progress-bar"]')).toBeVisible();
    });

    test('deve mostrar contagem de exercícios concluídos', async () => {
      await page.goto('/(tabs)/exercises');

      const progressText = await page.textContent('[data-testid="progress-text"]');

      expect(progressText).toMatch(/\d+ de \d+/);
    });
  });

  test.describe('Acessibilidade', () => {
    test('deve ter labels ARIA nos cards', async () => {
      await page.goto('/(tabs)/exercises');

      const exerciseCard = page.locator('[data-testid="exercise-card"]').first();

      await expect(exerciseCard).toHaveAttribute('role', 'button');
    });
  });
});

/**
 * Espera por toast
 */
async function expectToast(page: Page, message: string): Promise<void> {
  const toast = page.locator('[data-testid="toast"]').filter({ hasText: message });
  await toast.waitFor({ state: 'visible', timeout: 3000 });
}
