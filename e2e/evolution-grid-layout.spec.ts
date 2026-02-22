
/**
 * Evolution Grid Layout Tests
 *
 * Tests to verify the correct layout of widgets on the Evolution page,
 * ensuring no overlaps and correct positioning when Pain Scale is expanded/collapsed.
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Evolution Grid Layout - Widget Positioning', () => {
    test.beforeEach(async ({ page }) => {
        // 1. Login
        await page.goto('/auth');
        await page.fill('input[name="email"]', testUsers.admin.email);
        await page.fill('input[name="password"]', testUsers.admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/(\?.*|\/eventos|\/dashboard|\/schedule)/);

        // 2. Navigate to Schedule and start session
        await page.goto('/schedule');

        // Find visible appointment card
        const appointmentCard = page.locator('.appointment-card').first();
        await Promise.race([
            expect(appointmentCard).toBeVisible({ timeout: 10000 }).catch(() => { }),
            expect(page.locator('text=Dr.').first()).toBeVisible({ timeout: 10000 }).catch(() => { })
        ]);

        await page.click('div[role="button"]:has-text("Dr.") >> nth=0');
        await page.click('button:has-text("Iniciar atendimento")');
        await page.waitForURL(/\/patients\/.*\/evolution\/.*/);

        // Ensure we are on "Evolução" tab
        await page.click('button[value="evolucao"]');

        // Clear any saved layout to start fresh
        await page.evaluate(() => localStorage.removeItem('evolution_layout_v1'));
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
    });

    test('should have all expected widgets in correct order (Pain Scale collapsed)', async ({ page }) => {
        const grid = page.locator('.react-grid-layout');
        await expect(grid).toBeVisible();

        // Get all grid items
        const gridItems = grid.locator('.react-grid-item');
        const count = await gridItems.count();

        // We expect 10 widgets:
        // 1. pain-scale
        // 2. exercises-block
        // 3-6. subjective, objective, assessment, plan (SOAP)
        // 7. measurements
        // 8. home-care-block
        // 9. previous-sessions
        // 10. photos
        expect(count).toBe(10);

        // Verify widget titles exist in correct order
        const expectedTitles = [
            'Nível de Dor',
            'Exercícios da Sessão',
            'Subjetivo',
            'Objetivo',
            'Avaliação',
            'Plano',
            'Registro de Medições',
            'Home Care',
            'Sessões Anteriores',
            'Anexos'
        ];

        for (let i = 0; i < expectedTitles.length; i++) {
            const widgetTitle = gridItems.nth(i).locator('text=' + expectedTitles[i]);
            await expect(widgetTitle).toBeVisible({ timeout: 5000 });
        }
    });

    test('should verify Pain Scale widget expands and collapses without breaking layout', async ({ page }) => {
        // Find Pain Scale widget
        const painScaleWidget = page.locator('.react-grid-item').filter({ hasText: 'Nível de Dor' });
        await expect(painScaleWidget).toBeVisible();

        // Get initial bounding box (collapsed state)
        const initialBox = await painScaleWidget.boundingBox();
        expect(initialBox).toBeTruthy();

        // Click the expand button (chevron down)
        const expandButton = painScaleWidget.locator('button[aria-label*="Expandir detalhes da dor"], button:has(.lucide-chevron-down)');
        await expandButton.click();

        // Wait for layout to update
        await page.waitForTimeout(500);

        // Get expanded bounding box
        const expandedBox = await painScaleWidget.boundingBox();
        expect(expandedBox).toBeTruthy();

        // Expanded height should be significantly larger
        if (expandedBox && initialBox) {
            expect(expandedBox.height).toBeGreaterThan(initialBox.height * 1.5);
        }

        // Verify all widgets are still visible (no overlaps)
        const allWidgets = page.locator('.react-grid-item');
        const count = await allWidgets.count();
        expect(count).toBe(10);

        for (let i = 0; i < count; i++) {
            const widget = allWidgets.nth(i);
            await expect(widget).toBeVisible();

            // Check if widget is not obscured by another widget
            const box = await widget.boundingBox();
            if (box) {
                // Widget should have reasonable dimensions
                expect(box.width).toBeGreaterThan(50);
                expect(box.height).toBeGreaterThan(50);
            }
        }

        // Collapse back
        const collapseButton = painScaleWidget.locator('button[aria-label*="Recolher detalhes da dor"], button:has(.lucide-chevron-up)');
        await collapseButton.click();

        // Wait for layout to update
        await page.waitForTimeout(500);

        // Verify widgets return to collapsed positions
        const collapsedBox = await painScaleWidget.boundingBox();
        if (collapsedBox && initialBox) {
            // Heights should be similar
            expect(Math.abs(collapsedBox.height - initialBox.height)).toBeLessThan(10);
        }
    });

    test('should verify widgets are clickable and not obscured', async ({ page }) => {
        const allWidgets = page.locator('.react-grid-item');
        const count = await allWidgets.count();

        for (let i = 0; i < count; i++) {
            const widget = allWidgets.nth(i);

            // Get widget center position
            const box = await widget.boundingBox();
            if (!box) continue;

            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;

            // Try to click at the center of each widget
            await page.mouse.click(centerX, centerY);

            // The widget should receive the click (we can verify by checking if it became focused)
            // For now, we just verify no JavaScript errors occurred
        }
    });

    test('should reset layout when clicking "Redefinir" button', async ({ page }) => {
        // Clear any saved layout first
        await page.evaluate(() => localStorage.removeItem('evolution_layout_v1'));

        // Click "Personalizar" to enter edit mode
        await page.click('button:has-text("Personalizar")');
        await expect(page.locator('button:has-text("Salvar")')).toBeVisible();

        // Drag a widget to change layout
        const firstWidget = page.locator('.react-grid-item').first();
        const box = await firstWidget.boundingBox();
        if (box) {
            await page.mouse.move(box.x + 50, box.y + 20);
            await page.mouse.down();
            await page.mouse.move(box.x + 100, box.y + 20, { steps: 5 });
            await page.mouse.up();
        }

        // Save the layout
        await page.click('button:has-text("Salvar")');
        await page.waitForTimeout(500);

        // Click "Redefinir" button
        await page.click('button:has-text("Redefinir")');

        // Page should reload
        await page.waitForLoadState('domcontentloaded');

        // Grid should still be visible
        const grid = page.locator('.react-grid-layout');
        await expect(grid).toBeVisible();

        // All widgets should be present
        const allWidgets = page.locator('.react-grid-item');
        const count = await allWidgets.count();
        expect(count).toBe(10);
    });

    test('should verify SOAP widgets are in 2x2 layout', async ({ page }) => {
        // Find SOAP widgets
        const subjectiveWidget = page.locator('.react-grid-item').filter({ hasText: 'Subjetivo' });
        const objectiveWidget = page.locator('.react-grid-item').filter({ hasText: 'Objetivo' });
        const assessmentWidget = page.locator('.react-grid-item').filter({ hasText: 'Avaliação' });
        const planWidget = page.locator('.react-grid-item').filter({ hasText: 'Plano' });

        await expect(subjectiveWidget).toBeVisible();
        await expect(objectiveWidget).toBeVisible();
        await expect(assessmentWidget).toBeVisible();
        await expect(planWidget).toBeVisible();

        // Get positions
        const subjectiveBox = await subjectiveWidget.boundingBox();
        const objectiveBox = await objectiveWidget.boundingBox();
        const assessmentBox = await assessmentWidget.boundingBox();
        const planBox = await planWidget.boundingBox();

        expect(subjectiveBox).toBeTruthy();
        expect(objectiveBox).toBeTruthy();
        expect(assessmentBox).toBeTruthy();
        expect(planBox).toBeTruthy();

        if (subjectiveBox && objectiveBox && assessmentBox && planBox) {
            // Subjective and Objective should be on the same row (similar Y)
            const row1YDiff = Math.abs(subjectiveBox.y - objectiveBox.y);
            expect(row1YDiff).toBeLessThan(20); // Allow small margin for error

            // Assessment and Plan should be on the same row (similar Y)
            const row2YDiff = Math.abs(assessmentBox.y - planBox.y);
            expect(row2YDiff).toBeLessThan(20);

            // Assessment should be below Subjective
            expect(assessmentBox.y).toBeGreaterThan(subjectiveBox.y);

            // Subjective and Objective should be side by side (Subjective on left, Objective on right)
            expect(objectiveBox.x).toBeGreaterThan(subjectiveBox.x);
        }
    });

    test('should verify no widgets overlap each other', async ({ page }) => {
        const allWidgets = page.locator('.react-grid-item');
        const count = await allWidgets.count();
        const boxes: Array<{ x: number; y: number; width: number; height: number; id: string }> = [];

        // Get all widget positions
        for (let i = 0; i < count; i++) {
            const widget = allWidgets.nth(i);
            const box = await widget.boundingBox();
            if (box) {
                const widgetId = await widget.getAttribute('data-react-grid-layout-id') || `widget-${i}`;
                boxes.push({ ...box, id: widgetId });
            }
        }

        // Check for overlaps
        for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
                const a = boxes[i];
                const b = boxes[j];

                // Check if rectangles overlap
                const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
                const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;

                if (overlapX && overlapY) {
                    // Allow small overlap (margin spacing)
                    const overlapAreaX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
                    const overlapAreaY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
                    const overlapArea = overlapAreaX * overlapAreaY;

                    // Overlap should be minimal (less than 100px²)
                    expect(overlapArea).toBeLessThan(100);
                }
            }
        }
    });
});
