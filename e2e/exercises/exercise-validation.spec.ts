
import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

async function login(page: Page) {
  await page.goto('/auth');
  await page.fill('input[name="email"]', testUsers.fisio.email);
  await page.fill('input[name="password"]', testUsers.fisio.password);
  await page.click('button[type="submit"]');
  // Wait for redirect
  await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 15000 });
}

async function navigateToExerciseLibrary(page: Page) {
  await page.goto('/exercises');
  await page.waitForLoadState('networkidle');
  // Default tab is library or we click it
  const libraryTab = page.getByRole('tab', { name: /biblioteca/i });
  if (await libraryTab.isVisible()) {
    await libraryTab.click();
  }
}

test.describe('Exercise Library Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    
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
    
    // Click on the first exercise card to open view modal
    // Note: The card might take a moment to load
    const firstCard = page.locator('.group.relative.flex.flex-col').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();

    // Verify DialogTitle exists (Accessibility fix)
    const dialogTitle = page.locator('[role="dialog"] [id^="radix-"]:has-text("")').first(); // Radix UI uses IDs for aria-labelledby
    // Alternatively, check if h2 was replaced by DialogTitle which should have a specific role or class
    await expect(page.locator('[role="dialog"] h2')).toBeVisible();
    
    // Check for DialogDescription (should be sr-only)
    const srOnlyDesc = page.locator('.sr-only:has-text("Visualização detalhada")');
    await expect(srOnlyDesc).toBeAttached();
  });

  test('should open Biofeedback IA tab without ReferenceError', async ({ page }) => {
    await navigateToExerciseLibrary(page);
    
    const firstCard = page.locator('.group.relative.flex.flex-col').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();

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
