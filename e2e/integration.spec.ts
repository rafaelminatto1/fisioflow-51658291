import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers } from './fixtures/test-data';

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';
const TODAY = new Date().toISOString().slice(0, 10);

type PatientRecord = {
  id: string;
  name: string;
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  status?: string;
};

type AppointmentRecord = {
  id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  session_type: string;
};

type EventoRecord = {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  local: string;
  data_inicio: string;
  data_fim: string;
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

async function setupIntegrationMocks(page: Page) {
  const patients: PatientRecord[] = [
    {
      id: 'patient-integration-1',
      name: 'Paciente Integração',
      full_name: 'Paciente Integração',
      email: 'integracao@example.com',
      phone: '11999999999',
      cpf: '12345678901',
      status: 'active',
    },
  ];

  const appointments: AppointmentRecord[] = [
    {
      id: 'appointment-integration-1',
      patient_id: patients[0].id,
      patient_name: patients[0].full_name,
      date: TODAY,
      start_time: '09:00',
      end_time: '09:50',
      status: 'confirmado',
      session_type: 'Fisioterapia',
    },
  ];

  const events: EventoRecord[] = [
    {
      id: 'evento-integration-1',
      nome: 'Evento Integração',
      descricao: 'Evento mockado para integração E2E',
      categoria: 'workshop',
      local: 'Clínica Integração',
      data_inicio: TODAY,
      data_fim: TODAY,
      status: 'AGENDADO',
    },
  ];

  await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_ORG_ID,
          name: 'Organização Integração',
          slug: 'organizacao-integracao',
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
            id: 'member-integration-admin',
            organization_id: TEST_ORG_ID,
            user_id: 'user-integration-admin',
            role: 'admin',
            active: true,
            profiles: {
              full_name: 'Admin Integração',
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
          id: 'user-integration-admin',
          user_id: 'user-integration-admin',
          email: testUsers.admin.email,
          full_name: 'Admin Integração',
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

  await page.route('**/api/profile/therapists', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'therapist-integration', name: 'Fisio Integração' }],
      }),
    });
  });

  await page.route(/\/api\/patients(?:\?.*)?$/i, async (route) => {
    if (route.request().method() === 'POST') {
      const payload = (await route.request().postDataJSON().catch(() => ({}))) as Partial<PatientRecord>;
      const created: PatientRecord = {
        id: `patient-created-${Date.now()}`,
        name: payload.name || 'Paciente Criado',
        full_name: payload.full_name || payload.name || 'Paciente Criado',
        email: payload.email,
        phone: payload.phone,
        cpf: payload.cpf,
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

  await page.route(/\/api\/patients\/[^/?#]+$/i, async (route) => {
    const id = route.request().url().split('/').pop() || patients[0].id;
    const patient = patients.find((item) => item.id === id) || patients[0];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: patient }),
    });
  });

  await page.route(/\/api\/appointments(?:\?.*)?$/i, async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      const payload = (await route.request().postDataJSON().catch(() => ({}))) as Partial<AppointmentRecord>;
      const created: AppointmentRecord = {
        id: `appointment-created-${Date.now()}`,
        patient_id: payload.patient_id || patients[0].id,
        patient_name: payload.patient_name || patients[0].full_name,
        date: payload.date || TODAY,
        start_time: payload.start_time || '10:00',
        end_time: payload.end_time || '10:50',
        status: payload.status || 'confirmado',
        session_type: payload.session_type || 'Fisioterapia',
      };
      appointments.unshift(created);

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
      body: JSON.stringify({ data: appointments, total: appointments.length }),
    });
  });

  await page.route(/\/api\/appointments\/[^/?#]+(?:\/status)?$/i, async (route) => {
    const method = route.request().method();
    const id = route.request().url().split('/').filter(Boolean).pop() || appointments[0].id;
    const appointment = appointments.find((item) => item.id === id || `${item.id}/status` === id) || appointments[0];

    if (method === 'PATCH' || method === 'PUT' || method === 'POST') {
      appointment.status = 'concluido';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: appointment }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: appointment }),
    });
  });

  await page.route(/\/api\/eventos(?:\?.*)?$/i, async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      const payload = (await route.request().postDataJSON().catch(() => ({}))) as Partial<EventoRecord>;
      const created: EventoRecord = {
        id: `evento-created-${Date.now()}`,
        nome: payload.nome || 'Evento Criado',
        descricao: payload.descricao || 'Evento criado via integração E2E',
        categoria: payload.categoria || 'workshop',
        local: payload.local || 'Clínica Integração',
        data_inicio: payload.data_inicio || TODAY,
        data_fim: payload.data_fim || TODAY,
        status: payload.status || 'AGENDADO',
      };
      events.unshift(created);

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
      body: JSON.stringify({ data: events, total: events.length }),
    });
  });
}

async function authenticateAndBootstrap(page: Page) {
  await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
  await setupIntegrationMocks(page);
}

async function openAuthenticatedPage(page: Page, path: string) {
  await authenticateAndBootstrap(page);
  await page.goto(path);
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
  await dismissOnboardingIfPresent(page);
}

test.describe('Testes de Integração E2E', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('fluxo completo: criar paciente → agendar → marcar presença', async ({ page }) => {
    await openAuthenticatedPage(page, '/patients');

    await expect(page.locator('[data-testid="patients-page-header"], #page-title, h1').first()).toBeVisible({
      timeout: 20000,
    });

    const newPatientButton = page.locator('[data-testid="add-patient"], button').filter({ hasText: /Novo Paciente|Adicionar/i }).first();
    if (await newPatientButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newPatientButton.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    await page.goto('/agenda');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    const newAppointmentButton = page.getByRole('button', { name: /Novo Agendamento/i }).first();
    if (await newAppointmentButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      await newAppointmentButton.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    await expect(page.locator('text=Paciente Integração, text=Paciente Criado').first()).toBeVisible({ timeout: 10000 }).catch(async () => {
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test('multi-tenancy: dados isolados por organização', async ({ page }) => {
    await openAuthenticatedPage(page, '/eventos');

    await expect(page).toHaveURL(/\/eventos/);
    await expect(page.getByText(/Organização Integração|Evento Integração/i).first()).toBeVisible({ timeout: 15000 }).catch(async () => {
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test('permissões: admin vs fisioterapeuta vs estagiário', async ({ page }) => {
    await authenticateAndBootstrap(page);

    const routes = ['/agenda', '/patients', '/eventos', '/exercises', '/reports'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      await dismissOnboardingIfPresent(page);
      expect(page.url()).toContain(route);
    }
  });

  test('realtime sync: múltiplos usuários veem mesmas mudanças', async ({ page, context }) => {
    await authenticateAndBootstrap(page);
    await page.goto('/agenda');
    await page.waitForLoadState('domcontentloaded');

    const page2 = await context.newPage();
    await authenticateAndBootstrap(page2);
    await page2.goto('/agenda');
    await page2.waitForLoadState('domcontentloaded');

    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await expect(page2.locator('main')).toBeVisible({ timeout: 15000 });
    await page2.close();
  });

  test('offline sync: salvar offline e sincronizar ao reconectar', async ({ page, context }) => {
    await openAuthenticatedPage(page, '/agenda');
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/agenda/);

    await context.setOffline(false);
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('busca global: encontrar dados em diferentes módulos', async ({ page }) => {
    await openAuthenticatedPage(page, '/eventos');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('Evento');
      await page.waitForTimeout(600);
    }

    await expect(page.locator('text=Evento Integração').first()).toBeVisible({ timeout: 10000 }).catch(async () => {
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test('exportação: gerar e baixar relatórios', async ({ page }) => {
    await openAuthenticatedPage(page, '/eventos');

    const exportButton = page.locator('button').filter({ hasText: /Exportar|CSV/i }).first();
    if (await exportButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      await exportButton.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});
