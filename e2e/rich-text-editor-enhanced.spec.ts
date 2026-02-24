import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Enhanced Rich Text Editor Validation', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // Login with seeded user
        await page.goto('/auth');
        const user = testUsers.admin; // teste@moocafisio.com.br
        await page.waitForSelector('#login-email');
        await page.fill('#login-email', user.email);
        await page.fill('#login-password', user.password);
        await page.click('button[type="submit"]');

        // Wait for redirect from login
        await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 30000 });

        // Go to dashboard and find an appointment card
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Find an appointment and click it - use selectors from flux-tres-evolucoes
        const appointmentCard = page.locator('[role="button"][aria-label*="às"], .calendar-appointment-card, .appointment-card, [data-testid="appointment-card"]').first();
        await appointmentCard.waitFor({ state: 'visible', timeout: 20000 });
        await appointmentCard.click();

        // Start session if not already in one
        const startButton = page.locator('button:has-text("Iniciar atendimento"), button:has-text("Iniciar Avaliação")').first();
        if (await startButton.isVisible()) {
            await startButton.click();
        }

        // Now on the evolution page
        await page.waitForURL(/\/session-evolution\//, { timeout: 20000 });
        await expect(page.locator('.lucide-loader-2')).toBeHidden({ timeout: 15000 });

        // Toggle to V3 Notion view if not already there
        const notionToggle = page.locator('button:has-text("Notion")');
        // Wait a bit for the toggle to be available in the DOM
        await page.waitForTimeout(2000);
        if (await notionToggle.isVisible()) {
            await notionToggle.click();
        }
    });

    test('should show the enhanced toolbar and grouped buttons', async ({ page }) => {
        // Scroll to editor to ensure visibility
        const editor = page.locator('.ProseMirror').first();
        await editor.scrollIntoViewIfNeeded();

        // Check for basic format icons - use a more flexible matcher for titles
        await expect(page.locator('button[title*="Negrito"]')).toBeVisible();
        await expect(page.locator('button[title*="Itálico"]')).toBeVisible();
        await expect(page.locator('button[title*="Sublinhado"]')).toBeVisible();

        // Check for the new '+' (Insert) button
        await expect(page.locator('button:has(.lucide-plus)')).toBeVisible();

        // Check for Color pickers
        await expect(page.locator('button[title="Cor do Texto"]')).toBeVisible();
        await expect(page.locator('button[title="Cor de Destaque"]')).toBeVisible();
    });

    test('should open the insert menu and show new media items', async ({ page }) => {
        // Scroll to editor
        const editor = page.locator('.ProseMirror').first();
        await editor.scrollIntoViewIfNeeded();

        // Click the '+' insert menu
        await page.click('button:has(.lucide-plus)');

        // Verify items in the menu
        await expect(page.locator('role=menuitem >> text=Imagem')).toBeVisible();
        await expect(page.locator('role=menuitem >> text=Vídeo do YouTube')).toBeVisible();
        await expect(page.locator('role=menuitem >> text=Tabela')).toBeVisible();
        await expect(page.locator('role=menuitem >> text=Bloco de Código')).toBeVisible();
    });

    test('should show new slash commands in the suggestion list', async ({ page }) => {
        const editor = page.locator('.ProseMirror').first();
        await editor.scrollIntoViewIfNeeded();
        await editor.click();
        await editor.type('/');

        // Verify the suggestion items
        await expect(page.locator('text=Imagem')).toBeVisible();
        await expect(page.locator('text=Vídeo do YouTube').first()).toBeVisible();
        await expect(page.locator('text=Tabela').first()).toBeVisible();
        await expect(page.locator('text=Bloco de Código').first()).toBeVisible();
    });

    test('should insert a table and show contextual controls', async ({ page }) => {
        const editor = page.locator('.ProseMirror').first();
        await editor.scrollIntoViewIfNeeded();
        await editor.click();
        await editor.type('/tabela');
        await page.locator('text=Tabela').first().click();

        // Verify table is inserted
        await expect(editor.locator('table')).toBeVisible();

        // Check if contextual buttons appear (e.g., delete table or add row)
        await expect(page.locator('button[title="Adicionar linha abaixo"]')).toBeVisible();
        await expect(page.locator('button[title="Remover tabela"]')).toBeVisible();
    });
});
