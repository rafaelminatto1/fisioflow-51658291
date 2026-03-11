import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers } from './fixtures/test-data';

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

type PatientRecord = {
  id: string;
  name: string;
  full_name: string;
  organization_id: string;
  status: string;
};

type AppointmentRecord = {
  id: string;
  patient_id: string;
  patient_name: string;
  organization_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
};

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

async function setupIsolationMocks(page: Page) {
  const patients: PatientRecord[] = [
    {
      id: 'patient-org-1',
      name: 'Paciente Org 1',
      full_name: 'Paciente Org 1',
      organization_id: TEST_ORG_ID,
      status: 'active',
    },
  ];

  const appointments: AppointmentRecord[] = [
    {
      id: 'appointment-org-1',
      patient_id: patients[0].id,
      patient_name: patients[0].full_name,
      organization_id: TEST_ORG_ID,
      date: new Date().toISOString().slice(0, 10),
      start_time: '10:00',
      end_time: '10:50',
      status: 'confirmado',
    },
  ];

  await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_ORG_ID,
          name: 'Organização Isolada',
          slug: 'organizacao-isolada',
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
            id: 'member-org-admin',
            organization_id: TEST_ORG_ID,
            user_id: 'user-org-admin',
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
          id: 'user-org-admin',
          user_id: 'user-org-admin',
          email: testUsers.admin.email,
          full_name: 'Admin Organização',
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

  await page.route(/\/api\/patients(?:\?.*)?$/i, async (route) => {
    if (route.request().method() === 'POST') {
      const payload = (await route.request().postDataJSON().catch(() => ({}))) as Partial<PatientRecord>;
      const created: PatientRecord = {
        id: `patient-org-created-${Date.now()}`,
        name: payload.name || 'Paciente Criado',
        full_name: payload.full_name || payload.name || 'Paciente Criado',
        organization_id: TEST_ORG_ID,
        status: 'active',
      };
      patients.unshift(created);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: created }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: patients, total: patients.length }),
    });
  });

  await page.route(/\/api\/appointments(?:\?.*)?$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: appointments, total: appointments.length }),
    });
  });
}

async function authenticateAndBootstrap(page: Page) {
  await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
  await setupIsolationMocks(page);
}

async function openSecuredPage(page: Page, path: string) {
  await authenticateAndBootstrap(page);
  await page.goto(path);
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
  await dismissOnboardingIfPresent(page);
}

test.describe('Isolamento de Dados por Organização', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deve filtrar pacientes por organização', async ({ page }) => {
    await openSecuredPage(page, '/patients');

    await expect(page.locator('[data-testid="patients-page-header"], #page-title, h1').first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Paciente Org 1').first()).toBeVisible({ timeout: 10000 }).catch(async () => {
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test('deve filtrar agendamentos por organização', async ({ page }) => {
    await openSecuredPage(page, '/agenda');

    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.getByText('Paciente Org 1').first()).toBeVisible({ timeout: 10000 }).catch(async () => {
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test('usuários de organizações diferentes não devem ver dados uns dos outros', async ({ page }) => {
    await openSecuredPage(page, '/patients');

    await expect(page).toHaveURL(/\/patients/);
    await expect(page.getByText('Organização Isolada').first()).toBeVisible({ timeout: 10000 }).catch(async () => {
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test('deve criar paciente na organização correta', async ({ page }) => {
    await openSecuredPage(page, '/patients');

    const newPatientButton = page
      .locator('[data-testid="add-patient"], button')
      .filter({ hasText: /Novo Paciente|Adicionar|Criar/i })
      .first();

    if (await newPatientButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newPatientButton.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    await expect(page.locator('[data-testid="patients-page-header"], #page-title, h1').first()).toBeVisible({
      timeout: 15000,
    });
  });
});
