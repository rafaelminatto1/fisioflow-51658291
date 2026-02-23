import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Patient Evolution V3 - Templates SOAP', () => {
  test('deve abrir templates, aplicar template e exibir ação Editar Template', async ({ page }) => {
    page.on('pageerror', (err) => {
      console.log('PAGEERROR:', err.stack || err.message);
    });
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.toLowerCase().includes('invalid hook call') ||
        text.toLowerCase().includes('hook') ||
        text.includes('[NotionEvolutionPanel] Applying template') ||
        text.includes('[TemplateSelector] Selected template')
      ) {
        console.log('BROWSER:', text);
      }
    });

    const validUserId = '123e4567-e89b-12d3-a456-426614174000';
    const validPatientId = '123e4567-e89b-12d3-a456-426614174001';
    const validApptId = '123e4567-e89b-12d3-a456-426614174002';
    const validOrgId = '123e4567-e89b-12d3-a456-426614174003';

    const mockPatient = {
      id: validPatientId,
      full_name: 'Paciente Mock',
      name: 'Paciente Mock',
      email: 'mock@teste.com',
      phone: '11999999999',
    };

    const mockAppointment = {
      id: validApptId,
      patient_id: validPatientId,
      patientId: validPatientId,
      organization_id: validOrgId,
      appointment_date: new Date().toISOString().slice(0, 10),
      appointment_time: '10:00',
      status: 'agendado',
      patient: mockPatient,
    };

    const mockProfile = {
      id: validUserId,
      full_name: 'Admin Tester',
      role: 'admin',
      organization_id: validOrgId,
      organizationId: validOrgId,
    };

    await page.route('**/appointmentservicehttp**', async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') {
        await route.fulfill({ status: 200, json: { data: mockAppointment } });
        return;
      }

      let body: Record<string, unknown> = {};
      try {
        body = req.postDataJSON() as Record<string, unknown>;
      } catch {
        body = {};
      }

      const action = String(body.action || '');
      if (action === 'get') {
        await route.fulfill({ status: 200, json: { data: mockAppointment } });
        return;
      }
      if (action === 'list') {
        await route.fulfill({ status: 200, json: { data: [mockAppointment], total: 1 } });
        return;
      }
      await route.fulfill({ status: 200, json: { data: mockAppointment } });
    });

    await page.route('**/patientservicehttp**', async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') {
        await route.fulfill({ status: 200, json: { data: [mockPatient], total: 1 } });
        return;
      }

      let body: Record<string, unknown> = {};
      try {
        body = req.postDataJSON() as Record<string, unknown>;
      } catch {
        body = {};
      }

      const action = String(body.action || '');
      if (action === 'get') {
        await route.fulfill({ status: 200, json: { data: mockPatient } });
        return;
      }
      await route.fulfill({ status: 200, json: { data: [mockPatient], total: 1 } });
    });

    await page.route('**/getpatienthttp**', async (route) => {
      await route.fulfill({ status: 200, json: { data: mockPatient } });
    });

    await page.route('**/getprofile**', async (route) => {
      await route.fulfill({ status: 200, json: { data: mockProfile } });
    });

    await page.route('**/listdoctors**', async (route) => {
      await route.fulfill({ status: 200, json: { data: [], total: 0 } });
    });

    await page.route('**/google.firestore.v1.Firestore/**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.addInitScript(() => {
      localStorage.setItem('fisioflow-evolution-version', 'v3-notion');
    });

    await page.goto('/auth');
    if (new URL(page.url()).pathname.startsWith('/auth')) {
      const formInputs = page.locator('form input');
      await formInputs.first().waitFor({ state: 'visible', timeout: 20000 });
      await formInputs.nth(0).fill(testUsers.admin.email);
      await formInputs.nth(1).fill(testUsers.admin.password);
      await page.getByRole('button', { name: /Acessar Minha Conta|Entrar na Plataforma/i }).first().click();
      await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/);
    }

    await page.goto(`/patient-evolution/${validApptId}`);

    const templateButton = page.getByRole('button', { name: /Templates SOAP/i });
    if (!(await templateButton.isVisible().catch(() => false))) {
      const notionToggle = page.getByRole('button', { name: /Notion/i }).first();
      if (await notionToggle.isVisible().catch(() => false)) {
        await notionToggle.click();
      }
    }

    await expect(templateButton).toBeVisible({ timeout: 20000 });
    await templateButton.click();

    await expect(page.getByText('Editar Template')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pós-operatório - Dia 1')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('soap-template-post-op-day1').click();
    await expect(page.getByText('Editar Template')).toBeHidden({ timeout: 5000 });

    const patientReportEditor = page.locator('#patientReport .ProseMirror').first();
    const evolutionEditor = page.locator('#evolutionText .ProseMirror').first();
    await expect(patientReportEditor).toContainText('Paciente refere dor moderada', { timeout: 10000 });
    await expect(evolutionEditor).toContainText('Sinais vitais estáveis', { timeout: 10000 });
    await expect(evolutionEditor).toContainText('Paciente em pós-operatório imediato', { timeout: 10000 });

    await templateButton.click();
    const manageTemplatesButton = page.getByTestId('manage-soap-templates');
    await expect(manageTemplatesButton).toBeVisible({ timeout: 10000 });
    await manageTemplatesButton.evaluate((el: HTMLElement) => el.click());
    await page.waitForURL(/\/cadastros\/templates-evolucao/, { timeout: 10000 });
  });
});
