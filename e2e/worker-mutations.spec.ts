import { test, expect, type Page } from '@playwright/test';

/**
 * Worker Mutations E2E Tests
 * 
 * Verificação das rotas de mutação no Cloudflare Worker via UI.
 * Aponta para o Worker de produção (VITE_WORKERS_API_URL no .env.local).
 */

test.describe('Worker Mutations - CRUD Flows', () => {
    async function pollEntityId(page: Page, endpoint: string, name: string): Promise<string> {
        let entityId: string | null = null;

        await expect.poll(async () => {
            const listResponse = await page.request.get(`${endpoint}?q=${encodeURIComponent(name)}&limit=50`);
            if (!listResponse.ok()) return null;

            const payload = await listResponse.json();
            const item = (payload?.data ?? []).find((row: any) => {
                const rowName = typeof row?.name === 'string' ? row.name : '';
                return rowName === name || rowName.includes(name);
            });

            entityId = item?.id ?? null;
            return entityId;
        }, { timeout: 20000 }).not.toBeNull();

        if (!entityId) {
            throw new Error(`Entidade "${name}" não encontrada em ${endpoint}`);
        }

        return entityId;
    }

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.text().includes('Auth') || msg.text().includes('401')) {
                console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${msg.text()}`);
            }
        });

        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/') && !response.ok()) {
                console.log(`[NETWORK ERROR] ${response.request().method()} ${url} -> Status: ${response.status()}`);
            }
        });

        // Navigate to exercises
        await page.goto('/exercises');

        // Wait for auth + hydration
        await expect(page.getByText('Biblioteca de Exercícios')).toBeVisible({ timeout: 20000 });

        // Wait for exercises to finish loading
        await page.waitForFunction(() => {
            const skeletons = document.querySelectorAll('[data-skeleton], .animate-pulse');
            return skeletons.length === 0;
        }, { timeout: 15000 }).catch(() => {});
    });

    test('Exercise CRUD Flow', async ({ page }) => {
        const exerciseName = `E2E Exercicio ${Date.now()}`;
        
        // Create
        await page.getByRole('button', { name: 'Novo Exercício' }).click();
        await page.getByLabel('Nome*').fill(exerciseName);
        await page.getByPlaceholder('Descrição do exercício').fill('Descrição do exercício E2E');
        await page.getByRole('button', { name: 'Criar' }).click();

        await expect(page.getByText('Exercício criado com sucesso')).toBeVisible();

        const updatedName = `${exerciseName} UPDATED`;
        const exerciseId = await pollEntityId(page, '/api/exercises', exerciseName);

        // Update via Worker API (authenticated context)
        const updateResponse = await page.request.put(`/api/exercises/${exerciseId}`, {
            data: { name: updatedName },
        });
        expect(updateResponse.ok()).toBeTruthy();
        await pollEntityId(page, '/api/exercises', updatedName);

        // Delete via Worker API
        const deleteResponse = await page.request.delete(`/api/exercises/${exerciseId}`);
        expect(deleteResponse.ok()).toBeTruthy();

        await expect.poll(async () => {
            const listResponse = await page.request.get(`/api/exercises?q=${encodeURIComponent(updatedName)}&limit=50`);
            if (!listResponse.ok()) return 0;
            const payload = await listResponse.json();
            return (payload?.data ?? []).filter((row: any) => row?.id === exerciseId).length;
        }, { timeout: 20000 }).toBe(0);
    });

    test('Session Template CRUD Flow', async ({ page }) => {
        const templateName = `E2E Template ${Date.now()}`;
        
        await page.getByRole('tab', { name: 'Templates' }).click();
        await expect(page.getByRole('button', { name: 'Novo Template' })).toBeVisible({ timeout: 15000 });

        // Create
        await page.getByRole('button', { name: 'Novo Template' }).click();
        const createDialog = page.getByRole('dialog').last();
        await expect(createDialog.getByText('Novo Template de Exercícios')).toBeVisible({ timeout: 10000 });
        await createDialog.getByRole('combobox').nth(1).click();
        await page.getByRole('option', { name: 'Lombalgia' }).click();
        await createDialog.getByPlaceholder('Ex: Protocolo Conservador').fill(templateName);
        await createDialog.getByRole('button', { name: 'Criar' }).click();
        
        await expect(page.getByText('Template criado com sucesso')).toBeVisible();
        
        // Verify with Search
        const searchInput = page.getByPlaceholder('Buscar templates...');
        await searchInput.fill(templateName);
        const templateId = await pollEntityId(page, '/api/templates', templateName);

        // Delete via Worker API
        const deleteResponse = await page.request.delete(`/api/templates/${templateId}`);
        expect(deleteResponse.ok()).toBeTruthy();

        await expect.poll(async () => {
            const listResponse = await page.request.get(`/api/templates?q=${encodeURIComponent(templateName)}&limit=50`);
            if (!listResponse.ok()) return 0;
            const payload = await listResponse.json();
            return (payload?.data ?? []).filter((row: any) => row?.id === templateId).length;
        }, { timeout: 20000 }).toBe(0);
    });

    test('Exercise Protocol CRUD Flow', async ({ page }) => {
        const protocolName = `E2E Protocolo ${Date.now()}`;
        
        await page.getByRole('tab', { name: 'Protocolos' }).click();
        await expect(page.getByRole('button', { name: 'Novo Protocolo' })).toBeVisible({ timeout: 15000 });

        // Create
        await page.getByRole('button', { name: 'Novo Protocolo' }).click();
        const createDialog = page.getByRole('dialog').last();
        await expect(createDialog.getByText('Novo Protocolo')).toBeVisible({ timeout: 10000 });
        await createDialog.getByRole('combobox').nth(1).click();
        await expect(page.getByRole('option').first()).toBeVisible({ timeout: 10000 });
        await page.getByRole('option').first().click();
        await createDialog.getByPlaceholder('Ex: Protocolo Padrão - Fase 1 a 4').fill(protocolName);
        await createDialog.getByRole('button', { name: 'Criar Protocolo' }).click();
        
        await expect(page.getByText('Protocolo criado com sucesso')).toBeVisible();
        
        // Verify with Search
        const searchInput = page.getByPlaceholder('Buscar protocolos...');
        await searchInput.fill(protocolName);
        const protocolId = await pollEntityId(page, '/api/protocols', protocolName);

        // Delete via Worker API
        const deleteResponse = await page.request.delete(`/api/protocols/${protocolId}`);
        expect(deleteResponse.ok()).toBeTruthy();

        await expect.poll(async () => {
            const listResponse = await page.request.get(`/api/protocols?q=${encodeURIComponent(protocolName)}&limit=50`);
            if (!listResponse.ok()) return 0;
            const payload = await listResponse.json();
            return (payload?.data ?? []).filter((row: any) => row?.id === protocolId).length;
        }, { timeout: 20000 }).toBe(0);
    });
});
