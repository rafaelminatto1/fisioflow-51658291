import { test, expect } from '@playwright/test';

test.describe('Validation - Exercícios: Biblioteca e Autocomplete Robustos', () => {
    test.beforeEach(async ({ page }) => {
        // --- MOCKS SETUP ---
        const validUserId = '123e4567-e89b-12d3-a456-426614174000';
        const validPatientId = '123e4567-e89b-12d3-a456-426614174001';
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        const validOrgId = '123e4567-e89b-12d3-a456-426614174003';

        const mockExercises = [
            { id: 'ex-1', name: 'Agachamento Gato-Camelo', category: 'Mobilidade', image_url: '' },
            { id: 'ex-2', name: 'Alongamento de Isquiotibiais', category: 'Mobilidade', image_url: '' },
            { id: 'ex-3', name: 'Ponte Unipodal', category: 'Estabilidade', image_url: '' }
        ];

        await page.route('**/rest/v1/exercises*', async route => {
            await route.fulfill({ json: mockExercises, headers: { 'content-range': '0-2/3' } });
        });

        await page.route('**/appointmentServiceHttp*', async route => {
            await route.fulfill({
                json: {
                    data: {
                        id: validApptId, patientId: validPatientId, therapist_id: validUserId,
                        date: new Date().toISOString().split('T')[0], startTime: '10:00',
                        notes: JSON.stringify({ soap: { subjective: '', objective: '', assessment: '', plan: '' }, exercises: [] })
                    }
                }
            });
        });

        await page.route('**/rest/v1/patients*', async route => {
            await route.fulfill({ json: [{ id: validPatientId, name: 'Paciente Teste', email: 'teste@teste.com' }] });
        });

        await page.route('**/rest/v1/profiles*', async route => {
            await route.fulfill({ json: [{ id: validUserId, organization_id: validOrgId, role: 'therapist', full_name: 'Rafael Minatto' }] });
        });

        await page.route('**/getProfile*', async route => {
            await route.fulfill({ json: { data: { id: validUserId, organization_id: validOrgId, role: 'therapist' } } });
        });

        await page.route('**/auth/v1/token?*', async route => route.fulfill({ json: { access_token: 'fake', user: { id: validUserId } } }));
        await page.route('**/auth/v1/user*', async route => route.fulfill({ json: { id: validUserId } }));

        await page.route('**/firestore.googleapis.com/**', async route => route.abort('failed'));

        // Navigation
        await page.goto('/auth');
        await page.fill('#login-email', 'rafael.minatto@yahoo.com.br');
        await page.fill('#login-password', 'Yukari30@');
        await page.click('button:has-text("Acessar Minha Conta")');
        await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 30000 });
    });

    test('deve sugerir exercício ao digitar camelo e substituir na mesma linha', async ({ page }) => {
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        await page.goto(`/session-evolution/${validApptId}`);
        
        const editor = page.locator('.ProseMirror').last(); // Usually evolutionText is the last one
        await expect(editor).toBeVisible({ timeout: 30000 });
        await editor.click();

        // Limpa conteúdo inicial se houver
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');

        // Cria um checklist
        await editor.type('/Checklist');
        await page.keyboard.press('Enter');

        // Digita "camelo"
        await editor.type('camelo');

        // Verifica se a lista de sugestões aparece
        const suggestionList = page.locator('text=Sugestões de Exercícios');
        await expect(suggestionList).toBeVisible({ timeout: 10000 });
        
        // Seleciona a sugestão via Enter
        await page.keyboard.press('Enter');

        // Verifica se o texto foi completado na mesma linha (sem criar subitem)
        const taskItem = editor.locator('.notion-task-item');
        await expect(taskItem).toHaveCount(1);
        await expect(taskItem).toContainText('Agachamento Gato-Camelo — 3x10 rep');
        
        // Verifica se não há itens aninhados
        await expect(taskItem.locator('.notion-task-item')).toHaveCount(0);
    });

    test('deve abrir biblioteca e substituir texto da linha atual ao selecionar', async ({ page }) => {
        const validApptId = '123e4567-e89b-12d3-a456-426614174002';
        await page.goto(`/session-evolution/${validApptId}`);
        
        const editor = page.locator('.ProseMirror').last();
        await expect(editor).toBeVisible({ timeout: 30000 });
        await editor.click();

        // Cria um checklist com texto
        await editor.type('/Checklist');
        await page.keyboard.press('Enter');
        await editor.type('texto para substituir');

        // Clica no botão BIBLIOTECA da linha
        const taskItem = editor.locator('.notion-task-item').first();
        await taskItem.hover();
        const libButton = taskItem.locator('button:has-text("BIBLIOTECA")');
        await libButton.click();

        // Verifica modal centralizado (Dialog)
        const modal = page.locator('role=dialog');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Biblioteca de Exercícios');

        // Seleciona um exercício
        await page.locator('text=Alongamento de Isquiotibiais').click();

        // Verifica se o texto original foi substituído pelo exercício na mesma linha
        await expect(taskItem).toContainText('Alongamento de Isquiotibiais — 3x10 rep');
        await expect(taskItem).not.toContainText('texto para substituir');
        
        // Verifica que não criou item aninhado
        await expect(taskItem.locator('.notion-task-item')).toHaveCount(0);
    });
});
