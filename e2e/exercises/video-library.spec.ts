import { test, expect, Page } from '@playwright/test';

/**
 * Exercise Video Library E2E Tests
 * Tests for the exercise video library component including:
 * - Video listing and filtering
 * - Bulk selection and deletion
 * - Video playback
 * - Edit functionality
 * - Download functionality
 */

// Helper function to navigate to exercises page
async function navigateToExercises(page: Page) {
  await page.goto('/exercises');
  await page.waitForLoadState('networkidle');
}

// Mock data for tests
const mockVideos = [
  {
    id: '1',
    title: 'Rotação de Ombro',
    description: 'Exercício para mobilidade de ombro',
    category: 'mobility',
    difficulty: 'beginner',
    duration: 45,
    file_size: 1024000,
    thumbnail_url: 'https://example.com/thumb1.jpg',
    video_url: 'https://example.com/video1.mp4',
    body_parts: ['shoulder'],
    equipment: [],
  },
  {
    id: '2',
    title: 'Agachamento Profundo',
    description: 'Fortalecimento de membros inferiores',
    category: 'strength',
    difficulty: 'intermediate',
    duration: 60,
    file_size: 2048000,
    thumbnail_url: 'https://example.com/thumb2.jpg',
    video_url: 'https://example.com/video2.mp4',
    body_parts: ['legs', 'glutes'],
    equipment: ['dumbbells'],
  },
];

test.describe('Exercise Video Library', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API calls to mock video data
    await page.route('**/exercise-videos*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockVideos }),
      });
    });
  });

  test('should display video library header', async ({ page }) => {
    await navigateToExercises(page);

    // Check for header elements
    await expect(page.getByText('Biblioteca de Vídeos')).toBeVisible();
    await expect(page.getByRole('button', { name: /upload vídeo/i })).toBeVisible();
  });

  test('should display video count', async ({ page }) => {
    await navigateToExercises(page);

    // Should show video count
    await expect(page.getByText(/2 vídeos/i)).toBeVisible();
  });

  test('should display videos in grid view', async ({ page }) => {
    await navigateToExercises(page);

    // Check for video cards
    await expect(page.getByText('Rotação de Ombro')).toBeVisible();
    await expect(page.getByText('Agachamento Profundo')).toBeVisible();

    // Check for category badges
    await expect(page.getByText('Mobility')).toBeVisible();
    await expect(page.getByText('Strength')).toBeVisible();

    // Check for difficulty badges
    await expect(page.getByText('Beginner')).toBeVisible();
    await expect(page.getByText('Intermediate')).toBeVisible();
  });

  test('should filter videos by search term', async ({ page }) => {
    await navigateToExercises(page);

    // Type in search box
    await page.getByPlaceholder('Buscar vídeos...').fill('Ombro');

    // Should only show matching video
    await expect(page.getByText('Rotação de Ombro')).toBeVisible();
    await expect(page.getByText('Agachamento Profundo')).not.toBeVisible();
  });

  test('should filter videos by category', async ({ page }) => {
    await navigateToExercises(page);

    // Open category filter
    await page.getByRole('combobox').first().click();

    // Select "Strength" category
    await page.getByRole('option', { name: 'Strength' }).click();

    // Should only show strength videos
    await expect(page.getByText('Agachamento Profundo')).toBeVisible();
    await expect(page.getByText('Rotação de Ombro')).not.toBeVisible();
  });

  test('should clear active filters', async ({ page }) => {
    await navigateToExercises(page);

    // Apply search filter
    await page.getByPlaceholder('Buscar vídeos...').fill('Ombro');

    // Click clear filters button
    await page.getByRole('button', { name: /limpar filtros/i }).click();

    // Search should be cleared
    const searchInput = page.getByPlaceholder('Buscar vídeos...');
    await expect(searchInput).toHaveValue('');
  });

  test('should toggle between grid and list view', async ({ page }) => {
    await navigateToExercises(page);

    // Click list view button
    await page.getByRole('button', { name: /listvideo/i }).click();

    // Check that list view is active (items are arranged differently)
    const listItems = page.locator('[class*="VideoListItem"]');
    await expect(listItems.first()).toBeVisible();
  });

  test('should enter bulk selection mode', async ({ page }) => {
    await navigateToExercises(page);

    // Click bulk mode button
    await page.getByRole('button', { name: /modo de seleção/i }).click();

    // Should see bulk action buttons
    await expect(page.getByRole('button', { name: /selecionar todos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /excluir/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancelar/i })).toBeVisible();
  });

  test('should select videos in bulk mode', async ({ page }) => {
    await navigateToExercises(page);

    // Enter bulk mode
    await page.getByRole('button', { name: /modo de seleção/i }).click();

    // Click on first video card
    await page.getByText('Rotação de Ombro').first().click();

    // Should update delete button count
    await expect(page.getByRole('button', { name: /excluir \(1\)/i })).toBeVisible();

    // Click on second video
    await page.getByText('Agachamento Profundo').first().click();

    // Should update delete button count
    await expect(page.getByRole('button', { name: /excluir \(2\)/i })).toBeVisible();
  });

  test('should select all videos', async ({ page }) => {
    await navigateToExercises(page);

    // Enter bulk mode
    await page.getByRole('button', { name: /modo de seleção/i }).click();

    // Click select all
    await page.getByRole('button', { name: /selecionar todos/i }).click();

    // All videos should be selected
    await expect(page.getByRole('button', { name: /excluir \(2\)/i })).toBeVisible();

    // Click deselect all
    await page.getByRole('button', { name: /desmarcar todos/i }).click();

    // Counter should reset
    await expect(page.getByRole('button', { name: /excluir \(0\)/i })).toBeVisible();
  });

  test('should exit bulk mode with escape key', async ({ page }) => {
    await navigateToExercises(page);

    // Enter bulk mode
    await page.getByRole('button', { name: /modo de seleção/i }).click();

    // Press escape
    await page.keyboard.press('Escape');

    // Should exit bulk mode
    await expect(page.getByRole('button', { name: /selecionar todos/i })).not.toBeVisible();
  });

  test('should exit bulk mode with cancel button', async ({ page }) => {
    await navigateToExercises(page);

    // Enter bulk mode
    await page.getByRole('button', { name: /modo de seleção/i }).click();

    // Click cancel
    await page.getByRole('button', { name: /cancelar/i }).click();

    // Should exit bulk mode
    await expect(page.getByRole('button', { name: /selecionar todos/i })).not.toBeVisible();
  });
});

test.describe('Video Player Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/exercise-videos*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockVideos }),
      });
    });

    // Mock video element to avoid actual video loading
    await page.addInitScript(() => {
      window.HTMLVideoElement.prototype.play = () => Promise.resolve();
      window.HTMLVideoElement.prototype.pause = () => {};
      Object.defineProperty(window.HTMLVideoElement.prototype, 'duration', { value: 60, writable: true });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'currentTime', { value: 0, writable: true });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'volume', { value: 1, writable: true });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'muted', { value: false, writable: true });
    });
  });

  test('should open video player modal on click', async ({ page }) => {
    await navigateToExercises(page);

    // Click on a video card
    await page.getByText('Rotação de Ombro').first().click();

    // Modal should open
    await expect(page.getByText('Rotação de Ombro')).toBeVisible();
    await expect(page.locator('.dialog-content')).toBeVisible();
  });

  test('should close modal with escape key', async ({ page }) => {
    await navigateToExercises(page);

    // Open modal
    await page.getByText('Rotação de Ombro').first().click();

    // Press escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('.dialog-content')).not.toBeVisible();
  });

  test('should display video metadata in modal', async ({ page }) => {
    await navigateToExercises(page);

    // Open modal
    await page.getByText('Rotação de Ombro').first().click();

    // Check metadata
    await expect(page.getByText(/mobility/i)).toBeVisible();
    await expect(page.getByText(/beginner/i)).toBeVisible();
    await expect(page.getByText('shoulder')).toBeVisible();
  });

  test('should show action menu in modal', async ({ page }) => {
    await navigateToExercises(page);

    // Open modal
    await page.getByText('Rotação de Ombro').first().click();

    // Click on menu button
    await page.locator('button').filter({ hasText: /more/i }).click();

    // Should show menu items
    await expect(page.getByRole('menuitem', { name: /baixar vídeo/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /editar/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /excluir/i })).toBeVisible();
  });

  test('should display keyboard shortcuts hint', async ({ page }) => {
    await navigateToExercises(page);

    // Open modal
    await page.getByText('Rotação de Ombro').first().click();

    // Hover over video player area
    const playerArea = page.locator('.group').first();
    await playerArea.hover();

    // Should show keyboard hint button
    await expect(page.locator('button[title*="Atalhos"]').or(page.locator('button[title*="atalhos"]'))).toBeVisible();
  });
});

test.describe('Video Edit Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/exercise-videos*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockVideos }),
      });
    });

    // Mock update API
    await page.route('**/exercise-videos/*', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });
  });

  test('should open edit modal from video card', async ({ page }) => {
    await navigateToExercises(page);

    // Hover over video card to show actions
    const videoCard = page.locator('[class*="VideoCard"]').first();
    await videoCard.hover();

    // Click edit button
    await page.locator('button[aria-label*="Editar"]').first().click();

    // Should show edit modal
    await expect(page.getByText('Editar Vídeo')).toBeVisible();
    await expect(page.getByText('Atualize as informações do vídeo de exercício')).toBeVisible();
  });

  test('should populate edit form with video data', async ({ page }) => {
    await navigateToExercises(page);

    // Hover and click edit
    const videoCard = page.locator('[class*="VideoCard"]').first();
    await videoCard.hover();
    await page.locator('button[aria-label*="Editar"]').first().click();

    // Check form fields
    await expect(page.getByDisplayValue('Rotação de Ombro')).toBeVisible();
    await expect(page.getByDisplayValue('Exercício para mobilidade de ombro')).toBeVisible();
  });

  test('should validate title length', async ({ page }) => {
    await navigateToExercises(page);

    // Open edit modal
    const videoCard = page.locator('[class*="VideoCard"]').first();
    await videoCard.hover();
    await page.locator('button[aria-label*="Editar"]').first().click();

    // Clear title and enter short title
    await page.getByLabel('Título do Exercício').fill('AB');

    // Try to save
    await page.getByRole('button', { name: /salvar/i }).click();

    // Should show validation error
    await expect(page.getByText(/título muito curto/i)).toBeVisible();
  });

  test('should select body parts', async ({ page }) => {
    await navigateToExercises(page);

    // Open edit modal
    const videoCard = page.locator('[class*="VideoCard"]').first();
    await videoCard.hover();
    await page.locator('button[aria-label*="Editar"]').first().click();

    // Click on a body part badge
    await page.getByText('Legs').click();

    // Should show checkmark
    await expect(page.locator('.badge >> text=Legs').locator('../..').locator('svg')).toBeVisible();
  });

  test('should close edit modal with escape', async ({ page }) => {
    await navigateToExercises(page);

    // Open edit modal
    const videoCard = page.locator('[class*="VideoCard"]').first();
    await videoCard.hover();
    await page.locator('button[aria-label*="Editar"]').first().click();

    // Press escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.getByText('Editar Vídeo')).not.toBeVisible();
  });
});

test.describe('Delete Confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/exercise-videos*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockVideos }),
      });
    });

    // Mock delete API
    await page.route('**/exercise-videos/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    await navigateToExercises(page);

    // Hover over video card
    const videoCard = page.locator('[class*="VideoCard"]').first();
    await videoCard.hover();

    // Click delete button
    await page.locator('button[aria-label*="Excluir"]').first().click();

    // Should show confirmation dialog
    await expect(page.getByText('Excluir vídeo?')).toBeVisible();
    await expect(page.getByText('Esta ação não pode ser desfeita')).toBeVisible();
  });

  test('should cancel deletion', async ({ page }) => {
    await navigateToExercises(page);

    // Hover and click delete
    const videoCard = page.locator('[class*="VideoCard"]').first();
    await videoCard.hover();
    await page.locator('button[aria-label*="Excluir"]').first().click();

    // Click cancel
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Dialog should close
    await expect(page.getByText('Excluir vídeo?')).not.toBeVisible();
  });

  test('should confirm deletion', async ({ page }) => {
    await navigateToExercises(page);

    // Hover and click delete
    const videoCard = page.locator('[class*="VideoCard"]').first();
    await videoCard.hover();
    await page.locator('button[aria-label*="Excluir"]').first().click();

    // Click confirm
    await page.getByRole('button', { name: /excluir/i }).click();

    // Dialog should close and show success message
    await expect(page.getByText('Excluir vídeo?')).not.toBeVisible();
  });
});

test.describe('Empty States', () => {
  test('should show empty state when no videos', async ({ page }) => {
    // Mock empty response
    await page.route('**/exercise-videos*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await navigateToExercises(page);

    // Should show empty state
    await expect(page.getByText('Nenhum vídeo ainda')).toBeVisible();
    await expect(page.getByText('Comece adicionando vídeos demonstrativos de exercícios')).toBeVisible();
  });

  test('should show no results when filtering', async ({ page }) => {
    await page.route('**/exercise-videos*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockVideos }),
      });
    });

    await navigateToExercises(page);

    // Search for non-existent video
    await page.getByPlaceholder('Buscar vídeos...').fill('NonExistentVideo123');

    // Should show no results
    await expect(page.getByText('Nenhum vídeo encontrado')).toBeVisible();
    await expect(page.getByText('Tente ajustar seus filtros de busca')).toBeVisible();
  });
});

test.describe('Loading States', () => {
  test('should show skeleton loaders while loading', async ({ page }) => {
    // Delay the response
    await page.route('**/exercise-videos*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockVideos }),
      });
    });

    await navigateToExercises(page);

    // Should show skeleton loaders briefly
    const skeletons = page.locator('.skeleton');
    await expect(skeletons.first()).toBeVisible();
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/exercise-videos*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockVideos }),
      });
    });
  });

  test('should navigate filters with keyboard', async ({ page }) => {
    await navigateToExercises(page);

    // Tab to search input
    await page.keyboard.press('Tab');
    await page.keyboard.type('Ombro');

    // Should filter results
    await expect(page.getByText('Rotação de Ombro')).toBeVisible();
    await expect(page.getByText('Agachamento Profundo')).not.toBeVisible();
  });
});
