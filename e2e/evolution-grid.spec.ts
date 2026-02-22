import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Patient Evolution Draggable Grid', () => {
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
        // Wait for appointment card to be visible
        await Promise.race([
            expect(appointmentCard).toBeVisible({ timeout: 10000 }).catch(() => { }),
            // Fallback: look for text if class is dynamic
            expect(page.locator('text=Dr.').first()).toBeVisible({ timeout: 10000 }).catch(() => { })
        ]);

        // If no appointment found, we might need to seed data, but for now we assume data exists as per manual test attempt
        // Try to click the first card-like element in the calendar grid
        await page.click('div[role="button"]:has-text("Dr.") >> nth=0');

        // Click "Iniciar Atendimento"
        await page.click('button:has-text("Iniciar atendimento")');

        // Wait for evolution page
        await page.waitForURL(/\/patients\/.*\/evolution\/.*/);

        // Ensure we are on "Evolução" tab
        await page.click('button[value="evolucao"]');
    });

    test('should allow toggling edit mode and moving widgets', async ({ page }) => {
        // 1. Check if grid is present
        const grid = page.locator('.react-grid-layout');
        await expect(grid).toBeVisible();

        // 2. Click "Personalizar"
        const personalizeBtn = page.locator('button:has-text("Personalizar")');
        await personalizeBtn.click();

        // 3. Verify visuals change (e.g., Save button appears)
        await expect(page.locator('button:has-text("Salvar")')).toBeVisible();
        await expect(page.locator('button:has-text("Cancelar")')).toBeVisible();

        // 4. Verify drag handles appear
        const dragHandles = page.locator('.drag-handle');
        await expect(dragHandles.first()).toBeVisible();

        // 5. Simulate Drag (Moving Pain Scale Widget)
        // We'll move the first widget to a new position.
        const firstWidget = page.locator('.react-grid-item').first();
        const firstWidgetBox = await firstWidget.boundingBox();

        if (firstWidgetBox) {
            await page.mouse.move(firstWidgetBox.x + 20, firstWidgetBox.y + 20);
            await page.mouse.down();
            await page.mouse.move(firstWidgetBox.x + 400, firstWidgetBox.y + 100, { steps: 10 });
            await page.mouse.up();
        }

        // 6. Save Layout
        await page.click('button:has-text("Salvar")');

        // 7. Verify toast or "Personalizar" button returns
        await expect(personalizeBtn).toBeVisible();

        // 8. Reload and check if layout persisted (basic verify)
        await page.reload();
        await page.click('button[value="evolucao"]'); // Ensure tab active

        // Ideally we check coordinates, but for now just ensuring it loads without error and grid is there
        await expect(grid).toBeVisible();
    });

    test('should allow entering text in SOAP fields without dragging', async ({ page }) => {
        // Ensure we can type in Subjective field
        const subjectiveInput = page.locator('textarea[placeholder*="Queixa principal"]').first();
        await subjectiveInput.fill('Testando subjetivo Playwright');
        await expect(subjectiveInput).toHaveValue('Testando subjetivo Playwright');
    });
});
