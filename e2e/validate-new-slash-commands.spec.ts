import { test, expect } from '@playwright/test';

test.describe('Validation - Novos Slash Commands e Checklist', () => {
    test.beforeEach(async ({ page }) => {
        // Log browser events for debugging
        page.on('console', msg => {
            if (!msg.text().includes('[vite]')) console.log('BROWSER LOG:', msg.text());
        });
        page.on('pageerror', err => console.log('BROWSER ERROR:', err));

        // --- CONSTANTS ---
        const validUserId = '123e4567-e89b-12d3-a456-426614174000';
        const validPatientId = '123e4567-e89b-12d3-a456-426614174001';
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        const validOrgId = '123e4567-e89b-12d3-a456-426614174003';

        // --- MOCKS SETUP ---
        await page.route('**/rest/v1/**', async route => {
            await route.fulfill({ json: [] });
        });
        await page.route('**/functions/v1/**', async route => {
            await route.fulfill({ json: { message: 'ok' } });
        });

        // Auth Mocks
        const mockUser = {
            id: validUserId,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'rafael.minatto@yahoo.com.br',
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: 'Rafael Minatto' },
            created_at: new Date().toISOString(),
        };

        const mockSession = {
            access_token: 'fake-jwt-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'fake-refresh-token',
            user: mockUser
        };

        await page.route('**/auth/v1/token?*', async route => route.fulfill({ json: mockSession }));
        await page.route('**/auth/v1/user*', async route => route.fulfill({ json: mockUser }));

        // Data Mocks
        const mockPatient = {
            id: validPatientId,
            name: 'Paciente Teste Slash',
            email: 'slash@teste.com'
        };

        const mockAppointment = {
            id: validApptId,
            patient_id: validPatientId,
            organization_id: validOrgId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(),
            status: 'agendado',
            notes: JSON.stringify({ soap: {}, exercises: [] }),
            patients: mockPatient
        };

        // API Routes
        await page.route('**/rest/v1/appointments*', async route => {
            await route.fulfill({ json: mockAppointment });
        });

        await page.route('**/rest/v1/patients*', async route => {
            await route.fulfill({ json: mockPatient });
        });

        await page.route('**/rest/v1/profiles*', async route => {
            await route.fulfill({ json: { id: validUserId, organization_id: validOrgId, role: 'therapist', full_name: 'Rafael Minatto' } });
        });

        // Navigation
        await page.goto('/auth');

        // Wait for page to load with higher timeout
        await expect(page.locator('#login-email')).toBeVisible({ timeout: 15000 });

        await page.fill('#login-email', 'rafael.minatto@yahoo.com.br');
        await page.fill('#login-password', 'Yukari30@');
        await page.click('button:has-text("Acessar Minha Conta")');
        await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 30000 });
    });

    test('deve validar o menu slash e inserção de blocos clínicos', async ({ page }) => {
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        await page.goto(`/session-evolution/${validApptId}`);

        await expect(page.locator('.lucide-loader-2')).toBeHidden({ timeout: 15000 });

        // Localiza o primeiro editor
        const editor = page.locator('.ProseMirror').first();
        await editor.click();

        // Testa menu Slash
        await editor.type('/');
        await expect(page.locator('text=Blocos Clínicos')).toBeVisible();
        await expect(page.locator('text=Procedimentos')).toBeVisible();
        await expect(page.locator('text=Exercícios')).toBeVisible();
        await expect(page.locator('text=Medições')).toBeVisible();

        // Insere Procedimentos
        await page.locator('text=Procedimentos').click();
        await expect(editor.locator('h3:has-text("Procedimentos")')).toBeVisible();
        await expect(editor.locator('ul li')).toBeVisible();

        // Testa search no menu
        await editor.type('/');
        await editor.type('exerc');
        await expect(page.locator('text=Exercícios para Casa')).toBeVisible();
        await page.keyboard.press('Enter');
        await expect(editor.locator('h3:has-text("Exercícios para Casa")')).toBeVisible();
    });

    test('deve validar o comando de Checklist e funcionamento dos marcadores', async ({ page }) => {
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        await page.goto(`/session-evolution/${validApptId}`);

        await expect(page.locator('.lucide-loader-2')).toBeHidden({ timeout: 15000 });

        const editor = page.locator('.ProseMirror').first();
        await editor.click();

        // Insere Checklist
        await editor.type('/Checklist');
        await page.keyboard.press('Enter');

        // Digita itens
        await editor.type('Tarefa 1');
        await page.keyboard.press('Enter');
        await editor.type('Tarefa 2');

        // Verifica se os checkboxes existem
        const checkboxes = editor.locator('input[type="checkbox"]');
        await expect(checkboxes).toHaveCount(2);

        // Marca a primeira tarefa
        await checkboxes.first().click();

        // Verifica se aplicou o estilo (line-through ou data-checked)
        const firstItem = editor.locator('li[data-type="taskItem"]').first();
        await expect(firstItem).toHaveAttribute('data-checked', 'true');

        // Verifica se o texto está riscado (via CSS class ou opacity conforme meu CSS)
        const p = firstItem.locator('div').first(); // No Tiptap TaskItem, o conteúdo fica em um div
        await expect(p).toHaveCSS('text-decoration-line', 'line-through');
    });
});
