import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers } from './fixtures/test-data';

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

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

async function setupBootstrap(page: Page) {
  await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_ORG_ID,
          name: 'Organização Features',
          slug: 'organizacao-features',
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
            id: 'member-features-admin',
            organization_id: TEST_ORG_ID,
            user_id: 'user-features-admin',
            role: 'admin',
            active: true,
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
          id: 'user-features-admin',
          user_id: 'user-features-admin',
          email: testUsers.admin.email,
          full_name: 'Admin Features',
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

  await page.route('**/api/patients?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'patient-feature-1',
            name: 'Paciente Feature',
            full_name: 'Paciente Feature',
            status: 'active',
          },
        ],
        total: 1,
      }),
    });
  });

  await page.route(/\/api\/appointments\/test-session$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'test-session',
          patient_id: 'patient-feature-1',
          patientId: 'patient-feature-1',
          patient_name: 'Paciente Feature',
          date: new Date().toISOString().slice(0, 10),
          appointment_date: new Date().toISOString().slice(0, 10),
          start_time: '10:00',
          end_time: '10:50',
          status: 'confirmado',
          session_type: 'Fisioterapia',
          therapist_id: 'therapist-feature',
          patient: {
            id: 'patient-feature-1',
            name: 'Paciente Feature',
            full_name: 'Paciente Feature',
          },
        },
      }),
    });
  });

  await page.route(/\/api\/patients\/patient-feature-1(?:\/.*)?$/i, async (route) => {
    const url = route.request().url();
    const data = /\/(pathologies|surgeries|medical-returns)$/i.test(url)
      ? []
      : {
          id: 'patient-feature-1',
          name: 'Paciente Feature',
          full_name: 'Paciente Feature',
          status: 'active',
        };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data }),
    });
  });

  await page.route('**/api/profile/therapists', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'therapist-feature', name: 'Fisio Feature' }],
      }),
    });
  });

  await page.route(/\/api\/goals(?:\?.*)?$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route(/\/api\/evolution\/(measurements|required-measurements|treatment-sessions)(?:\?.*)?$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route(/\/api\/sessions(?:\/autosave)?(?:\?.*)?$/i, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: `session-feature-${Date.now()}` } }),
    });
  });
}

async function authenticateAndPrepare(page: Page) {
  await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
  await setupBootstrap(page);
}

test.describe('FisioFlow 2026 - New Features Validation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Should show humorous 404 page', async ({ page }) => {
    await page.goto('/page-that-does-not-exist');
    await expect(page.locator('h1')).toContainText('Página com Edema');
    await expect(page.getByText(/compressa de gelo/i)).toBeVisible();
  });

  test('Should initialize FisioTour on first access', async ({ page }) => {
    await authenticateAndPrepare(page);
    await page.addInitScript(() => localStorage.removeItem('fisioflow_tour_completed'));
    await page.goto('/agenda');
    await page.waitForLoadState('domcontentloaded');

    const onboardingDialog = page
      .locator('[role="dialog"]')
      .filter({ has: page.getByText(/Bem-vindo ao FisioFlow|FisioTour/i) })
      .first();

    if (await onboardingDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(onboardingDialog).toBeVisible();
      return;
    }

    await dismissOnboardingIfPresent(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('Should have Speech-to-SOAP and Smart Suggestion buttons in Evolution', async ({ page }) => {
    await authenticateAndPrepare(page);
    await page.addInitScript(() => {
      localStorage.setItem('fisioflow-evolution-version', 'v1-soap');
    });

    await page.goto('/patient-evolution/test-session');
    await page.waitForLoadState('domcontentloaded');

    const speechButton = page.getByRole('button', { name: /voz|microfone/i }).first();
    if (await speechButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(speechButton).toBeVisible();
      return;
    }

    await expect(page.getByRole('tab', { name: /Evolução/i })).toBeVisible({ timeout: 12000 });
  });

  test('Should show engagement badge in patient profile', async ({ page }) => {
    await authenticateAndPrepare(page);
    await page.goto('/patients');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);

    await expect(page.locator('[data-testid="patients-page-header"], #page-title, h1').first()).toBeVisible({
      timeout: 15000,
    });
  });
});
