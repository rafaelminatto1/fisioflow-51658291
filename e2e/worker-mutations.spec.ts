import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

/**
 * Worker Mutations E2E Tests
 * 
 * Verificação das rotas de mutação no Cloudflare Worker via UI.
 */

test.describe('Worker Mutations - CRUD Flows', () => {

    test.beforeEach(async ({ page }) => {
        // Habilitar logs para debug
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.text().includes('Auth')) {
                console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${msg.text()}`);
            }
        });

        page.on('request', request => {
            if (request.url().includes('/api/exercises') && request.method() === 'POST') {
                console.log(`[NETWORK REQUEST POST BODY]`, request.postData());
            }
        });

        page.on('response', async (response) => {
            if (!response.ok() && response.status() !== 200 && response.status() !== 204 && response.status() !== 302 && response.status() !== 304 && response.status() !== 201) {
                console.log(`[NETWORK ERROR] ${response.request().method()} ${response.url()} -> Status: ${response.status()}`);
            }
        });

        // Navegar diretamente para exercícios com e2e=true
        await page.goto('/exercises?e2e=true');

        // Esperar estabilização (especialmente para cookies cross-site do Neon Auth)
        await page.waitForTimeout(2000);

        // Se cair no login, algo falhou no global-setup ou o cookie foi rejeitado
        if (page.url().includes('/auth')) {
            console.error('❌ Falha: Redirecionado para auth. Verifique logs do browser acima.');
            await page.screenshot({ path: 'debug-auth-redirect.png', fullPage: true });
        }

        // Se cair na tela de erro "Algo deu errado"
        const errorDetailsBtn = page.locator('text=Ver detalhes do erro');
        if (await errorDetailsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.error('❌ Falha: Tela de erro detectada!');
            await errorDetailsBtn.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'debug-app-error-details.png', fullPage: true });

            // Tenta pegar o texto do erro
            const errorText = await page.locator('pre').textContent().catch(() => 'Texto do erro não encontrado');
            console.log(`[BROWSER ERROR DETAILS]: ${errorText}`);
        }

        await page.waitForSelector('h1:has-text("Biblioteca")', { timeout: 20000 });
    });

    test('Exercise CRUD Flow', async ({ page }) => {
        const exerciseName = `E2E Exercise ${Date.now()}`;
        const updatedName = `${exerciseName} Updated`;

        // 2. Create Exercise
        await page.getByRole('button', { name: /Novo Exercício/i }).click();

        // Aguarda modal
        await page.waitForSelector('h2:has-text("Novo Exercício")', { timeout: 5000 });

        await page.getByLabel(/Nome\*/i).fill(exerciseName);
        await page.getByPlaceholder(/Descrição do exercício/i).fill('Criado via auto-teste');
        await page.getByRole('button', { name: /Criar/i }).click();

        // 3. Verify Creation
        await expect(page.getByText(/sucesso/i).first()).toBeVisible();

        // Usar a busca para garantir que o exercício apareça na lista
        const searchInput = page.locator('input[placeholder*="Buscar exerc"], input[placeholder*="Pesquisar"]').first();
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(exerciseName);
        await page.keyboard.press('Enter');

        // Aguardar o item aparecer na lista filtrada
        await expect(page.getByText(exerciseName).first()).toBeVisible({ timeout: 10000 });

        // 4. Update Exercise
        // O card tem um overlay de "Visualizar" ao passar o mouse
        const exerciseCard = page.locator('div').filter({ hasText: exerciseName }).first();
        await exerciseCard.hover();

        // Clica no botão "Visualizar" ou na imagem de capa
        const viewButton = exerciseCard.getByRole('button', { name: /Visualizar/i });
        if (await viewButton.isVisible()) {
            await viewButton.click();
        } else {
            await exerciseCard.click();
        }

        // Aguarda a abertura do modal / folha lateral
        await page.waitForTimeout(1000); // Give sheet animation a moment

        // Esperar botão de editar que fica dentro do Slide-over/Dialog de detalhes
        const editButtonDialog = page.getByRole('button', { name: /Editar/i }).first();
        await editButtonDialog.click();

        await page.getByLabel(/Nome\*/i).fill(updatedName);
        await page.getByRole('button', { name: /Atualizar|Salvar/i }).click();

        // 5. Verify Update
        await expect(page.getByText(updatedName).first()).toBeVisible({ timeout: 10000 });

        // 6. Delete Exercise
        // Fechar o modal de edição atual se ainda estiver aberto (opcional)
        // Reabrir o card para deletar
        await exerciseCard.hover();
        if (await viewButton.isVisible()) await viewButton.click();
        await page.waitForTimeout(1000);

        await page.getByRole('button', { name: /Mais opções|Opções/i }).first().click().catch(() => {
            // Se não tiver botão de "mais", talvez esteja visível o excluir
        });

        // Tenta encontrar o botão Excluir (pode estar em dropdown ou detalhes)
        const deleteBtn = page.getByRole('button', { name: /Excluir/i }).first();
        await deleteBtn.click();

        // Confirma no modal de alerta se existir
        await page.waitForTimeout(500); // Wait for modal animation
        const confirmBtn = page.getByRole('button', { name: /Sim|Confirmar|Excluir/i }).last();
        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
        }

        // 7. Success Check
        await expect(page.locator('body')).not.toContainText(updatedName, { timeout: 10000 });
    });

    test('Session Template CRUD Flow', async ({ page }) => {
        const templateName = `E2E Template ${Date.now()}`;

        // 1. Navigate to Templates
        await page.goto('/exercises');
        await page.getByRole('tab', { name: /Templates/i }).click();

        // Aguardar o DOM e a aba do template renderizar completamente
        await page.waitForTimeout(1500);

        // 2. Create Template
        // Pode ser "Novo Template", "Novo", ou ícone de plus
        const newTemplateBtn = page.getByRole('button', { name: /Novo|Template|Adicionar/i }).last();
        await newTemplateBtn.click();

        // Modal wait
        await page.waitForSelector('text=Novo Template', { timeout: 5000 });
        await page.getByLabel(/Nome/i).first().fill(templateName);

        // Botão pode ser Criar ou Salvar
        await page.getByRole('button', { name: /Salvar|Criar/i }).first().click();

        // 3. Verify Template exists
        const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Pesquisar"]').first();
        if (await searchInput.isVisible()) {
            await searchInput.fill(templateName);
            await page.keyboard.press('Enter');
        }
        await expect(page.getByText(templateName).first()).toBeVisible({ timeout: 10000 });

        // 4. Delete Template
        // Busca o container do template para clicar no botão de exclusão correto
        const container = page.locator('div, section').filter({ hasText: templateName }).first();
        await container.getByRole('button').last().click(); // Assume ultimo botão é excluir/opções

        await page.getByRole('button', { name: /Excluir/i, exact: false }).first().click();

        // 5. Verify Deletion
        await expect(page.getByText(templateName)).not.toBeVisible();
    });
});
