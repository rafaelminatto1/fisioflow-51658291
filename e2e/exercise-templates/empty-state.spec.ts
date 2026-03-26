/**
 * E2E: Estado vazio e onboarding da aba de templates
 *
 * Cobre: organização sem Custom_Templates exibe System_Templates e CTAs corretos
 * Requirements: 7.1, 7.2, 7.3, 7.4
 *
 * Executar:
 *   pnpm exec playwright test e2e/exercise-templates/empty-state.spec.ts --project=chromium
 * Com navegador visível:
 *   pnpm exec playwright test e2e/exercise-templates/empty-state.spec.ts --project=chromium --headed
 */

import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from '../helpers/neon-auth';
import { testUsers } from '../fixtures/test-data';
import type { ExerciseTemplate } from '../../src/types/workers';

// ─── Test data ────────────────────────────────────────────────────────────────

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

const MOCK_SYSTEM_TEMPLATE_ORTOPEDICO: ExerciseTemplate = {
  id: 'template-e2e-system-lombalgia',
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

const MOCK_SYSTEM_TEMPLATE_ESPORTIVO: ExerciseTemplate = {
  id: 'template-e2e-system-esportivo',
  name: 'Retorno ao Esporte - Entorse de Tornozelo',
  description: 'Protocolo de retorno ao esporte após entorse de tornozelo',
  category: 'esportivo',
  conditionName: 'Entorse de Tornozelo',
  templateVariant: 'Progressivo',
  clinicalNotes: 'Indicado para atletas em fase de retorno ao esporte.',
  contraindications: 'Instabilidade ligamentar grave não tratada.',
  precautions: 'Respeitar critérios funcionais de progressão.',
  progressionNotes: 'Progredir conforme critérios de força e propriocepção.',
  evidenceLevel: 'A',
  bibliographicReferences: [],
  isActive: true,
  isPublic: true,
  organizationId: null,
  createdBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateType: 'system',
  patientProfile: 'esportivo',
  sourceTemplateId: null,
  isDraft: false,
  exerciseCount: 10,
};

const MOCK_CUSTOM_TEMPLATE: ExerciseTemplate = {
  id: 'template-e2e-custom-org',
  name: 'Meu Protocolo Personalizado',
  description: 'Template personalizado da organização',
  category: 'ortopedico',
  conditionName: 'Lombalgia',
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
  patientProfile: 'ortopedico',
  sourceTemplateId: null,
  isDraft: false,
  exerciseCount: 5,
};

const SYSTEM_TEMPLATES_ONLY = [MOCK_SYSTEM_TEMPLATE_ORTOPEDICO, MOCK_SYSTEM_TEMPLATE_ESPORTIVO];
const MIXED_TEMPLATES = [MOCK_SYSTEM_TEMPLATE_ORTOPEDICO, MOCK_SYSTEM_TEMPLATE_ESPORTIVO, MOCK_CUSTOM_TEMPLATE];

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
 * Sets up common API route mocks for the empty-state tests.
 */
async function setupEmptyStateMocks(page: Page, templates: ExerciseTemplate[]) {
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

test.describe('Estado Vazio — Organização sem Custom_Templates (Req 7.1, 7.2, 7.3, 7.4)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupEmptyStateMocks(page, SYSTEM_TEMPLATES_ONLY);
    await page.goto('/exercises?tab=templates');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
  });

  test('deve exibir banner de estado vazio quando não há Custom_Templates (Req 7.1)', async ({ page }) => {
    // Wait for templates to load
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });

    // Empty state CTA banner must be visible
    await expect(
      page.getByText('Sua organização ainda não tem templates personalizados'),
    ).toBeVisible();
  });

  test('deve exibir System_Templates na sidebar mesmo sem Custom_Templates (Req 7.2)', async ({ page }) => {
    // Both system templates must be visible in the sidebar
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Retorno ao Esporte - Entorse de Tornozelo')).toBeVisible();
  });

  test('deve exibir botão "Explorar Templates do Sistema" no estado vazio (Req 7.3)', async ({ page }) => {
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByRole('button', { name: /Explorar Templates do Sistema/i }),
    ).toBeVisible();
  });

  test('deve exibir botão "Criar Meu Primeiro Template" no estado vazio (Req 7.4)', async ({ page }) => {
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByRole('button', { name: /Criar Meu Primeiro Template/i }),
    ).toBeVisible();
  });

  test('clicar em "Explorar Templates do Sistema" mantém System_Templates visíveis (Req 7.2, 7.3)', async ({ page }) => {
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });

    // Click the CTA button
    await page.getByRole('button', { name: /Explorar Templates do Sistema/i }).click();

    // System templates must still be visible after clicking
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible();
    await expect(page.getByText('Retorno ao Esporte - Entorse de Tornozelo')).toBeVisible();
  });

  test('clicar em "Criar Meu Primeiro Template" abre o TemplateCreateFlow (Req 7.4)', async ({ page }) => {
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });

    // Click the "Criar Meu Primeiro Template" CTA
    await page.getByRole('button', { name: /Criar Meu Primeiro Template/i }).click();

    // TemplateCreateFlow dialog must open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog should contain the create template form (step 1)
    await expect(dialog.getByText(/Etapa 1/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Estado com Custom_Templates — Banner de estado vazio ausente', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupEmptyStateMocks(page, MIXED_TEMPLATES);
    await page.goto('/exercises?tab=templates');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
  });

  test('não deve exibir banner de estado vazio quando há Custom_Templates (Req 7.1)', async ({ page }) => {
    // Wait for templates to load (custom template should be visible)
    await expect(page.getByText('Meu Protocolo Personalizado')).toBeVisible({ timeout: 15000 });

    // Empty state CTA banner must NOT be visible
    await expect(
      page.getByText('Sua organização ainda não tem templates personalizados'),
    ).not.toBeVisible();
  });

  test('deve exibir tanto System_Templates quanto Custom_Templates na sidebar (Req 7.2)', async ({ page }) => {
    // All templates must be visible
    await expect(page.getByText('Protocolo Lombalgia Crônica')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Retorno ao Esporte - Entorse de Tornozelo')).toBeVisible();
    await expect(page.getByText('Meu Protocolo Personalizado')).toBeVisible();
  });

  test('não deve exibir botões de CTA do estado vazio quando há Custom_Templates (Req 7.3, 7.4)', async ({ page }) => {
    await expect(page.getByText('Meu Protocolo Personalizado')).toBeVisible({ timeout: 15000 });

    // CTA buttons must NOT be visible when custom templates exist
    await expect(
      page.getByRole('button', { name: /Explorar Templates do Sistema/i }),
    ).not.toBeVisible();

    await expect(
      page.getByRole('button', { name: /Criar Meu Primeiro Template/i }),
    ).not.toBeVisible();
  });
});

test.describe('Estado completamente vazio — Sem nenhum template', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupEmptyStateMocks(page, []);
    await page.goto('/exercises?tab=templates');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
  });

  test('deve exibir banner de estado vazio quando não há nenhum template (Req 7.1)', async ({ page }) => {
    // Wait for the page to finish loading (no templates to wait for)
    await page.waitForTimeout(2000);

    // Empty state CTA banner must be visible
    await expect(
      page.getByText('Sua organização ainda não tem templates personalizados'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir botões de CTA mesmo sem nenhum template (Req 7.3, 7.4)', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(
      page.getByRole('button', { name: /Explorar Templates do Sistema/i }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole('button', { name: /Criar Meu Primeiro Template/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('sidebar deve estar vazia quando não há templates (Req 7.2)', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Neither system nor custom templates should appear in the list
    await expect(page.getByText('Protocolo Lombalgia Crônica')).not.toBeVisible();
    await expect(page.getByText('Meu Protocolo Personalizado')).not.toBeVisible();
  });
});
