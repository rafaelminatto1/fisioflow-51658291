import { test, expect } from '@playwright/test';

test('verify exercises page displays content on first load without double click', async ({ page }) => {
  // Configured with high timeout for robust initial loading
  test.setTimeout(60000);

  console.log('--- Navigating to Exercises Page ---');
  await page.goto('/exercises');

  // Verify URL
  await expect(page).toHaveURL(/.*exercises/, { timeout: 10000 });

  // Verify Library tab is active by default
  const libraryTab = page.getByTestId('tab-library');
  await expect(libraryTab).toHaveAttribute('data-state', 'active', { timeout: 10000 });

  console.log('--- Verifying Content is Visible on First Load ---');
  // The search input uniquely belongs to the ExerciseLibrary component
  const searchInput = page.getByPlaceholder('Buscar exercícios...');

  // Await the content indicator
  await expect(searchInput).toBeVisible({ timeout: 30000 });
});
