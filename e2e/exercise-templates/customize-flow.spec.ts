/**
 * E2E: Fluxo de personalização de System_Template
 *
 * Cobre: selecionar System_Template → clicar "Personalizar" → verificar TemplateCreateFlow
 *        pré-preenchido → salvar → verificar novo Custom_Template na listagem
 * Requirements: 5.2, 5.3
 *
 * Executar:
 *   pnpm exec playwright test e2e/exercise-templates/customize-flow.spec.ts --project=chromium
 * Com navegador visível:
 *   pnpm exec playwright test e2e/exercise-templates/customize-flow.spec.ts --project=chromium --headed
 */

import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from '../helpers/neon-auth';
import { testUsers } from '../fixtures/test-data';
import type { ExerciseTemplate } from '../../src/types/workers';

// ─── Test data ────────────────────────────────────────────────────────────────

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

const MOCK_SYSTEM_TEMPLATE: ExerciseTemplate = {
  id: 'template-e2e-system-ortopedico',
  name: 'Protocolo Lombalgia Crônica',
  description: 'Protocolo para tratamento de lombalgia crônica',
  category: 'ortopedico',
  conditionName: 'Lombalgia crônica inespecífica',
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

const MOCK_CUSTOM_TEMPLATE: ExerciseTemplate = {
  id: 'template-e2e-custom-created',
  name: 'Protocolo Lombalgia Crônica (Personalizado)',
  description: 'Protocolo para tratamento de lombalgia crônica',
  category: 'ortopedico',
  conditionName: 'Lombalgia crônica inespecífica',
  templateVariant: 'Conservador',
  clinicalNotes: 'Indicado para pacientes com lombalgia crônica inespecífica.',
  contraindications: 'Hérnia de disco aguda com déficit neurológico.',
  precautions: 'Evitar flexão excessiva nas primeiras semanas.',
  progressionNotes: 'Progredir conforme tolerância do paciente.',
  evidenceLevel: 'A',
  bibliographicReferences: ['Airaksinen O et al. European guidelines for chronic low back pain. 2006.'],
  isActive: true,
  isPublic: false,
  organizationId: TEST_ORG_ID,
  createdBy: 'user-e2e-admin',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateType: 'custom',
  patientProfile: 'ortopedico',
  sourceTemplateId: MOCK_SYSTEM_TEMPLATE.id,
  isDraft: false,
  exerciseCount: 8,
};

const MOCK_CUSTOM_ONLY_TEMPLATE: ExerciseTemplate = {
  id: 'template-e2e-custom-existing',
  name: 'Meu Protocolo Personalizado',
  description: 'Template personalizado existente',
  category: 'esportivo',
  conditionName: 'Entorse de tornozelo',
  templateVariant: null,
  clinicalNotes: null,
  contraindications: null,
  precautions: null,
  progressionNotes: null,
  evidenceLevel: null,
  bibliographicReferences: [],
  isActive: true,
  isPublic: false,
  organizationId: TEST_ORG_ID,
  createdBy: 'user-e2e-admin',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateType: 'custom',
  patientProfile: 'esportivo',
  sourceTemplateId: null,
  isDraft: false,
  exerciseCount: 5,
};

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
 * Sets up all API route mocks needed for the customize flow.
 * Accepts an initial templates list and an optional post-customize list.
 */
async function setupCustomizeFlowMocks(
  page: Page,
  initialTemplates: ExerciseTemplate[] = [MOCK_SYSTEM_TEMPLATE],
  updatedTemplates?: ExerciseTemplate[],
) {
  let customizeCallCount = 0;

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

  // Templates list — returns updated list after customize if provided
  await page.route(/\/api\/exercise-templates(?:\?.*)?$/, async (route) => {
    const templates = (updatedTemplates && customizeCallCount > 0)
      ? updatedTemplates
      : initialTemplates;
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
    const allTemplates = [...initialTemplates, ...(updatedTemplates ?? [])];
    const found = allTemplates.find((t) => t.id === id);
    await route.fulfill({
      status: found ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify({ data: found ?? null }),
    });
  });

  // POST /api/exercise-templates/:id/customize — returns new custom template
  await page.route(/\/api\/exercise-templates\/[^/?#]+\/customize$/, async (route) => {
    customizeCallCount++;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_CUSTOM_TEMPLATE }),
    });
  });

  // Protocols (used by exercises page)
  await page.route('**/api/protocols?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  // Exercise plans
  await page.route(/\/api\/exercise-plans(?:\?.*)?$/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  // Exercises library (for TemplateCreateFlow step 2 search)
  await page.route(/\/api\/exercises(?:\?.*)?$/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Template Customize Flow — Personalização de System_Template', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupCustomizeFlowMocks(page, [MOCK_SYSTEM_TEMPLATE], [MOCK_SYSTEM_TEMPLATE, MOCK_CUSTOM_TEMPLATE]);
    await page.goto('/exercises?tab=templates');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
  });

  test('deve exibir botão "Personalizar" para System_Template no painel de detalhes (Req 5.1)', async ({ page }) => {
    // Wait for template list to load
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });

    // Click on the system template card
    await templateCard.click();

    // Verify detail panel opens
    await expect(page.getByRole('heading', { name: 'Protocolo Lombalgia Crônica' })).toBeVisible({ timeout: 5000 });

    // "Personalizar" button must be visible for system templates
    await expect(page.getByRole('button', { name: /Personalizar/i })).toBeVisible();
  });

  test('deve abrir TemplateCreateFlow pré-preenchido ao clicar "Personalizar" (Req 5.2)', async ({ page }) => {
    // Select the system template
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    // Click "Personalizar"
    await page.getByRole('button', { name: /Personalizar/i }).click();

    // Verify the TemplateCreateFlow dialog opens
    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('deve pré-preencher nome com sufixo "(Personalizado)" (Req 5.2)', async ({ page }) => {
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Personalizar/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Name field should be pre-filled with "(Personalizado)" suffix
    const nameInput = dialog.locator('input#name');
    await expect(nameInput).toHaveValue('Protocolo Lombalgia Crônica (Personalizado)');
  });

  test('deve pré-preencher perfil de paciente do template original (Req 5.2)', async ({ page }) => {
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Personalizar/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Patient profile should be pre-selected as "Ortopédico"
    await expect(dialog.getByText('Ortopédico')).toBeVisible();
  });

  test('deve pré-preencher condição clínica do template original (Req 5.2)', async ({ page }) => {
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Personalizar/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // conditionName should be pre-filled
    const conditionInput = dialog.locator('input#conditionName');
    await expect(conditionInput).toHaveValue('Lombalgia crônica inespecífica');
  });

  test('deve exibir badge com nome do template original no dialog (Req 5.2)', async ({ page }) => {
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Personalizar/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog description should reference the source template
    await expect(dialog.getByText(/Baseado em/i)).toBeVisible();
    await expect(dialog.getByText('Protocolo Lombalgia Crônica')).toBeVisible();
  });

  test('fluxo completo: personalizar → salvar → verificar Custom_Template na listagem (Req 5.2, 5.3)', async ({ page }) => {
    // Step 1: Select system template
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    // Verify detail panel
    await expect(page.getByRole('heading', { name: 'Protocolo Lombalgia Crônica' })).toBeVisible({ timeout: 5000 });

    // Step 2: Click "Personalizar"
    await page.getByRole('button', { name: /Personalizar/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Step 3: Verify pre-filled data on step 1
    const nameInput = dialog.locator('input#name');
    await expect(nameInput).toHaveValue('Protocolo Lombalgia Crônica (Personalizado)');

    // Step 4: Navigate to step 2 (Exercícios)
    await dialog.getByRole('button', { name: /Próximo/i }).click();

    // Step 5: Navigate to step 3 (Informações clínicas)
    await dialog.getByRole('button', { name: /Próximo/i }).click();

    // Step 6: Submit the form — click "Salvar template"
    const saveButton = dialog.getByRole('button', { name: /Salvar template/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Step 7: Verify success toast
    const successToast = page.getByText(/Template personalizado criado/i);
    await expect(successToast).toBeVisible({ timeout: 8000 });

    // Step 8: Verify dialog closes
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // Step 9: Verify the new Custom_Template appears in the listing
    await expect(page.getByText('Protocolo Lombalgia Crônica (Personalizado)')).toBeVisible({ timeout: 8000 });
  });

  test('deve exibir badge "Personalizado" no novo Custom_Template após criação (Req 5.4)', async ({ page }) => {
    // Select system template and open customize flow
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Personalizar/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Navigate through steps and save
    await dialog.getByRole('button', { name: /Próximo/i }).click();
    await dialog.getByRole('button', { name: /Próximo/i }).click();
    await dialog.getByRole('button', { name: /Salvar template/i }).click();

    // Wait for success and dialog to close
    await expect(page.getByText(/Template personalizado criado/i)).toBeVisible({ timeout: 8000 });
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // Click on the new custom template to open its detail panel
    const customCard = page.getByText('Protocolo Lombalgia Crônica (Personalizado)').first();
    await expect(customCard).toBeVisible({ timeout: 8000 });
    await customCard.click();

    // Verify "Personalizado" badge is shown (not "Sistema")
    const detailPanel = page.locator('.flex-col.h-full').first();
    await expect(detailPanel.getByText('Personalizado').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Template Customize Flow — Botão "Personalizar" ausente para Custom_Templates', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupCustomizeFlowMocks(page, [MOCK_SYSTEM_TEMPLATE, MOCK_CUSTOM_ONLY_TEMPLATE]);
    await page.goto('/exercises?tab=templates');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
  });

  test('não deve exibir botão "Personalizar" para Custom_Template (Req 5.1)', async ({ page }) => {
    // Wait for templates to load
    await expect(page.getByText('Meu Protocolo Personalizado')).toBeVisible({ timeout: 15000 });

    // Click on the custom template
    await page.getByText('Meu Protocolo Personalizado').first().click();

    // Verify detail panel opens
    await expect(page.getByRole('heading', { name: 'Meu Protocolo Personalizado' })).toBeVisible({ timeout: 5000 });

    // "Personalizar" button must NOT be visible for custom templates
    await expect(page.getByRole('button', { name: /Personalizar/i })).not.toBeVisible();
  });

  test('deve exibir botões "Editar" e "Excluir" para Custom_Template (Req 5.1)', async ({ page }) => {
    await expect(page.getByText('Meu Protocolo Personalizado')).toBeVisible({ timeout: 15000 });
    await page.getByText('Meu Protocolo Personalizado').first().click();

    await expect(page.getByRole('heading', { name: 'Meu Protocolo Personalizado' })).toBeVisible({ timeout: 5000 });

    // "Editar" and "Excluir" buttons must be visible for custom templates
    await expect(page.getByRole('button', { name: /Editar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Excluir/i })).toBeVisible();
  });

  test('deve exibir botão "Personalizar" para System_Template mas não para Custom_Template', async ({ page }) => {
    // Check system template — should have "Personalizar"
    await expect(page.getByText('Protocolo Lombalgia Crônica').first()).toBeVisible({ timeout: 15000 });
    await page.getByText('Protocolo Lombalgia Crônica').first().click();
    await expect(page.getByRole('heading', { name: 'Protocolo Lombalgia Crônica' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Personalizar/i })).toBeVisible();

    // Now click on custom template — should NOT have "Personalizar"
    await page.getByText('Meu Protocolo Personalizado').first().click();
    await expect(page.getByRole('heading', { name: 'Meu Protocolo Personalizado' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Personalizar/i })).not.toBeVisible();
  });
});

test.describe('Template Customize Flow — Integridade do System_Template original (Property 6)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupCustomizeFlowMocks(page, [MOCK_SYSTEM_TEMPLATE], [MOCK_SYSTEM_TEMPLATE, MOCK_CUSTOM_TEMPLATE]);
    await page.goto('/exercises?tab=templates');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
  });

  test('System_Template original deve permanecer na listagem após personalização (Property 6, Req 5.3)', async ({ page }) => {
    // Select and customize the system template
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Personalizar/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Navigate through steps and save
    await dialog.getByRole('button', { name: /Próximo/i }).click();
    await dialog.getByRole('button', { name: /Próximo/i }).click();
    await dialog.getByRole('button', { name: /Salvar template/i }).click();

    // Wait for success
    await expect(page.getByText(/Template personalizado criado/i)).toBeVisible({ timeout: 8000 });
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // The original System_Template must still be in the listing
    await expect(page.getByText('Protocolo Lombalgia Crônica').first()).toBeVisible({ timeout: 5000 });

    // The new Custom_Template should also be in the listing
    await expect(page.getByText('Protocolo Lombalgia Crônica (Personalizado)')).toBeVisible();
  });

  test('System_Template original deve manter badge "Sistema" após personalização (Property 6, Req 5.3, 5.4)', async ({ page }) => {
    // Customize the system template
    const templateCard = page.getByText('Protocolo Lombalgia Crônica').first();
    await expect(templateCard).toBeVisible({ timeout: 15000 });
    await templateCard.click();

    await page.getByRole('button', { name: /Personalizar/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Personalizar template/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await dialog.getByRole('button', { name: /Próximo/i }).click();
    await dialog.getByRole('button', { name: /Próximo/i }).click();
    await dialog.getByRole('button', { name: /Salvar template/i }).click();

    await expect(page.getByText(/Template personalizado criado/i)).toBeVisible({ timeout: 8000 });
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // Click on the original system template to verify it still has "Sistema" badge
    await page.getByText('Protocolo Lombalgia Crônica').first().click();
    await expect(page.getByRole('heading', { name: 'Protocolo Lombalgia Crônica' })).toBeVisible({ timeout: 5000 });

    // Should still show "Sistema" badge (not "Personalizado")
    await expect(page.getByText('Sistema').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Personalizar/i })).toBeVisible();
  });
});
