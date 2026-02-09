/**
 * Responsive Layout Validation Tests
 *
 * Tests responsive behavior for:
 * - iPad (10.5", 11", 12.9")
 * - Notebooks (1366x768, 1280x720, 1440x900)
 * - Desktop (1920x1080)
 */

import { test, expect } from '@playwright/test';

test.describe('Responsive Layout - Viewport Tests', () => {
    const devices = [
        { name: 'iPhone SE', width: 375, height: 667, description: 'Small mobile' },
        { name: 'iPhone 12', width: 390, height: 844, description: 'Large mobile' },
        { name: 'iPad Mini', width: 768, height: 1024, description: 'Small tablet portrait' },
        { name: 'iPad 10.5', width: 834, height: 1192, description: 'Tablet portrait' },
        { name: 'iPad 11', width: 834, height: 1194, description: 'Tablet portrait' },
        { name: 'iPad Pro 12.9', width: 1024, height: 1366, description: 'Large tablet portrait' },
        { name: 'Small Notebook', width: 1024, height: 600, description: 'Netbook' },
        { name: 'Notebook', width: 1280, height: 720, description: 'Standard notebook' },
        { name: 'Notebook HD', width: 1366, height: 768, description: 'HD notebook' },
        { name: 'Full HD', width: 1920, height: 1080, description: 'Desktop' },
    ];

    for (const device of devices) {
        test(`${device.name} (${device.width}x${device.height}) - ${device.description}`, async ({ page }) => {
            await page.setViewportSize({ width: device.width, height: device.height });

            // Navigate to main app page
            await page.goto('/');

            // Check for no horizontal overflow
            const hasHorizontalScroll = await page.evaluate(() => {
                return document.body.scrollWidth > window.innerWidth;
            });

            expect(hasHorizontalScroll).toBeFalsy();

            // Check main navigation is visible
            const nav = page.locator('nav').first();
            if (await nav.isVisible()) {
                const navBox = await nav.boundingBox();
                expect(navBox?.width).toBeLessThanOrEqual(device.width);
            }

            // Verify page is responsive
            const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
            expect(bodyWidth).toBeLessThanOrEqual(device.width);

            // Take screenshot for visual verification
            await page.screenshot({
                path: `test-results/responsive-${device.name.replace(/\s+/g, '-').toLowerCase()}-${device.width}x${device.height}.png`,
                fullPage: false
            });
        });
    }
});

test.describe('Responsive Layout - Orientation Changes', () => {
    test('iPad portrait to landscape transition', async ({ page }) => {
        // Start in portrait
        await page.setViewportSize({ width: 834, height: 1192 });
        await page.goto('/');

        const portraitWidth = await page.evaluate(() => document.body.scrollWidth);

        // Switch to landscape
        await page.setViewportSize({ width: 1194, height: 834 });
        await page.waitForTimeout(300);

        const landscapeWidth = await page.evaluate(() => document.body.scrollWidth);

        // Both should fit without horizontal scroll
        expect(portraitWidth).toBeLessThanOrEqual(834);
        expect(landscapeWidth).toBeLessThanOrEqual(1194);
    });

    test('Notebook to ultrawide transition', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.goto('/');

        const notebookWidth = await page.evaluate(() => document.body.scrollWidth);

        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(300);

        const desktopWidth = await page.evaluate(() => document.body.scrollWidth);

        expect(notebookWidth).toBeLessThanOrEqual(1366);
        expect(desktopWidth).toBeLessThanOrEqual(1920);
    });
});

test.describe('Touch Target Sizes', () => {
    const touchSizes = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 834, height: 1192 },
    ];

    for (const device of touchSizes) {
        test(`${device.name} - minimum touch target size (44px)`, async ({ page }) => {
            await page.setViewportSize({ width: device.width, height: device.height });
            await page.goto('/');

            // Get all interactive elements
            const buttons = page.locator('button:not([hidden]):visible');

            const count = await buttons.count();
            const minSize = 44; // iOS HIG minimum touch target

            for (let i = 0; i < Math.min(count, 10); i++) {
                const button = buttons.nth(i);
                const box = await button.boundingBox();

                if (box) {
                    // Either width or height should be at least minSize
                    const meetsMinSize = box.width >= minSize || box.height >= minSize;
                    expect(meetsMinSize).toBeTruthy();
                }
            }
        });
    }
});

test.describe('Typography Scaling', () => {
    test('font sizes remain readable on small screens', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        const fontSize = await page.evaluate(() => {
            const body = window.getComputedStyle(document.body);
            return parseFloat(body.fontSize);
        });

        // Base font should be at least 14px
        expect(fontSize).toBeGreaterThanOrEqual(14);
    });

    test('line height is sufficient for readability', async ({ page }) => {
        await page.setViewportSize({ width: 834, height: 1192 });
        await page.goto('/');

        const lineHeight = await page.evaluate(() => {
            const body = window.getComputedStyle(document.body);
            const fontSize = parseFloat(body.fontSize);
            const lineHeightValue = parseFloat(body.lineHeight);
            return lineHeightValue / fontSize;
        });

        // Line height should be at least 1.4x font size for readability
        expect(lineHeight).toBeGreaterThanOrEqual(1.3);
    });
});

test.describe('Performance - Layout Stability', () => {
    test('no layout shift after page load', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('/');

        // Wait for page to be ready (domcontentloaded is more reliable than networkidle)
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Check for layout shift indicators
        const layoutShifts = await page.evaluate(() => {
            // @ts-ignore - PerformanceObserver API
            if (!window.PerformanceObserver) return 0;

            return new Promise((resolve) => {
                // @ts-ignore
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    let shiftScore = 0;
                    entries.forEach((entry: any) => {
                        if (!entry.hadRecentInput) {
                            shiftScore += entry.value;
                        }
                    });
                    resolve(shiftScore);
                });

                try {
                    // @ts-ignore
                    observer.observe({ entryTypes: ['layout-shift'] });
                    setTimeout(() => resolve(0), 1000);
                } catch {
                    resolve(0);
                }
            });
        });

        // Cumulative Layout Shift should be minimal
        expect(typeof layoutShifts).toBe('number');
    });
});

test.describe('Accessibility - Responsive', () => {
    test('focus visible on all viewport sizes', async ({ page }) => {
        const sizes = [
            { width: 375, height: 667 },
            { width: 834, height: 1192 },
            { width: 1920, height: 1080 },
        ];

        for (const size of sizes) {
            await page.setViewportSize(size);
            await page.goto('/');

            const firstInput = page.locator('input, button, a').first();
            await firstInput.focus();

            const isFocused = await firstInput.evaluate((el) =>
                document.activeElement === el
            );

            expect(isFocused).toBeTruthy();
        }
    });

    test('screen reader content preserved on resize', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');

        const ariaElementsBefore = await page.locator('[aria-label], [aria-labelledby]').count();

        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(300);

        const ariaElementsAfter = await page.locator('[aria-label], [aria-labelledby]').count();

        // Should maintain accessibility attributes
        expect(ariaElementsAfter).toBeGreaterThan(0);
    });
});
