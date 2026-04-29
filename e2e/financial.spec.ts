import { test, expect, type BrowserContext, type Page, type StorageState } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { getSharedAuthSession } from './helpers/neon-auth';

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;
const baseURL = process.env.BASE_URL || 'http://localhost:5173';
const neonAuthUrl = process.env.VITE_NEON_AUTH_URL || '';

async function dismissOnboardingIfPresent(page: Page) {
    const onboardingDialog = page
        .locator('[role="dialog"]')
        .filter({ has: page.getByText(/Bem-vindo ao FisioFlow/i) })
        .first();

    if (!(await onboardingDialog.isVisible({ timeout: 3000 }).catch(() => false))) {
        return;
    }

    const closeButton = onboardingDialog.getByRole('button', { name: /Close|Fechar/i }).first();
    if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click({ force: true });
    } else {
        await page.keyboard.press('Escape').catch(() => {});
    }

    await expect(onboardingDialog).toBeHidden({ timeout: 5000 });
}

async function createAuthenticatedStorageState(): Promise<StorageState> {
    if (!neonAuthUrl) {
        throw new Error('VITE_NEON_AUTH_URL ausente para o teste financeiro.');
    }

    const session = await getSharedAuthSession(loginEmail, loginPassword);
    return session.storageState;
}

async function openFinancialPage(page: Page) {
    await page.goto('/financial?e2e=true', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
}

test.describe('Fluxo Financeiro', () => {
    let context: BrowserContext;
    let page: Page;
    let authStorageState: StorageState;

    test.beforeAll(async () => {
        authStorageState = await createAuthenticatedStorageState();
    });

    test.beforeEach(async ({ browser }) => {
        context = await browser.newContext({
            baseURL,
            storageState: authStorageState,
        });
        page = await context.newPage();

        // Mock da camada financeira atual via Workers.
        await page.route(/\/api\/financial\/(?:transacoes|transactions)(?:\/[^/?#]+)?(?:\?.*)?$/i, async (route) => {
            const method = route.request().method();
            const url = route.request().url();

            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: [
                            { id: '1', descricao: 'Venda de Pacote Teste', valor: 500, status: 'concluido', tipo: 'receita', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                            { id: '2', descricao: 'Consulta Pendente', valor: 150, status: 'pendente', tipo: 'receita', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                        ]
                    })
                });
            } else if (method === 'PUT' && /\/api\/financial\/(?:transacoes|transactions)\/[^/?#]+/i.test(url)) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: { id: '2', descricao: 'Consulta Pendente', valor: 150, status: 'concluido', tipo: 'receita', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                    })
                });
            } else {
                await route.continue();
            }
        });

        await openFinancialPage(page);
        await dismissOnboardingIfPresent(page);
        await expect(page.getByRole('heading', { name: /Gestão Financeira/i })).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: /Exportar/i })).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('tab', { name: /Fluxo de Caixa/i })).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('tab', { name: /Resumo/i })).toBeVisible({ timeout: 15000 });
    });

    test.afterEach(async () => {
        await context.close();
    });

    test('Deve exibir o dashboard financeiro corretamente', async () => {
        await page.getByRole('tab', { name: /Faturamento/i }).click();
        await expect(page.getByText('Receita filtrada').first()).toBeVisible();
        await expect(page.getByRole('tab', { name: /Fluxo de Caixa/i }).first()).toBeVisible();
        await expect(page.getByText('Consulta Pendente')).toBeVisible();
    });

    test('Deve permitir baixar uma transação pendente', async () => {
        await page.getByRole('tab', { name: /Faturamento/i }).click();
        const updateResponse = page.waitForResponse((response) =>
            response.request().method() === 'PUT' &&
            /\/api\/financial\/(?:transacoes|transactions)\/[^/?#]+/i.test(response.url())
        );
        const pendingRow = page.locator('tr:has-text("Consulta Pendente")').first();
        const payButton = pendingRow.locator('button').nth(1);
        await payButton.evaluate((button: HTMLButtonElement) => button.click());
        const response = await updateResponse;

        expect(response.ok()).toBeTruthy();
    });

    test('Deve exibir botão de exportação', async () => {
        const exportBtn = page.getByText('Exportar').first();
        await expect(exportBtn).toBeVisible();
    });
});
