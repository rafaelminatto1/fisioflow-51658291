import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers } from './fixtures/test-data';

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

async function dismissOnboardingIfPresent(page: Page) {
  const onboardingDialog = page
    .locator('[role="dialog"]')
    .filter({ has: page.getByText(/Bem-vindo ao FisioFlow/i) })
    .first();

  if (!(await onboardingDialog.isVisible({ timeout: 2500 }).catch(() => false))) {
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

async function setupExercisesPageBootstrap(page: Page) {
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
            profiles: {
              full_name: 'Admin E2E',
              email: testUsers.admin.email,
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
          email: testUsers.admin.email,
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/audit-logs?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/exercises?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'exercise-seed-1',
            name: 'Ponte de Glúteos',
            description: 'Exercício base para lombar',
            categoryId: 'Fortalecimento',
            difficulty: 'Iniciante',
            musclesPrimary: ['Glúteos'],
            equipment: [],
            bodyParts: ['Quadril'],
            durationSeconds: 30,
          },
        ],
        total: 1,
      }),
    });
  });

  await page.route('**/api/exercise-templates?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'template-seed-1',
            name: 'Template Lombar Base',
            description: 'Template inicial',
            category: 'patologia',
            conditionName: 'Lombalgia',
            templateVariant: 'base',
            items: [],
          },
        ],
        total: 1,
      }),
    });
  });

  await page.route('**/api/protocols?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'protocol-seed-1',
            name: 'Protocolo Lombalgia Inicial',
            conditionName: 'Lombalgia',
            protocolType: 'patologia',
            evidenceLevel: 'B',
            weeksTotal: 6,
            milestones: [],
            restrictions: [],
            progressionCriteria: [],
          },
        ],
        total: 1,
      }),
    });
  });
}

test.describe('Exercises Page Setup and Navigation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupExercisesPageBootstrap(page);
    await page.goto('/exercises?e2e=true');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
    await expect(page.getByText('Biblioteca de Exercícios')).toBeVisible({ timeout: 25000 });
  });

  test('Verify Tabs and Initial State', async ({ page }) => {
    const libraryTab = page.getByTestId('tab-library');
    const templatesTab = page.getByTestId('tab-templates');
    const protocolsTab = page.getByTestId('tab-protocols');

    await expect(libraryTab).toHaveAttribute('data-state', 'active');
    await expect(page.getByRole('button', { name: /Novo Exercício/i })).toBeVisible({ timeout: 10000 });

    await templatesTab.scrollIntoViewIfNeeded();
    await templatesTab.click({ force: true });
    await expect(templatesTab).toHaveAttribute('data-state', 'active', { timeout: 10000 });
    await expect(page.getByText('Biblioteca de Exercícios')).toBeVisible({ timeout: 10000 });

    await protocolsTab.scrollIntoViewIfNeeded();
    await protocolsTab.click({ force: true });
    await expect(protocolsTab).toHaveAttribute('data-state', 'active', { timeout: 10000 });
    await expect(page.getByText('Biblioteca de Exercícios')).toBeVisible({ timeout: 10000 });
  });
});
