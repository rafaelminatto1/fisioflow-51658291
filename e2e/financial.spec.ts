import { test, expect, type BrowserContext, type Page, type StorageState } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { getSharedAuthSession } from './helpers/neon-auth';

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';
const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;
const baseURL = process.env.BASE_URL || 'http://localhost:5173';
const neonAuthUrl = process.env.VITE_NEON_AUTH_URL || '';

async function mockOrganizationBootstrap(page: Page) {
    await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                data: {
                    id: TEST_ORG_ID,
                    name: 'Organização E2E',
                    slug: 'organizacao-e2e',
                    settings: {},
                    active: true,
                },
            }),
        });
    });

    await page.route('**/api/organization-members?**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                data: [
                    {
                        id: 'member-e2e-admin',
                        organization_id: TEST_ORG_ID,
                        user_id: 'user-e2e-admin',
                        role: 'admin',
                        active: true,
                        joined_at: new Date().toISOString(),
                        profiles: {
                            full_name: 'Admin E2E',
                            email: 'admin@e2e.local',
                        },
                    },
                ],
                total: 1,
            }),
        });
    });

    await page.route('**/api/profile/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                data: {
                    id: 'user-e2e-admin',
                    user_id: 'user-e2e-admin',
                    email: 'admin@e2e.local',
                    full_name: 'Admin E2E',
                    role: 'admin',
                    organization_id: TEST_ORG_ID,
                    organizationId: TEST_ORG_ID,
                    email_verified: true,
                },
            }),
        });
    });

    await page.route('**/api/notifications?**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
        });
    });

    await page.route('**/api/audit-logs?**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
        });
    });
}

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
        await page.route(/\/api\/financial\/transacoes(?:\/[^/?#]+)?(?:\?.*)?$/i, async (route) => {
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
            } else if (method === 'PUT' && /\/api\/financial\/transacoes\/[^/?#]+/i.test(url)) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: { id: '2', descricao: 'Consulta Pendente', valor: 150, status: 'pago', tipo: 'receita', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
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
        await expect(page.getByRole('heading', { name: /Fluxo de Caixa/i })).toBeVisible({ timeout: 15000 });
    });

    test.afterEach(async () => {
        await context.close();
    });

    test('Deve exibir o dashboard financeiro corretamente', async () => {
        await expect(page.getByText('Receita Total').first()).toBeVisible();
        await expect(page.getByText('Fluxo de Caixa').first()).toBeVisible();
        await expect(page.getByText('Consulta Pendente')).toBeVisible();
        await expect(page.getByText(/\+\sR\$\s?150/)).toBeVisible();
    });

    test('Deve permitir baixar uma transação pendente', async () => {
        const updateResponse = page.waitForResponse((response) =>
            response.request().method() === 'PUT' &&
            /\/api\/financial\/transacoes\/[^/?#]+/i.test(response.url())
        );
        const payButton = page.locator('tr:has-text("Consulta Pendente") button').first();
        await payButton.evaluate((button: HTMLButtonElement) => button.click());
        await updateResponse;

        await expect(page.getByText('Transação marcada como paga')).toBeVisible();
    });

    test('Deve exibir botão de exportação', async () => {
        const exportBtn = page.getByText('Exportar').first();
        await expect(exportBtn).toBeVisible();
    });
});
