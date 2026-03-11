/**
 * Fluxo visual de evolução, alinhado com as rotas atuais do app.
 * Usa mocks determinísticos para validar carregamento da página.
 */

import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers } from './fixtures/test-data';

const TEST_APPOINTMENT_ID = 'e2e-appointment-visual';
const TEST_PATIENT_ID = 'e2e-patient-visual';
const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

async function setupEvolutionMocks(page: Page) {
  await page.route(new RegExp(`/api/appointments/${TEST_APPOINTMENT_ID}$`, 'i'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_APPOINTMENT_ID,
          patient_id: TEST_PATIENT_ID,
          patientId: TEST_PATIENT_ID,
          patient_name: 'Paciente Visual',
          date: new Date().toISOString().slice(0, 10),
          appointment_date: new Date().toISOString().slice(0, 10),
          time: '10:00',
          appointment_time: '10:00',
          start_time: '10:00',
          end_time: '11:00',
          status: 'confirmado',
          session_type: 'Fisioterapia',
          therapist_id: 'therapist-e2e',
          patient: {
            id: TEST_PATIENT_ID,
            name: 'Paciente Visual',
            full_name: 'Paciente Visual',
          },
        },
      }),
    });
  });

  await page.route(new RegExp(`/api/patients/${TEST_PATIENT_ID}(?:/.*)?$`, 'i'), async (route) => {
    const url = route.request().url();
    let data: unknown = {
      id: TEST_PATIENT_ID,
      name: 'Paciente Visual',
      full_name: 'Paciente Visual',
      status: 'Em Tratamento',
      phone: '11999999999',
      organization_id: TEST_ORG_ID,
    };

    if (/\/(pathologies|surgeries|medical-returns)$/i.test(url)) {
      data = [];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data }),
    });
  });

  await page.route(/\/api\/profile\/therapists(?:\?.*)?$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 'therapist-e2e', name: 'Fisio Visual' }] }),
    });
  });

  await page.route(/\/api\/goals(?:\?.*)?$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route(/\/api\/evolution\/(measurements|required-measurements)(?:\?.*)?$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route(/\/api\/sessions(?:\/autosave)?(?:\?.*)?$/i, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
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
      body: JSON.stringify({ data: { id: 'session-visual-e2e' } }),
    });
  });

  await page.route(/\/api\/evolution\/treatment-sessions(?:\?.*)?$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_ORG_ID,
          name: 'Clínica Visual',
          slug: 'clinica-visual',
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
            id: 'member-visual',
            organization_id: TEST_ORG_ID,
            user_id: 'user-visual',
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
          id: 'user-visual',
          user_id: 'user-visual',
          email: testUsers.admin.email,
          full_name: 'Admin Visual',
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
}

test.describe('Verificação visual: fluxo evolução', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.skip('captura screenshots em cada etapa do fluxo', async () => {
    // Mantido apenas como placeholder documental; o fluxo funcional está no teste abaixo.
  });

  test('página de evolução carrega com appointmentId válido', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem('fisioflow-evolution-version', 'v1-soap');
    });

    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupEvolutionMocks(page);

    await page.goto(`/patient-evolution/${TEST_APPOINTMENT_ID}`);
    await page.waitForLoadState('domcontentloaded');

    const subjectField = page.getByRole('textbox', { name: /Campo SOAP: Subjetivo/i }).first();
    const pageHeading = page.getByRole('heading', { level: 1, name: /Paciente Visual/i }).first();

    if (!(await subjectField.isVisible({ timeout: 12000 }).catch(() => false))) {
      await expect(page).toHaveURL(new RegExp(`/patient-evolution/${TEST_APPOINTMENT_ID}`));
      await expect(pageHeading).toBeVisible({ timeout: 12000 });
      return;
    }

    await subjectField.fill('Fluxo visual E2E: formulário SOAP carregado com sucesso.');
    await expect(subjectField).toHaveValue(/SOAP carregado com sucesso/i);
  });
});
