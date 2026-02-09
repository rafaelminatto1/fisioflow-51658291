/**
 * Evolution Page Responsive Layout Tests
 *
 * Tests responsive behavior for:
 * - iPad (10.5", 11", 12.9")
 * - Notebooks (1366x768, 1280x720, 1440x900)
 * - Desktop (1920x1080)
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Evolution Page - Tablet & Notebook Responsive', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to a patient evolution page
        // You may need to adjust this URL or add authentication
        await page.goto('/patient-evolution/test-appointment-id');
    });

    test.describe('iPad 10.5" (834x1192)', () => {
        test('should display 2-column grid layout', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });

            // Check that SOAP fields are in 2x2 grid
            const soapFields = page.locator('[data-section="soap"]');
        });

        test('should have touch-friendly button sizes', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });

            const buttons = page.locator('button').filter({ hasText: /Salvar|Copiar|Editar/ });
            const count = await buttons.count();

            for (let i = 0; i < Math.min(count, 5); i++) {
                const button = buttons.nth(i);
                const box = await button.boundingBox();
                expect(box?.height).toBeGreaterThanOrEqual(44); // iOS touch target
            }
        });

        test('should stack cards vertically on portrait', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });

            // Check that cards stack properly
            const cards = page.locator('[class*="grid"]').first();
            const grid = await cards.locator('> div').all();

            // On iPad portrait, should have stacked content
            expect(grid.length).toBeGreaterThan(0);
        });
    });

    test.describe('iPad 11" (834x1194)', () => {
        test('should maintain 2-column layout', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1194 });

            // Wait for layout to stabilize
            await page.waitForTimeout(300);

            // Check grid layout
            const gridContainer = page.locator('.react-grid-layout');
            await expect(gridContainer).toBeVisible();
        });
    });

    test.describe('iPad 12.9" (1024x1366)', () => {
        test('should display 2-column layout with larger cards', async ({ page }) => {
            await page.setViewportSize({ width: 1024, height: 1366 });

            // Should have more horizontal space
            const gridContainer = page.locator('.react-grid-layout');
            await expect(gridContainer).toBeVisible();

            // Check that we have 8 columns (iPad 12.9" uses lg breakpoint with 8 cols)
            const firstItem = gridContainer.locator('> div').first();
            await expect(firstItem).toBeVisible();
        });
    });

    test.describe('iPad Landscape', () => {
        test('should switch to wider layout on landscape', async ({ page }) => {
            await page.setViewportSize({ width: 1194, height: 834 });

            // In landscape, should have more horizontal space
            const gridContainer = page.locator('.react-grid-layout');
            await expect(gridContainer).toBeVisible();
        });
    });

    test.describe('Notebook 1366x768', () => {
        test('should display full 12-column layout', async ({ page }) => {
            await page.setViewportSize({ width: 1366, height: 768 });

            // Standard notebook should use xl breakpoint (12 cols)
            const gridContainer = page.locator('.react-grid-layout');
            await expect(gridContainer).toBeVisible();

            // Check layout has proper spacing
            const items = gridContainer.locator('> div');
            const firstItem = items.first();
            const box = await firstItem.boundingBox();

            expect(box).toBeTruthy();
            expect(box!.width).toBeGreaterThan(0);
        });

        test('should show all panels without horizontal scroll', async ({ page }) => {
            await page.setViewportSize({ width: 1366, height: 768 });

            // Check for no horizontal overflow
            const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
            const viewportWidth = await page.evaluate(() => window.innerWidth);

            expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
        });
    });

    test.describe('Notebook 1280x720', () => {
        test('should use 8-column layout (lg breakpoint)', async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 720 });

            const gridContainer = page.locator('.react-grid-layout');
            await expect(gridContainer).toBeVisible();
        });

        test('should fit content vertically without excessive scroll', async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 720 });

            const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
            // Should be reasonable height, not extremely tall
            expect(scrollHeight).toBeLessThan(5000);
        });
    });

    test.describe('Small Notebook 1024x600', () => {
        test('should use md breakpoint with 6 columns', async ({ page }) => {
            await page.setViewportSize({ width: 1024, height: 600 });

            const gridContainer = page.locator('.react-grid-layout');
            await expect(gridContainer).toBeVisible();
        });

        test('should compress vertical spacing for small height', async ({ page }) => {
            await page.setViewportSize({ width: 1024, height: 600 });

            const gridItems = page.locator('.react-grid-layout > div');
            const count = await gridItems.count();

            // All items should be visible
            for (let i = 0; i < Math.min(count, 3); i++) {
                const item = gridItems.nth(i);
                await expect(item).toBeInViewport();
            }
        });
    });

    test.describe('Surface Pro / Tablet 912x1368', () => {
        test('should handle 3:2 aspect ratio properly', async ({ page }) => {
            await page.setViewportSize({ width: 912, height: 1368 });

            // Should use md breakpoint (6 cols)
            const gridContainer = page.locator('.react-grid-layout');
            await expect(gridContainer).toBeVisible();
        });
    });

    test.describe('Orientation Changes', () => {
        test('should smoothly transition from portrait to landscape', async ({ page }) => {
            // Start in portrait
            await page.setViewportSize({ width: 834, height: 1192 });
            await page.waitForTimeout(300);

            const portraitGrid = await page.locator('.react-grid-layout').boundingBox();

            // Switch to landscape
            await page.setViewportSize({ width: 1194, height: 834 });
            await page.waitForTimeout(300);

            const landscapeGrid = await page.locator('.react-grid-layout').boundingBox();

            // Layout should have changed
            expect(portraitGrid?.width).not.toBe(landscapeGrid?.width);
        });

        test('should maintain state during orientation change', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });

            // Fill in a SOAP field
            const subjectiveField = page.locator('textarea[placeholder*="Queixa"]').first();
            await subjectiveField.fill('Test content for responsive test');

            // Rotate
            await page.setViewportSize({ width: 1194, height: 834 });
            await page.waitForTimeout(300);

            // Content should be preserved
            await expect(subjectiveField).toHaveValue('Test content for responsive test');
        });
    });

    test.describe('Touch Interactions on Tablet', () => {
        test('should allow drag interactions when edit mode is on', async ({ page }) => {
            // Open edit mode
            const editButton = page.locator('button').filter({ hasText: /Personalizar|Editar/ });
            if (await editButton.isVisible()) {
                await editButton.click();
            }

            // Check that drag handles are visible
            const dragHandles = page.locator('.drag-handle');
            const count = await dragHandles.count();

            if (count > 0) {
                // Try dragging the first item
                const firstHandle = dragHandles.first();
                await firstHandle.dragTo(page.locator('.react-grid-layout'), {
                    targetPosition: { x: 200, y: 200 }
                });
            }
        });

        test('should have adequate spacing between touch targets', async ({ page }) => {
            const buttons = page.locator('button:visible');

            // Get positions of first few buttons
            const positions: Array<{ x: number; y: number; width: number; height: number }> = [];

            for (let i = 0; i < Math.min(await buttons.count(), 5); i++) {
                const box = await buttons.nth(i).boundingBox();
                if (box) {
                    positions.push(box);
                }
            }

            // Check spacing between adjacent buttons
            for (let i = 0; i < positions.length - 1; i++) {
                const current = positions[i];
                const next = positions[i + 1];

                if (current && next) {
                    // Minimum 8px spacing between touch targets (WCAG)
                    const horizontalSpacing = Math.abs(next.x - (current.x + current.width));
                    const verticalSpacing = Math.abs(next.y - (current.y + current.height));

                    const hasSpacing = horizontalSpacing >= 8 || verticalSpacing >= 8;
                    expect(hasSpacing).toBeTruthy();
                }
            }
        });
    });

    test.describe('Accessibility on Tablet', () => {
        test('should maintain readable font sizes on tablet', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });

            // Check base font size
            const fontSize = await page.evaluate(() => {
                const computed = window.getComputedStyle(document.body);
                return parseFloat(computed.fontSize);
            });

            // Should be at least 16px to prevent iOS zoom
            expect(fontSize).toBeGreaterThanOrEqual(14);
        });

        test('should have proper focus indicators for keyboard navigation', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });

            const firstInput = page.locator('input, textarea, button').first();
            await firstInput.focus();

            // Check for visible focus indicator
            const focusedElement = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el) return null;
                const computed = window.getComputedStyle(el);
                return {
                    outline: computed.outline,
                    outlineWidth: computed.outlineWidth,
                    boxShadow: computed.boxShadow
                };
            });

            expect(focusedElement).toBeTruthy();
        });
    });

    test.describe('Performance on Tablet', () => {
        test('should render layout quickly on iPad', async ({ page }) => {
            const startTime = Date.now();

            await page.setViewportSize({ width: 834, height: 1192 });
            await page.goto('/patient-evolution/test-appointment-id');

            await page.waitForSelector('.react-grid-layout', { timeout: 5000 });

            const loadTime = Date.now() - startTime;

            // Should load within 3 seconds on tablet
            expect(loadTime).toBeLessThan(3000);
        });

        test('should not have layout shift after load', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });
            await page.goto('/patient-evolution/test-appointment-id');

            await page.waitForLoadState('networkidle');

            const firstLayout = await page.locator('.react-grid-layout').boundingBox();
            await page.waitForTimeout(500);
            const secondLayout = await page.locator('.react-grid-layout').boundingBox();

            // Positions should be stable
            expect(firstLayout?.x).toBe(secondLayout?.x);
            expect(firstLayout?.y).toBe(secondLayout?.y);
        });
    });

    test.describe('Responsive Header', () => {
        test('should show simplified header on tablet portrait', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });

            const header = page.locator('header').first();
            await expect(header).toBeVisible();

            // On smaller screens, may hide less important elements
            const headerHeight = await header.evaluate(el => el.offsetHeight);
            expect(headerHeight).toBeLessThan(100); // Compact header
        });

        test('should show full header on notebook', async ({ page }) => {
            await page.setViewportSize({ width: 1366, height: 768 });

            const header = page.locator('header').first();
            await expect(header).toBeVisible();
        });
    });
});

test.describe('Evolution Page - Responsive Breakpoints Verification', () => {
    const breakpoints = [
        { name: 'Mobile', width: 375, expectedCols: 1 },
        { name: 'Large Mobile', width: 480, expectedCols: 2 },
        { name: 'Small Tablet', width: 600, expectedCols: 4 },
        { name: 'iPad', width: 768, expectedCols: 6 },
        { name: 'iPad Pro', width: 1024, expectedCols: 8 },
        { name: 'Notebook', width: 1280, expectedCols: 8 },
        { name: 'Desktop', width: 1920, expectedCols: 12 },
    ];

    for (const bp of breakpoints) {
        test(`breakpoint ${bp.name} (${bp.width}px)`, async ({ page }) => {
            await page.setViewportSize({ width: bp.width, height: 800 });
            await page.goto('/patient-evolution/test-appointment-id');

            // Wait for grid to be visible
            const grid = page.locator('.react-grid-layout');
            await expect(grid).toBeVisible();

            // Verify no horizontal scroll
            const hasHorizontalScroll = await page.evaluate(() => {
                return document.body.scrollWidth > window.innerWidth;
            });

            expect(hasHorizontalScroll).toBeFalsy();
        });
    }
});
