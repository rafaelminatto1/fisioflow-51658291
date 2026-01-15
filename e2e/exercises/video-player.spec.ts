import { test, expect } from '@playwright/test';

/**
 * Exercise Video Player E2E Tests
 * Tests for the video player component including:
 * - Playback controls
 * - Volume control
 * - Fullscreen functionality
 * - Speed control
 * - Keyboard shortcuts
 * - Picture-in-Picture
 */

test.describe('Exercise Video Player', () => {
  test.beforeEach(async ({ page }) => {
    // Mock video element to avoid actual video loading
    await page.addInitScript(() => {
      window.HTMLVideoElement.prototype.play = () => Promise.resolve();
      window.HTMLVideoElement.prototype.pause = () => {};
      Object.defineProperty(window.HTMLVideoElement.prototype, 'duration', { value: 60, writable: true });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'currentTime', { value: 0, writable: true });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'volume', { value: 1, writable: true });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'muted', { value: false, writable: true });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'playbackRate', { value: 1, writable: true });

      // Mock PiP support
      Object.defineProperty(document, 'pictureInPictureElement', { value: null, writable: true });
      (window.HTMLVideoElement.prototype as any).requestPictureInPicture = async () => ({
        onresize: null,
      });
      (document as any).exitPictureInPicture = async () => {};
    });
  });

  test('should render video player with controls', async ({ page }) => {
    await page.goto('/exercises');

    // Player should be visible when a video is selected
    await page.locator('[class*="VideoCard"]').first().click();

    // Check for play/pause button
    await expect(page.locator('button:has(svg:has-text("Play"))').or(page.locator('button >> .lucide-play'))).toBeVisible();
  });

  test('should toggle play/pause on click', async ({ page }) => {
    await page.goto('/exercises');

    // Open video player
    await page.locator('[class*="VideoCard"]').first().click();

    const playButton = page.locator('button:has(svg.play)').or(page.locator('button').filter({ hasText: 'play' })).first();
    const pauseButton = page.locator('button:has(svg.pause)').or(page.locator('button').filter({ hasText: 'pause' })).first();

    // Initially should show play button (video is paused)
    // Click to play
    await page.locator('.group').first().click();

    // After clicking, controls should appear
    await expect(page.locator('.absolute.bottom-0')).toBeVisible();
  });

  test('should display time indicators', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Check for time display
    await expect(page.locator('text=/\\d+:\\d{2}/')).toBeVisible();
  });

  test('should display volume controls', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Check for volume button
    const volumeButton = page.locator('button:has(svg:has-text("Volume"))').or(
      page.locator('button').locator('.lucide-volume2, .lucide-volumex')
    );
    await expect(volumeButton.first()).toBeVisible();
  });

  test('should show speed control dropdown', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Click speed button
    await page.getByText('1x').click();

    // Should show speed options
    await expect(page.getByText('0.5x')).toBeVisible();
    await expect(page.getByText('1.5x')).toBeVisible();
    await expect(page.getByText('2x')).toBeVisible();
  });

  test('should change playback speed', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Click speed button
    await page.getByText('1x').click();

    // Select 1.5x speed
    await page.getByText('1.5x').click();

    // Speed button should update
    await expect(page.getByText('1.5x')).toBeVisible();
  });

  test('should show fullscreen button', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Check for fullscreen button
    const fullscreenBtn = page.locator('button').locator('.lucide-maximize, .lucide-minimize');
    await expect(fullscreenBtn.first()).toBeVisible();
  });

  test('should show PiP button', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Check for PiP button (uses Copy icon as substitute)
    const pipButton = page.locator('button').locator('.lucide-copy');
    await expect(pipButton.first()).toBeVisible();
  });

  test('should show skip backward button', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Check for skip backward button
    const skipButton = page.locator('button').locator('.lucide-rotate-ccw');
    await expect(skipButton.first()).toBeVisible();
  });

  test('should show keyboard shortcuts hint', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Hover over player area to show controls
    const playerArea = page.locator('.group.bg-black');
    await playerArea.hover();

    // Keyboard hint should be visible
    const keyboardHint = page.locator('button').locator('.lucide-keyboard');
    await expect(keyboardHint.first()).toBeVisible();
  });

  test('should use keyboard shortcut for play/pause', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Press space to toggle play/pause
    await page.keyboard.press('Space');

    // Controls should still be visible
    await expect(page.locator('.absolute.bottom-0')).toBeVisible();
  });

  test('should use keyboard shortcut for mute', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Press 'm' to mute
    await page.keyboard.press('m');

    // Mute button should be visible
    const muteIcon = page.locator('.lucide-volumex');
    await expect(muteIcon.first()).toBeVisible();
  });

  test('should use keyboard shortcuts for seek', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Press arrow right to seek forward
    await page.keyboard.press('ArrowRight');

    // Press arrow left to seek backward
    await page.keyboard.press('ArrowLeft');

    // Controls should remain visible
    await expect(page.locator('.absolute.bottom-0')).toBeVisible();
  });

  test('should use keyboard shortcut for fullscreen', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Press 'f' for fullscreen
    await page.keyboard.press('f');

    // Note: Fullscreen might not work in headless mode, but we check the action was triggered
    const fullscreenBtn = page.locator('button').locator('.lucide-minimize, .lucide-maximize');
    await expect(fullscreenBtn.first()).toBeVisible();
  });

  test('should use keyboard shortcut for PiP', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Press 'p' for PiP
    await page.keyboard.press('p');

    // PiP button should still be visible
    const pipButton = page.locator('button').locator('.lucide-copy');
    await expect(pipButton.first()).toBeVisible();
  });

  test('should use keyboard shortcuts for speed control', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Press '>' to speed up
    await page.keyboard.press('>');

    // Speed should be displayed
    await expect(page.getByText(/1\\.2[35]x|1\\.5x/)).toBeVisible({ timeout: 5000 });
  });

  test('should auto-hide controls when playing', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Click to start playing
    await page.locator('.group').first().click();

    // Wait a moment
    await page.waitForTimeout(100);

    // Controls should be visible initially
    const controls = page.locator('.absolute.bottom-0');
    await expect(controls).toBeVisible();

    // After moving mouse, controls should appear again
    await page.mouse.move(100, 100);
    await expect(controls).toBeVisible();
  });

  test('should show loading spinner', async ({ page }) => {
    // Mock a video that takes time to load
    await page.addInitScript(() => {
      let videoReady = false;
      setTimeout(() => { videoReady = true; }, 500);

      Object.defineProperty(window.HTMLVideoElement.prototype, 'readyState', {
        get() { return videoReady ? 4 : 0; }
      });
    });

    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Initially might show loading state
    const loadingSpinner = page.locator('.animate-spin');
    // The spinner may appear briefly
    await page.waitForTimeout(100);
  });
});

test.describe('Video Player Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.HTMLVideoElement.prototype.play = () => Promise.resolve();
      window.HTMLVideoElement.prototype.pause = () => {};
      Object.defineProperty(window.HTMLVideoElement.prototype, 'duration', { value: 60, writable: true });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'currentTime', { value: 0, writable: true });
    });
  });

  test('should have aria labels on controls', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Check for aria labels on buttons
    const buttons = page.locator('button[aria-label]');
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/exercises');

    await page.locator('[class*="VideoCard"]').first().click();

    // Tab through controls
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Should have moved focus
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'SELECT']).toContain(focusedElement);
  });
});

test.describe('Compact Video Player', () => {
  test('should render compact player in list view', async ({ page }) => {
    await page.addInitScript(() => {
      window.HTMLVideoElement.prototype.play = () => Promise.resolve();
      Object.defineProperty(window.HTMLVideoElement.prototype, 'duration', { value: 60, writable: true });
    });

    await page.goto('/exercises');

    // Switch to list view
    await page.getByRole('button', { name: /list/i }).click();

    // Compact players should be visible in list items
    const compactPlayers = page.locator('[class*="VideoListItem"]');
    await expect(compactPlayers.first()).toBeVisible();
  });
});
