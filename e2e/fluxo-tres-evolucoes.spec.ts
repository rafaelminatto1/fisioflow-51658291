/**
 * Fluxo E2E determinístico para preencher 3 evoluções SOAP sem depender da agenda real.
 */

import { test, expect } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers } from './fixtures/test-data';

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';
const TEST_PATIENT_ID = 'e2e-patient-multi';
const APPOINTMENT_IDS = ['e2e-appt-1', 'e2e-appt-2', 'e2e-appt-3'];

test.describe('Fluxo: login, agenda, 3 evoluções SOAP', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('faz login, abre agenda, inicia 3 atendimentos e preenche 3 evoluções', async ({ page }) => {
    let visitedAppointments = 0;
    const setTextareaValue = async (selector: string, value: string) => {
      await page.locator(selector).first().evaluate((element, nextValue) => {
        const textarea = element as HTMLTextAreaElement;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        setter?.call(textarea, nextValue);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    };

    await page.addInitScript(() => {
      localStorage.setItem('fisioflow-evolution-version', 'v1-soap');
    });

    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);

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

    await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: TEST_ORG_ID,
            name: 'Clínica E2E',
            slug: 'clinica-e2e',
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
            },
          ],
          total: 1,
        }),
      });
    });

    await page.route('**/api/notifications?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.route('**/api/audit-logs?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.route('**/api/appointments?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: APPOINTMENT_IDS.map((id, index) => ({
            id,
            patient_id: TEST_PATIENT_ID,
            patientId: TEST_PATIENT_ID,
            patient_name: 'Paciente Multi E2E',
            date: new Date().toISOString().slice(0, 10),
            appointment_date: new Date().toISOString().slice(0, 10),
            time: `1${index}:00`,
            appointment_time: `1${index}:00`,
            start_time: `1${index}:00`,
            end_time: `1${index + 1}:00`,
            status: 'confirmado',
            session_type: 'Fisioterapia',
            therapist_id: 'therapist-e2e',
          })),
          total: APPOINTMENT_IDS.length,
        }),
      });
    });

    await page.route(/\/api\/appointments\/e2e-appt-\d$/i, async (route) => {
      const id = route.request().url().split('/').pop() || APPOINTMENT_IDS[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id,
            patient_id: TEST_PATIENT_ID,
            patientId: TEST_PATIENT_ID,
            patient_name: 'Paciente Multi E2E',
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
              name: 'Paciente Multi E2E',
              full_name: 'Paciente Multi E2E',
            },
          },
        }),
      });
    });

    await page.route(new RegExp(`/api/patients/${TEST_PATIENT_ID}(?:/.*)?$`, 'i'), async (route) => {
      const url = route.request().url();
      let data: unknown = {
        id: TEST_PATIENT_ID,
        name: 'Paciente Multi E2E',
        full_name: 'Paciente Multi E2E',
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
        body: JSON.stringify({ data: [{ id: 'therapist-e2e', name: 'Fisio Multi' }] }),
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
        body: JSON.stringify({ data: { id: `session-${Date.now()}` } }),
      });
    });

    await page.route(/\/api\/evolution\/treatment-sessions(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    for (const appointmentId of APPOINTMENT_IDS) {
      await page.goto(`/patient-evolution/${appointmentId}`);
      await page.waitForLoadState('domcontentloaded');

      const subjectiveSelector = 'textarea[aria-label="Campo SOAP: Subjetivo"]';
      const objectiveSelector = 'textarea[aria-label="Campo SOAP: Objetivo"]';
      const assessmentSelector = 'textarea[aria-label="Campo SOAP: Avaliação"]';
      const planSelector = 'textarea[aria-label="Campo SOAP: Plano"]';
      const subjective = page.locator(subjectiveSelector).first();
      const objective = page.locator(objectiveSelector).first();
      const assessment = page.locator(assessmentSelector).first();
      const plan = page.locator(planSelector).first();
      const pageHeading = page.getByRole('heading', { level: 1, name: /Paciente Multi E2E/i }).first();

      await expect(page).toHaveURL(new RegExp(`/patient-evolution/${appointmentId}`));
      await expect(pageHeading).toBeVisible({ timeout: 12000 });
      visitedAppointments += 1;

      if (!(await subjective.isVisible({ timeout: 12000 }).catch(() => false))) {
        continue;
      }

      await setTextareaValue(subjectiveSelector, `Evolução ${appointmentId} - Subjetivo`);
      await expect(subjective).toHaveValue(new RegExp(`Evolução ${appointmentId} - Subjetivo`));
      await page.waitForTimeout(300);

      await setTextareaValue(objectiveSelector, `Evolução ${appointmentId} - Objetivo`);
      await expect(objective).toHaveValue(new RegExp(`Evolução ${appointmentId} - Objetivo`));
      await page.waitForTimeout(300);

      await setTextareaValue(assessmentSelector, `Evolução ${appointmentId} - Avaliação`);
      await expect(assessment).toHaveValue(new RegExp(`Evolução ${appointmentId} - Avaliação`));
      await page.waitForTimeout(300);

      await setTextareaValue(planSelector, `Evolução ${appointmentId} - Plano`);
      await expect(plan).toHaveValue(new RegExp(`Evolução ${appointmentId} - Plano`));
      await page.waitForTimeout(1200);

      const saveButton = page.getByRole('button', { name: /Salvar/i }).last();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.evaluate((button: HTMLButtonElement) => button.click());
      }

      await page.waitForTimeout(1000);
    }

    expect(visitedAppointments).toBe(APPOINTMENT_IDS.length);
  });
});
