import { test, expect } from '@playwright/test';

test.describe('Slash Commands - Exercícios e Procedimentos', () => {
    test.beforeEach(async ({ page }) => {
        // Log browser events for debugging
        page.on('console', msg => {
            if (!msg.text().includes('[vite]')) console.log('BROWSER LOG:', msg.text());
        });
        page.on('pageerror', err => console.log('BROWSER ERROR:', err));

        // --- CONSTANTS ---
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        const validPatientId = '123e4567-e89b-12d3-a456-426614174001';

        // --- NETWORK BLOCKING ---
        // Block Firestore to force fallback to Cloud Functions API
        await page.route('**/*firestore.googleapis.com/**', route => route.abort());

        // --- MOCKS SETUP ---
        // Mock Firebase Cloud Functions (onRequest)
        await page.route('**/appointmentServiceHttp', async route => {
            const body = route.request().postDataJSON() || {};
            console.log('MOCK CALL: appointmentServiceHttp', body.action);

            if (body.action === 'get') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            id: validApptId,
                            patient_id: validPatientId,
                            patientId: validPatientId,
                            patient_name: 'Paciente Teste',
                            status: 'agendado',
                            date: '2026-02-23',
                            start_time: '14:00',
                            notes: '{}'
                        }
                    })
                });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
            }
        });

        await page.route('**/evolutionServiceHttp', async route => {
            console.log('MOCK CALL: evolutionServiceHttp');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [] })
            });
        });

        await page.route('**/patientServiceHttp', async route => {
            console.log('MOCK CALL: patientServiceHttp');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        id: validPatientId,
                        name: 'Paciente Teste',
                        full_name: 'Paciente Teste'
                    }
                })
            });
        });

        // Mock profile
        await page.route('**/getProfile', async route => {
            console.log('MOCK CALL: getProfile');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        id: 'user-123',
                        full_name: 'Fisioterapeuta Teste',
                        role: 'admin'
                    }
                })
            });
        });
    });

    test('deve inserir exercícios via slash command e testar checkboxes', async ({ page }) => {
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';

        console.log('Navigating to evolution page...');
        await page.goto(`/session-evolution/${validApptId}`);

        // Wait for loader to disappear
        console.log('Waiting for loader to hide...');
        const loader = page.locator('.lucide-loader-2').first();
        await expect(loader).toBeHidden({ timeout: 30000 });

        // Check for load error
        const errorMsg = page.locator('[data-testid="evolution-error"]');
        if (await errorMsg.isVisible()) {
            const text = await errorMsg.innerText();
            console.log('ERROR ON PAGE:', text);
            // If it's auth error, try to login
            if (text.includes('login') || text.includes('permissão')) {
                console.log('Detected auth error, trying fallback login...');
                await page.goto('/auth');
                await page.fill('#login-email', 'admin@fisioflow.com');
                await page.fill('#login-password', 'senha123');
                await page.click('button[type="submit"]');
                await page.waitForURL(new RegExp(`/session-evolution/${validApptId}`));
                await expect(loader).toBeHidden({ timeout: 30000 });
            } else {
                throw new Error(`Page failed to load: ${text}`);
            }
        }

        console.log('Looking for editor...');
        // Find the first editor
        const editor = page.locator('.ProseMirror').first();
        await editor.waitFor({ state: 'visible', timeout: 20000 });
        await editor.focus();
        await editor.click();

        console.log('Typing slash command...');
        // Clear editor and type /exerc
        await editor.press('Control+a');
        await editor.press('Backspace');
        await editor.pressSequentially('/exerc', { delay: 100 });

        // Wait for suggestion list
        console.log('Waiting for suggestions...');
        const suggestionItem = page.locator('button:has-text("Exercícios")');
        await suggestionItem.waitFor({ state: 'visible', timeout: 10000 });
        await suggestionItem.click();

        console.log('Verifying content...');
        // Verify that default exercises were inserted
        await expect(page.locator('text=Alongamento cervical — 3x15 rep')).toBeVisible();

        // Verify checkboxes
        const taskItems = page.locator('li[data-type="taskItem"]');
        await expect(taskItems.first()).toBeVisible();

        // Test checking a checkbox
        console.log('Testing checkbox...');
        const firstCheckbox = taskItems.nth(0).locator('input[type="checkbox"]');
        await firstCheckbox.check();

        // Verify style
        await expect(taskItems.nth(0)).toHaveAttribute('data-checked', 'true');

        const struckText = taskItems.nth(0).locator('p');
        const textDecoration = await struckText.evaluate(el => window.getComputedStyle(el).textDecoration);
        expect(textDecoration).toContain('line-through');
        console.log('Test completed successfully!');
    });
});
