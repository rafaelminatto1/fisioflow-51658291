import { expect, test, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { authenticateBrowserContext } from './helpers/neon-auth';

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function dismissOnboardingIfPresent(page: Page) {
  const onboardingDialog = page
    .locator('[role="dialog"]')
    .filter({ has: page.getByText(/Bem-vindo ao FisioFlow/i) })
    .first();

  if (!(await onboardingDialog.isVisible({ timeout: 2000 }).catch(() => false))) return;

  const closeButton = onboardingDialog.getByRole('button', { name: /Close|Fechar/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ force: true });
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }

  await expect(onboardingDialog).toBeHidden({ timeout: 5000 });
}

async function mockDashboardBootstrap(page: Page) {
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
            profiles: { full_name: 'Admin E2E', email: 'admin@e2e.local' },
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

  for (const endpoint of ['notifications', 'audit-logs']) {
    await page.route(`**/api/${endpoint}?**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
  }

  await page.route('**/api/dashboard/metrics?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          patients: 42,
          appointments: 18,
          revenue: 12500,
          occupancy: 78,
        },
      }),
    });
  });
}

test.describe('Dashboard - Funcionalidades', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await mockDashboardBootstrap(page);
    await page.goto('/dashboard?e2e=true');
    await dismissOnboardingIfPresent(page);
    await expect(page.locator('[data-testid="dashboard-page"]').first()).toBeVisible({ timeout: 20000 });
  });

  test('deve exibir dashboard admin', async ({ page }) => {
    await expect(page.locator('[data-testid="dashboard-page"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-header"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-welcome-text"]').first()).toContainText(/Olá/i);
  });

  test('deve expor navegação para agenda', async ({ page }) => {
    const agendaLink = page.locator('a[href="/agenda"], a[href="/"], a:has-text("Agenda")').first();
    await expect(agendaLink).toHaveAttribute('href', /\/agenda|\/$/);
    await page.goto('/agenda?e2e=true');
    await expect(page).toHaveURL(/\/agenda/);
  });

  test('deve exibir estatísticas principais', async ({ page }) => {
    await expect(page.getByText(/Dashboard Elite/i)).toBeVisible();
    await expect(page.getByText(/Filtrar Visualização/i)).toBeVisible();
  });

  test('deve exibir gráficos quando disponíveis', async ({ page }) => {
    await expect(page.locator('canvas, svg').first()).toBeVisible({ timeout: 15000 });
  });
});
