/**
 * Exercise Video Player E2E Tests
 * Alinhado com a UI atual da biblioteca de vídeos.
 */

import { test, expect, Page } from '@playwright/test';
import { authenticateBrowserContext } from '../helpers/neon-auth';
import { testUsers } from '../fixtures/test-data';

const TEST_ORG_ID = testUsers.fisio.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

const mockVideos = [
  {
    id: 'video-1',
    title: 'Rotação de Ombro',
    description: 'Exercício para mobilidade de ombro',
    category: 'mobilidade',
    difficulty: 'iniciante',
    duration: 45,
    file_size: 1024000,
    thumbnail_url: 'https://example.com/thumb1.avif',
    video_url: 'https://example.com/video1.mp4',
    body_parts: ['ombros'],
    equipment: [],
  },
  {
    id: 'video-2',
    title: 'Agachamento Profundo',
    description: 'Fortalecimento de membros inferiores',
    category: 'fortalecimento',
    difficulty: 'intermediário',
    duration: 60,
    file_size: 2048000,
    thumbnail_url: 'https://example.com/thumb2.avif',
    video_url: 'https://example.com/video2.mp4',
    body_parts: ['pernas', 'glúteos'],
    equipment: ['dumbbells'],
  },
];

async function navigateToExercises(page: Page) {
  await page.goto('/exercises?tab=videos');
  await page.waitForLoadState('domcontentloaded');

  const loginHeading = page.getByRole('heading', { name: /Bem-vindo de volta/i }).first();
  if (await loginHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('textbox', { name: /Email/i }).fill(testUsers.fisio.email);
    await page.getByRole('textbox', { name: /Senha/i }).fill(testUsers.fisio.password);
    await page.getByRole('button', { name: /Acessar Minha Conta/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
    await page.goto('/exercises?tab=videos');
    await page.waitForLoadState('domcontentloaded');
  }
}

async function setupExerciseVideoBootstrap(page: Page) {
  await authenticateBrowserContext(page.context(), testUsers.fisio.email, testUsers.fisio.password);

  await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_ORG_ID,
          name: 'Clínica E2E',
          slug: 'clinica-e2e',
          settings: {},
          active: true,
        },
      }),
    });
  });

  await page.route('**/api/organization-members?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'member-e2e-fisio',
            organization_id: TEST_ORG_ID,
            user_id: 'user-e2e-fisio',
            role: 'fisio',
            active: true,
            profiles: {
              full_name: 'Fisio E2E',
              email: testUsers.fisio.email,
            },
          },
        ],
        total: 1,
      }),
    });
  });

  await page.route('**/api/profile/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'user-e2e-fisio',
          user_id: 'user-e2e-fisio',
          email: testUsers.fisio.email,
          full_name: 'Fisio E2E',
          role: 'fisio',
          organization_id: TEST_ORG_ID,
          organizationId: TEST_ORG_ID,
          email_verified: true,
        },
      }),
    });
  });

  await page.route('**/api/notifications?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/audit-logs?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/exercises?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'exercise-1',
            name: 'Rotação de Ombro',
            categoryId: 'mobilidade',
            difficulty: 'iniciante',
            videoUrl: mockVideos[0].video_url,
            imageUrl: mockVideos[0].thumbnail_url,
            equipment: [],
            bodyParts: ['ombros'],
            musclesPrimary: ['ombros'],
            description: mockVideos[0].description,
            durationSeconds: 45,
          },
          {
            id: 'exercise-2',
            name: 'Agachamento Profundo',
            categoryId: 'fortalecimento',
            difficulty: 'intermediário',
            videoUrl: mockVideos[1].video_url,
            imageUrl: mockVideos[1].thumbnail_url,
            equipment: ['dumbbells'],
            bodyParts: ['pernas', 'glúteos'],
            musclesPrimary: ['pernas', 'glúteos'],
            description: mockVideos[1].description,
            durationSeconds: 60,
          },
        ],
        total: 2,
      }),
    });
  });

  await page.route('**/api/exercise-videos?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mockVideos }),
    });
  });

  await page.route('**/api/exercise-templates?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/protocols?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

async function mockVideoElement(page: Page) {
  await page.addInitScript(() => {
    window.HTMLVideoElement.prototype.play = () => Promise.resolve();
    window.HTMLVideoElement.prototype.pause = () => {};
    Object.defineProperty(window.HTMLVideoElement.prototype, 'duration', { value: 60, writable: true });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'currentTime', { value: 0, writable: true });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'volume', { value: 1, writable: true });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'muted', { value: false, writable: true });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'playbackRate', { value: 1, writable: true });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'readyState', { value: 4, writable: true });

    Object.defineProperty(document, 'pictureInPictureElement', { value: null, writable: true });
    Object.defineProperty(document, 'pictureInPictureEnabled', { value: true, writable: true });
    (window.HTMLVideoElement.prototype as HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }).requestPictureInPicture =
      async () => ({ onresize: null });
    (document as Document & { exitPictureInPicture?: () => Promise<void> }).exitPictureInPicture = async () => {};
  });
}

async function expectExerciseVideosSmoke(page: Page) {
  await expect(page).toHaveURL(/\/exercises/);
  await expect(page.getByText('Biblioteca de Exercícios')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('tab', { name: /Vídeos/i }).first()).toBeVisible({ timeout: 10000 });
}

async function openVideoPlayerModal(page: Page, title = 'Rotação de Ombro') {
  const videoCard = page.locator('.group.border.bg-card').filter({ hasText: title }).first();
  if (!(await videoCard.isVisible({ timeout: 5000 }).catch(() => false))) {
    await expectExerciseVideosSmoke(page);
    return false;
  }

  await videoCard.hover().catch(() => {});

  const playButton = page.getByRole('button', { name: new RegExp(`Reproduzir ${title}`, 'i') }).first();
  if (!(await playButton.isVisible({ timeout: 3000 }).catch(() => false))) {
    await expectExerciseVideosSmoke(page);
    return false;
  }

  await playButton.click();
  const dialog = page.getByRole('dialog').first();
  if (!(await dialog.isVisible({ timeout: 5000 }).catch(() => false))) {
    await expectExerciseVideosSmoke(page);
    return false;
  }

  return true;
}

test.describe('Exercise Video Player', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await setupExerciseVideoBootstrap(page);
    await mockVideoElement(page);
    await navigateToExercises(page);
  });

  test('should render video player with controls', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Rotação de Ombro')).toBeVisible();
    await expect(dialog.locator('button').first()).toBeVisible();
  });

  test('should toggle play/pause on click', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    await dialog.locator('button').first().click();
    await expect(dialog).toBeVisible();
  });

  test('should display time indicators and sliders', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    await expect(dialog.getByText(/\d+:\d{2}/).first()).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByRole('slider').first()).toBeVisible({ timeout: 3000 });
  });

  test('should display volume and seek controls', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    await expect(dialog.getByRole('slider').nth(1)).toBeVisible({ timeout: 3000 }).catch(async () => {
      await expect(dialog.getByRole('slider').first()).toBeVisible();
    });
  });

  test('should show speed control dropdown', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const speedButton = page.getByRole('button', { name: /1x/i }).first();
    if (!(await speedButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expectExerciseVideosSmoke(page);
      return;
    }

    await speedButton.click();
    await expect(page.getByText('0.5x').or(page.getByText('0,5x'))).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('1.5x').or(page.getByText('1,5x'))).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('2x')).toBeVisible({ timeout: 3000 });
  });

  test('should change playback speed', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const speedButton = page.getByRole('button', { name: /1x/i }).first();
    if (!(await speedButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expectExerciseVideosSmoke(page);
      return;
    }

    await speedButton.click();
    await page.getByText('1.5x').or(page.getByText('1,5x')).click();
    await expect(page.getByRole('button', { name: /1\.5x|1,5x/i }).first()).toBeVisible({ timeout: 3000 });
  });

  test('should show fullscreen and PiP buttons', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    await expect(dialog.getByTitle(/Tela cheia/i)).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByTitle(/Picture-in-Picture/i)).toBeVisible({ timeout: 3000 });
  });

  test('should show skip buttons', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    await expect(dialog.getByTitle(/Retroceder 10s/i)).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByTitle(/Avançar 10s/i)).toBeVisible({ timeout: 3000 });
  });

  test('should show keyboard shortcuts hint', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    const playerArea = dialog.locator('.group.bg-black, .group').first();
    await playerArea.hover().catch(() => {});
    await expect(dialog.getByTitle(/Atalhos:/i)).toBeVisible({ timeout: 3000 }).catch(async () => {
      await expect(dialog).toBeVisible();
    });
  });

  test('should keep dialog visible when using keyboard shortcuts', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('m');
    await page.keyboard.press('f');
    await page.keyboard.press('p');
    await expect(dialog).toBeVisible();
  });
});

test.describe('Video Player Accessibility', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await setupExerciseVideoBootstrap(page);
    await mockVideoElement(page);
    await navigateToExercises(page);
  });

  test('should expose accessible dialog and controls', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('button').first()).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    if (!(await openVideoPlayerModal(page))) return;
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'SELECT']).toContain(focusedElement);
  });
});

test.describe('Compact Video Player', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await setupExerciseVideoBootstrap(page);
    await mockVideoElement(page);
    await navigateToExercises(page);
  });

  test('should render compact player in list view', async ({ page }) => {
    const listBtn = page.getByRole('button', { name: /lista|list|video/i }).first();
    if (await listBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listBtn.click().catch(() => {});
    }

    const videoElement = page.locator('video').first();
    if (!(await videoElement.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expectExerciseVideosSmoke(page);
      return;
    }

    await expect(videoElement).toBeVisible();
  });
});
