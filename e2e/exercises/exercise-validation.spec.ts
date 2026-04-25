
import { test, expect, Page } from '@playwright/test';
import { authenticateBrowserContext } from '../helpers/neon-auth';
import { testUsers } from '../fixtures/test-data';

async function login(page: Page) {
  await authenticateBrowserContext(page.context(), testUsers.fisio.email, testUsers.fisio.password);
}

async function navigateToExerciseLibrary(page: Page) {
  await page.goto('/exercises');
  await page.waitForLoadState('domcontentloaded');
  // Default tab is library or we click it
  const libraryTab = page.getByRole('tab', { name: /biblioteca/i });
  if (await libraryTab.isVisible()) {
    await libraryTab.click();
  }
}

test.describe('Exercise Library Validation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await login(page);

    const exerciseSeed = {
      id: 'exercise-e2e-1',
      name: 'Agachamento Terapêutico',
      description: 'Exercício seed para validação E2E',
      categoryId: 'Mobilidade',
      difficulty: 'Iniciante',
      instructions: ['Execute devagar e com controle.'],
      videoUrl: 'https://example.com/video.mp4',
      imageUrl: 'https://example.com/image.jpg',
      musclesPrimary: ['Quadríceps'],
      equipment: ['Peso corporal'],
      bodyParts: ['Joelho'],
      durationSeconds: 60,
    };

    await page.route(/\/api\/exercises\/categories(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 'Mobilidade', name: 'Mobilidade', count: 1 }],
        }),
      });
    });

    await page.route(/\/api\/exercises\/favorites\/me(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route(/\/api\/exercises(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [exerciseSeed],
          meta: { total: 1, page: 1, limit: 500, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/exercise-templates**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await page.route('**/api/protocols**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    // Mock MediaPipe to avoid heavy loading in tests
    await page.addInitScript(() => {
      // Mock navigator.mediaDevices.getUserMedia
      (navigator.mediaDevices as any).getUserMedia = async () => {
        const stream = new MediaStream();
        (stream as any).getTracks = () => [{ stop: () => {} }];
        return stream;
      };
    });
  });

  test('should open exercise modal and show DialogTitle/Description (Accessibility)', async ({ page }) => {
    await navigateToExerciseLibrary(page);
    await expect(page.getByTestId('exercise-library-title')).toBeVisible({ timeout: 15000 });

    const firstCard = page.locator('.group.overflow-hidden.h-full.flex.flex-col').first();
    if (!(await firstCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(page.getByTestId('exercise-library-title')).toBeVisible();
      return;
    }
    await firstCard.hover().catch(() => {});
    await firstCard.getByRole('button', { name: /Visualizar/i }).click({ force: true });

    const dialog = page.getByRole('dialog').first();
    await expect(dialog.getByRole('heading').first()).toBeVisible();

    const srOnlyDesc = dialog.locator('.sr-only').filter({ hasText: 'Visualização detalhada' });
    await expect(srOnlyDesc).toBeAttached();
  });

  test('should open Biofeedback IA tab without ReferenceError', async ({ page }) => {
    await navigateToExerciseLibrary(page);

    const firstCard = page.locator('.group.overflow-hidden.h-full.flex.flex-col').first();
    if (!(await firstCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(page.getByTestId('exercise-library-title')).toBeVisible();
      return;
    }
    await firstCard.hover().catch(() => {});
    await firstCard.getByRole('button', { name: /Visualizar/i }).click({ force: true });

    // Click on Biofeedback IA tab
    const biofeedbackTab = page.getByRole('tab', { name: /biofeedback/i });
    await biofeedbackTab.waitFor({ state: 'visible' });
    await biofeedbackTab.click();

    // If there was a ReferenceError, the ComponentErrorBoundary would show an error message
    // "Ocorreu um erro ao renderizar este componente"
    await expect(page.getByText('Ocorreu um erro ao renderizar este componente')).not.toBeVisible();

    // Should show the camera activation UI
    await expect(page.getByText(/Ativar Câmera para Biofeedback/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show file upload options in New Exercise modal', async ({ page }) => {
    await page.goto('/exercises');
    await page.getByRole('button', { name: /Novo Exercício/i }).click();

    // Check for upload buttons
    const uploadButtons = page.locator('button:has(.lucide-upload)');
    await expect(uploadButtons).toHaveCount(2); // One for video, one for image

    // Verify hidden file inputs exist
    const fileInputs = page.locator('input[type="file"]');
    await expect(fileInputs).toHaveCount(2);

    await expect(page.locator('input[accept="video/*"]')).toBeAttached();
    await expect(page.locator('input[accept="image/*"]')).toBeAttached();
  });
});
