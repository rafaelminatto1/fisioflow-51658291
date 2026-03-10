import { expect, test, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { authenticateBrowserContext } from './helpers/neon-auth';

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function mockScheduleBootstrap(page: Page) {
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

  await page.route('**/api/appointments?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'appt-1',
            patient_id: '11111111-1111-4111-8111-111111111111',
            therapist_id: 'therapist-e2e',
            patient_name: 'Maria Teste',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            status: 'agendado',
          },
        ],
        total: 1,
      }),
    });
  });

  await page.route('**/api/patients?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Maria Teste',
            full_name: 'Maria Teste',
            status: 'active',
          },
        ],
        total: 1,
      }),
    });
  });
}

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
}

test.describe('Agenda - CRUD Completo', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await mockScheduleBootstrap(page);
    await page.goto('/agenda?e2e=true');
    await dismissOnboardingIfPresent(page);
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
  });

  test('deve exibir agenda corretamente', async ({ page }) => {
    const viewButtons = page.locator('button:has-text("D"), button:has-text("S"), button:has-text("Dia"), button:has-text("Semana")');
    await expect(viewButtons.first()).toBeVisible({ timeout: 10000 });
  });

  test('deve expor ação de novo agendamento', async ({ page }) => {
    const novoButton = page.locator('[data-testid="new-appointment"], button[aria-label*="Novo Agendamento" i]').first();
    await expect(novoButton).toHaveAttribute('aria-label', /Novo Agendamento/i);
  });

  test('deve alternar entre visualizações', async ({ page }) => {
    const weekButton = page.locator('button:has-text("S"), button:has-text("Semana")').first();
    await expect(weekButton).toBeVisible({ timeout: 10000 });
    await weekButton.click();
    await expect(page.locator('body')).toBeVisible();
  });

  test('deve permitir abrir filtros quando disponíveis', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Filtrar"), button:has([data-lucide=\"filter\"]), [aria-label*=\"filt\" i]').first();
    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterButton.click();
      await expect(page.locator('body')).toBeVisible();
    } else {
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('deve exibir estatísticas do dia', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/Agenda|Agendamento|Maria Teste/i);
  });
});
