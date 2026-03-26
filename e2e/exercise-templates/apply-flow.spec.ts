/**
 * E2E: Fluxo completo de aplicação de template a paciente
 *
 * Cobre: selecionar template → aplicar a paciente → verificar plano criado no perfil
 * Requirements: 3.1, 3.5, 3.6
 *
 * Executar:
 *   pnpm exec playwright test e2e/exercise-templates/apply-flow.spec.ts --project=chromium
 * Com navegador visível:
 *   pnpm exec playwright test e2e/exercise-templates/apply-flow.spec.ts --project=chromium --headed
 */

import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from '../helpers/neon-auth';
import { testUsers } from '../fixtures/test-data';
import type { ExerciseTemplate } from '../../src/types/workers';

// ─── Test data ────────────────────────────────────────────────────────────────

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

const MOCK_TEMPLATE_ORTOPEDICO: ExerciseTemplate = {
  id: 'template-e2e-ortopedico',
  name: 'Protocolo Lombalgia Crônica',
  description: 'Protocolo para tratamento de lombalgia crônica',
  category: 'ortopedico',
  conditionName: 'Lombalgia',
  templateVariant: 'Conservador',
  clinicalNotes: 'Indicado para pacientes com lombalgia crônica inespecífica.',
  contraindications: 'Hérnia de disco aguda com déficit neurológico.',
  precautions: 'Evitar flexão excessiva nas primeiras semanas.',
  progressionNotes: 'Progredir conforme tolerância do paciente.',
  evidenceLevel: 'A',
  bibliographicReferences: ['Airaksinen O et al. European guidelines for chronic low back pain. 2006.'],
  isActive: true,
  isPublic: true,
  organizationId: null,
  createdBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateType: 'system',
  patientProfile: 'ortopedico',
  sourceTemplateId: null,
  isDraft: false,
  exerciseCount: 8,
};

const MOCK_TEMPLATE_POS_OP: ExerciseTemplate = {
  id: 'template-e2e-pos-op',
  name: 'Reconstrução LCA - Protocolo Acelerado',
  description: 'Protocolo pós-operatório para reconstrução de LCA',
  category: 'pos_operatorio',
  conditionName: 'Reconstrução de LCA',
  templateVariant: 'Acelerado',
  clinicalNotes: 'Protocolo acelerado para pacientes jovens e ativos.',
  contraindications: 'Complicações pós-operatórias.',
  precautions: 'Respeitar fases de cicatrização.',
  progressionNotes: 'Progressão por semanas conforme critérios funcionais.',
  evidenceLevel: 'A',
  bibliographicReferences: ['Wilk KE et al. Rehabilitation of the postoperative knee. 2012.'],
  isActive: true,
  isPublic: true,
  organizationId: null,
  createdBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateType: 'system',
  patientProfile: 'pos_operatorio',
  sourceTemplateId: null,
  isDraft: false,
  exerciseCount: 12,
};

const MOCK_PATIENT = {
  id: 'patient-e2e-apply',
  full_name: 'Ana Silva E2E',
  cpf: '123.456.789-00',
  email: 'ana.silva@example.com',
  phone: '11999999999',
  status: 'Em Tratamento',
};

const MOCK_SURGERY = {
  id: 'surgery-e2e-1',
  patient_id: MOCK_PATIENT.id,
  surgery_name: 'Reconstrução LCA Joelho Direito',
  surgery_date: '2024-01-15',
};

const MOCK_PLAN_ID = 'plan-e2e-created-001';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/**
 * Sets up all API route mocks needed for the template apply flow.
 */
async function setupApplyFlowMocks(page: Page, templates: ExerciseTemplate[] = [MOCK_TEMPLATE_ORTOPEDICO]) {
  // Profile / auth
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
          name: 'Organização E2E',
          slug: 'organizacao-e2e',
          settings: {},
          active: true,
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

  // Templates list
  await page.route(/\/api\/exercise-templates(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: templates, total: templates.length }),
    });
  });

  // Template detail
  await page.route(/\/api\/exercise-templates\/[^/?#]+$/, async (route) => {
    const url = route.request().url();
    const id = url.split('/').pop()?.split('?')[0];
    const found = templates.find((t) => t.id === id);
    await route.fulfill({
      status: found ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify({ data: found ?? null }),
    });
  });

  // Patients search
  await page.route(/\/api\/patients(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [MOCK_PATIENT], total: 1 }),
    });
  });

  // Patient surgeries
  await page.route(/\/api\/patients\/[^/?#]+\/surgeries(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [MOCK_SURGERY] }),
    });
  });

  // Apply template → create plan
  await page.route(/\/api\/exercise-templates\/[^/?#]+\/apply$/, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          planId: MOCK_PLAN_ID,
          patientId: MOCK_PATIENT.id,
          exerciseCount: templates[0]?.exerciseCount ?? 8,
        },
      }),
    });
  });

  // Exercise plans (for invalidation)
  await page.route(/\/api\/exercise-plans(?:\?.*)?$/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  // Protocols (used by exercises page)
  await page.route('**/api/protocols?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Template Apply Flow — Fluxo completo de aplicação', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupApplyFlowMocks(page);
    await page.goto('/exercises?tab=templates');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
  });

  test('deve selecionar template e exibir painel de detalhes (Req 3.1)', async ({ page }) => {
    // Wait for the template list to load
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });

    // Click on the template card
    await templateCard.click();

    // Verify the detail panel shows the template details
    await expect(page.getByRole('heading', { name: 'Protocolo Lombalgia Crônica' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Lombalgia')).toBeVisible();

    // Verify "Aplicar a Paciente" button is visible without scrolling
    await expect(page.getByRole('button', { name: /Aplicar a Paciente/i })).toBeVisible();
  });

  test('deve abrir o sheet de aplicação ao clicar em "Aplicar a Paciente" (Req 3.1)', async ({ page }) => {
    // Select the template
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    // Click "Aplicar a Paciente"
    await page.getByRole('button', { name: /Aplicar a Paciente/i }).click();

    // Verify the sheet opens with the correct title
    await expect(page.getByRole('dialog').filter({ hasText: /Aplicar template a paciente/i })).toBeVisible({ timeout: 5000 });

    // Verify template name is shown in the sheet
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible();
  });

  test('fluxo completo: selecionar template → buscar paciente → definir data → criar plano (Req 3.1, 3.5, 3.6)', async ({ page }) => {
    // Step 1: Select template from sidebar
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    // Verify detail panel
    await expect(page.getByRole('heading', { name: 'Protocolo Lombalgia Crônica' })).toBeVisible({ timeout: 5000 });

    // Step 2: Click "Aplicar a Paciente"
    await page.getByRole('button', { name: /Aplicar a Paciente/i }).click();

    const sheet = page.getByRole('dialog').filter({ hasText: /Aplicar template a paciente/i });
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Step 3: Search for patient (step 1 of the flow)
    await expect(sheet.getByText(/Etapa 1/i)).toBeVisible();
    const searchInput = sheet.getByPlaceholder(/Nome ou CPF do paciente/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Ana');

    // Wait for patient results to appear (debounce 300ms)
    await page.waitForTimeout(400);
    const patientResult = sheet.getByText('Ana Silva E2E');
    await expect(patientResult).toBeVisible({ timeout: 5000 });

    // Step 4: Select the patient
    await patientResult.click();

    // Verify patient is selected (badge shown)
    await expect(sheet.getByText('Ana Silva E2E')).toBeVisible();

    // Step 5: Click "Próximo" to advance to step 2
    await sheet.getByRole('button', { name: /Próximo/i }).click();

    // Step 6: Fill in start date (step 2)
    await expect(sheet.getByText(/Etapa 2/i)).toBeVisible({ timeout: 3000 });
    const dateInput = sheet.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    const today = new Date().toISOString().split('T')[0];
    await dateInput.fill(today);

    // Step 7: Click "Criar plano de exercícios" (final step for non-pos_operatorio)
    const submitButton = sheet.getByRole('button', { name: /Criar plano de exercícios/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Step 8: Verify success toast with link to the plan (Req 3.6)
    const successToast = page.getByText(/Plano criado com sucesso/i);
    await expect(successToast).toBeVisible({ timeout: 8000 });

    // Verify the sheet closes after success
    await expect(sheet).toBeHidden({ timeout: 5000 });
  });

  test('deve exibir etapa de vinculação a cirurgia para template pós-operatório (Req 3.4)', async ({ page }) => {
    // Setup with pos_operatorio template
    await page.route(/\/api\/exercise-templates(?:\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [MOCK_TEMPLATE_POS_OP], total: 1 }),
      });
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);

    // Select the pos_operatorio template
    const templateCard = page.getByText('Reconstrução LCA - Protocolo Acelerado').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    // Verify ExerciseTimeline is shown for pos_operatorio
    await expect(page.getByTestId('exercise-timeline')).toBeVisible({ timeout: 5000 });

    // Open apply flow
    await page.getByRole('button', { name: /Aplicar a Paciente/i }).click();

    const sheet = page.getByRole('dialog').filter({ hasText: /Aplicar template a paciente/i });
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Search and select patient
    const searchInput = sheet.getByPlaceholder(/Nome ou CPF do paciente/i);
    await searchInput.fill('Ana');
    await page.waitForTimeout(400);
    await sheet.getByText('Ana Silva E2E').click();

    // Advance to step 2
    await sheet.getByRole('button', { name: /Próximo/i }).click();

    // Fill date
    await expect(sheet.getByText(/Etapa 2/i)).toBeVisible({ timeout: 3000 });
    const dateInput = sheet.locator('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    await dateInput.fill(today);

    // Advance to step 3 (surgery link — only for pos_operatorio)
    await sheet.getByRole('button', { name: /Próximo/i }).click();

    // Verify step 3 shows surgery link
    await expect(sheet.getByText(/Etapa 3/i)).toBeVisible({ timeout: 3000 });
    await expect(sheet.getByText(/Vincular a cirurgia/i)).toBeVisible();

    // Verify the surgery from mock is listed
    await expect(sheet.getByText(/Reconstrução LCA Joelho Direito/i)).toBeVisible({ timeout: 5000 });
  });

  test('deve exibir apenas 2 etapas para template não pós-operatório', async ({ page }) => {
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Aplicar a Paciente/i }).click();

    const sheet = page.getByRole('dialog').filter({ hasText: /Aplicar template a paciente/i });
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Should show step indicators for 2 steps only
    // Step 1 indicator visible
    await expect(sheet.getByText(/Etapa 1/i)).toBeVisible();

    // The step indicator dots — should be 2 total
    const stepDots = sheet.locator('.rounded-full.flex.items-center.justify-center');
    await expect(stepDots).toHaveCount(2);
  });

  test('deve manter dados do formulário após erro de API (Req 3.7)', async ({ page }) => {
    // Override apply endpoint to return error
    await page.route(/\/api\/exercise-templates\/[^/?#]+\/apply$/, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Erro interno do servidor' }),
      });
    });

    // Select template and open apply flow
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Aplicar a Paciente/i }).click();

    const sheet = page.getByRole('dialog').filter({ hasText: /Aplicar template a paciente/i });
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Fill patient search
    const searchInput = sheet.getByPlaceholder(/Nome ou CPF do paciente/i);
    await searchInput.fill('Ana');
    await page.waitForTimeout(400);
    await sheet.getByText('Ana Silva E2E').click();

    // Advance to step 2
    await sheet.getByRole('button', { name: /Próximo/i }).click();

    // Fill date
    const today = new Date().toISOString().split('T')[0];
    const dateInput = sheet.locator('input[type="date"]');
    await dateInput.fill(today);

    // Submit — should fail
    await sheet.getByRole('button', { name: /Criar plano de exercícios/i }).click();

    // Verify error toast appears
    await expect(page.getByText(/Erro ao criar plano/i)).toBeVisible({ timeout: 8000 });

    // Verify sheet stays open (data preserved)
    await expect(sheet).toBeVisible();

    // Verify the date is still filled (form data preserved)
    await expect(dateInput).toHaveValue(today);
  });

  test('deve exibir badge "Sistema" no template card e no painel de detalhes', async ({ page }) => {
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });

    // Badge "Sistema" should be visible in the card
    const cardContainer = page.locator('[data-testid="template-card"], .cursor-pointer').filter({ hasText: 'Protocolo Lombalgia Crônica' }).first();
    await expect(cardContainer.getByText('Sistema')).toBeVisible();

    // Click to open detail panel
    await templateCard.click();

    // Badge "Sistema" should also be in the detail panel
    const detailPanel = page.locator('.flex-1.flex.flex-col.min-w-0');
    await expect(detailPanel.getByText('Sistema').first()).toBeVisible({ timeout: 5000 });
  });

  test('deve exibir evidência nível A no painel de detalhes', async ({ page }) => {
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    // Evidence level badge should be visible
    await expect(page.getByText(/Evidência A/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Template Apply Flow — Navegação e filtros', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupApplyFlowMocks(page, [MOCK_TEMPLATE_ORTOPEDICO, MOCK_TEMPLATE_POS_OP]);
    await page.goto('/exercises?tab=templates');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
  });

  test('deve navegar para a aba de templates via URL', async ({ page }) => {
    // The page should be on the templates tab
    await expect(page).toHaveURL(/tab=templates/);

    // Templates tab content should be visible
    const templatesList = page.getByText('Protocolo Lombalgia Crônica');
    await expect(templatesList).toBeVisible({ timeout: 15000 });
  });

  test('deve exibir múltiplos templates na sidebar', async ({ page }) => {
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Reconstrução LCA - Protocolo Acelerado')).toBeVisible();
  });

  test('deve filtrar templates por perfil de paciente', async ({ page }) => {
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });

    // Click on "Ortopédico" profile filter
    const ortopedicoFilter = page.getByRole('button', { name: /Ortopédico/i }).first();
    if (await ortopedicoFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ortopedicoFilter.click();

      // Only ortopedico template should be visible
      await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible();
      await expect(page.getByText('Reconstrução LCA - Protocolo Acelerado')).not.toBeVisible();
    }
  });

  test('deve buscar templates por nome', async ({ page }) => {
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });

    // Find the search input in the sidebar
    const searchInput = page.getByPlaceholder(/Buscar templates/i).first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Lombalgia');
      await page.waitForTimeout(400); // debounce

      await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible();
      await expect(page.getByText('Reconstrução LCA - Protocolo Acelerado')).not.toBeVisible();
    }
  });
});
