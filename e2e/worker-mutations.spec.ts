import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';
const loginEmail = process.env.E2E_LOGIN_EMAIL || 'rafael.minatto@yahoo.com.br';
const loginPassword = process.env.E2E_LOGIN_PASSWORD || 'Yukari30@';
const neonAuthUrl = process.env.VITE_NEON_AUTH_URL || '';

type MockExercise = {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  difficulty?: string;
  videoUrl?: string | null;
  imageUrl?: string | null;
  musclesPrimary?: string[];
  equipment?: string[];
  bodyParts?: string[];
  durationSeconds?: number | null;
};

type MockTemplate = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  conditionName?: string;
  templateVariant?: string | null;
  items: Array<Record<string, unknown>>;
};

type MockProtocol = {
  id: string;
  name: string;
  conditionName: string;
  protocolType: 'patologia' | 'pos_operatorio';
  evidenceLevel?: string | null;
  weeksTotal?: number;
  milestones?: Array<Record<string, unknown>>;
  restrictions?: Array<Record<string, unknown>>;
  progressionCriteria?: Array<Record<string, unknown>>;
};

function slug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function authenticatePage(page: Page) {
  if (!neonAuthUrl) {
    throw new Error('VITE_NEON_AUTH_URL ausente para worker-mutations.spec.ts');
  }
  await authenticateBrowserContext(page.context(), loginEmail, loginPassword);
}

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

async function mockExercisesBootstrap(page: Page) {
  const exercises: MockExercise[] = [
    {
      id: 'exercise-seed-1',
      name: 'Ponte de Glúteos',
      description: 'Exercício base para lombar',
      categoryId: 'Fortalecimento',
      difficulty: 'Iniciante',
      videoUrl: null,
      imageUrl: null,
      musclesPrimary: ['Glúteos'],
      equipment: [],
      bodyParts: ['Quadril'],
      durationSeconds: 30,
    },
  ];

  const templates: MockTemplate[] = [
    {
      id: 'template-seed-1',
      name: 'Template Lombar Base',
      description: 'Template inicial',
      category: 'patologia',
      conditionName: 'Lombalgia',
      templateVariant: 'base',
      items: [],
    },
  ];

  const protocols: MockProtocol[] = [
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
  ];

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
            joined_at: new Date().toISOString(),
            profiles: {
              full_name: 'Admin E2E',
              email: 'admin@e2e.local',
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
          email: 'admin@e2e.local',
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

  await page.route('**/api/exercises/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'Fortalecimento', name: 'Fortalecimento' },
          { id: 'Alongamento', name: 'Alongamento' },
        ],
      }),
    });
  });

  await page.route('**/api/exercises?**', async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const data = exercises.filter((exercise) => exercise.name.toLowerCase().includes(q));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data,
        meta: { page: 1, limit: 500, total: data.length, pages: 1 },
      }),
    });
  });

  await page.route('**/api/exercises', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    const body = JSON.parse(route.request().postData() || '{}');
    const created: MockExercise = {
      id: slug('exercise'),
      name: body.name,
      description: body.description || '',
      categoryId: body.category || body.categoryId || '',
      difficulty: body.difficulty || '',
      videoUrl: body.video_url || body.videoUrl || null,
      imageUrl: body.image_url || body.imageUrl || null,
      musclesPrimary: body.targetMuscles || [],
      equipment: body.equipment || [],
      bodyParts: body.body_parts || body.bodyParts || [],
      durationSeconds: body.duration || body.durationSeconds || null,
    };
    exercises.unshift(created);

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ data: created }),
    });
  });

  await page.route('**/api/exercises/*', async (route) => {
    const request = route.request();
    const id = request.url().split('/api/exercises/')[1]?.split('?')[0];
    const exercise = exercises.find((item) => item.id === id);

    if (!id || !exercise) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Exercise not found' }),
      });
      return;
    }

    if (request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}');
      exercise.name = body.name ?? exercise.name;
      exercise.description = body.description ?? exercise.description;
      exercise.categoryId = body.category ?? body.categoryId ?? exercise.categoryId;
      exercise.difficulty = body.difficulty ?? exercise.difficulty;
      exercise.videoUrl = body.video_url ?? body.videoUrl ?? exercise.videoUrl;
      exercise.imageUrl = body.image_url ?? body.imageUrl ?? exercise.imageUrl;
      exercise.bodyParts = body.body_parts ?? body.bodyParts ?? exercise.bodyParts;
      exercise.equipment = body.equipment ?? exercise.equipment;
      exercise.durationSeconds = body.duration ?? body.durationSeconds ?? exercise.durationSeconds;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: exercise }),
      });
      return;
    }

    if (request.method() === 'DELETE') {
      const index = exercises.findIndex((item) => item.id === id);
      if (index >= 0) exercises.splice(index, 1);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: exercise }),
    });
  });

  await page.route('**/api/templates', async (route) => {
    if (route.request().method() === 'GET') {
      const data = [...templates];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data,
          meta: { page: 1, limit: 500, total: data.length, pages: 1 },
        }),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const created: MockTemplate = {
        id: slug('template'),
        name: body.name,
        description: body.description || '',
        category: body.category || 'patologia',
        conditionName: body.condition_name || body.conditionName || 'Lombalgia',
        templateVariant: body.template_variant || body.templateVariant || null,
        items: body.items || [],
      };
      templates.unshift(created);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: created }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/templates?**', async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const data = templates.filter((template) => template.name.toLowerCase().includes(q));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data,
        meta: { page: 1, limit: 500, total: data.length, pages: 1 },
      }),
    });
  });

  await page.route('**/api/templates/*', async (route) => {
    const request = route.request();
    const id = request.url().split('/api/templates/')[1]?.split('?')[0];
    const template = templates.find((item) => item.id === id);

    if (!id || !template) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Template not found' }),
      });
      return;
    }

    if (request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}');
      template.name = body.name ?? template.name;
      template.description = body.description ?? template.description;
      template.category = body.category ?? template.category;
      template.conditionName = body.condition_name ?? body.conditionName ?? template.conditionName;
      template.templateVariant = body.template_variant ?? body.templateVariant ?? template.templateVariant;
      template.items = body.items ?? template.items;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: template }),
      });
      return;
    }

    if (request.method() === 'DELETE') {
      const index = templates.findIndex((item) => item.id === id);
      if (index >= 0) templates.splice(index, 1);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: template }),
    });
  });

  await page.route('**/api/protocols', async (route) => {
    if (route.request().method() === 'GET') {
      const data = [...protocols];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data,
          meta: { page: 1, limit: 500, total: data.length, pages: 1 },
        }),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const created: MockProtocol = {
        id: slug('protocol'),
        name: body.name,
        conditionName: body.conditionName || body.condition_name || 'Lombalgia',
        protocolType: body.protocolType || body.protocol_type || 'pos_operatorio',
        evidenceLevel: body.evidenceLevel || body.evidence_level || null,
        weeksTotal: body.weeksTotal || body.weeks_total || 12,
        milestones: body.milestones || [],
        restrictions: body.restrictions || [],
        progressionCriteria: body.progressionCriteria || body.progression_criteria || [],
      };
      protocols.unshift(created);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: created }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/protocols?**', async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const type = url.searchParams.get('type');
    const data = protocols.filter((protocol) => {
      const matchesQuery =
        !q ||
        protocol.name.toLowerCase().includes(q) ||
        protocol.conditionName.toLowerCase().includes(q);
      const matchesType = !type || protocol.protocolType === type;
      return matchesQuery && matchesType;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data,
        meta: { page: 1, limit: 500, total: data.length, pages: 1 },
      }),
    });
  });

  await page.route('**/api/protocols/*', async (route) => {
    const request = route.request();
    const id = request.url().split('/api/protocols/')[1]?.split('?')[0];
    const protocol = protocols.find((item) => item.id === id);

    if (!id || !protocol) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Protocol not found' }),
      });
      return;
    }

    if (request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}');
      protocol.name = body.name ?? protocol.name;
      protocol.conditionName = body.conditionName ?? body.condition_name ?? protocol.conditionName;
      protocol.protocolType = body.protocolType ?? body.protocol_type ?? protocol.protocolType;
      protocol.evidenceLevel = body.evidenceLevel ?? body.evidence_level ?? protocol.evidenceLevel;
      protocol.weeksTotal = body.weeksTotal ?? body.weeks_total ?? protocol.weeksTotal;
      protocol.milestones = body.milestones ?? protocol.milestones;
      protocol.restrictions = body.restrictions ?? protocol.restrictions;
      protocol.progressionCriteria =
        body.progressionCriteria ?? body.progression_criteria ?? protocol.progressionCriteria;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: protocol }),
      });
      return;
    }

    if (request.method() === 'DELETE') {
      const index = protocols.findIndex((item) => item.id === id);
      if (index >= 0) protocols.splice(index, 1);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...protocol, protocolExercises: [] } }),
    });
  });
}

test.describe('Worker Mutations - CRUD Flows', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    await authenticatePage(page);
    await mockExercisesBootstrap(page);

    await page.goto('/exercises?e2e=true');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
    await expect(page.getByText('Biblioteca de Exercícios')).toBeVisible({ timeout: 25000 });
  });

  test('Exercise CRUD Flow', async ({ page }) => {
    const exerciseName = `E2E Exercício ${Date.now()}`;
    const updatedName = `${exerciseName} Atualizado`;

    await page.getByRole('button', { name: 'Novo Exercício' }).click();
    await page.getByLabel('Nome*').fill(exerciseName);
    await page.getByPlaceholder('Descrição do exercício').fill('Descrição do exercício E2E');
    await page.getByRole('button', { name: 'Criar' }).click();

    await expect(page.getByText('Exercício criado com sucesso')).toBeVisible();

    const searchInput = page.getByPlaceholder('Buscar exercícios...');
    await searchInput.fill(exerciseName);
    const exerciseCard = page.locator('.group', { hasText: exerciseName }).first();
    await expect(exerciseCard).toBeVisible({ timeout: 10000 });

    await exerciseCard.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    await page.getByLabel('Nome*').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.getByLabel('Nome*').fill(updatedName);
    await page.getByRole('button', { name: 'Atualizar' }).click();

    await expect(page.getByText('Exercício atualizado com sucesso')).toBeVisible();
    await searchInput.fill(updatedName);
    const updatedCard = page.locator('.group', { hasText: updatedName }).first();
    await expect(updatedCard).toBeVisible({ timeout: 10000 });

    await updatedCard.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Excluir' }).click();
    await page.getByRole('button', { name: 'Excluir' }).last().click();

    await expect(page.getByText('Exercício excluído com sucesso')).toBeVisible();
  });

  test('Session Template CRUD Flow', async ({ page }) => {
    const templateName = `E2E Template ${Date.now()}`;

    const templatesTab = page.locator('[data-testid="tab-templates"]');
    await templatesTab.scrollIntoViewIfNeeded();
    await templatesTab.click({ force: true });
    await expect(templatesTab).toHaveAttribute('data-state', 'active', { timeout: 10000 });
    await expect(page.getByText('Templates de Exercícios')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Novo Template' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Novo Template' }).click();
    const dialog = page.getByRole('dialog').last();
    await expect(dialog.getByText('Novo Template de Exercícios')).toBeVisible({ timeout: 10000 });

    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Patologia' }).click();
    await dialog.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'Lombalgia' }).click();
    await dialog.getByLabel('Nome').fill(templateName);
    await dialog.getByRole('button', { name: 'Criar' }).click();

    await expect(page.getByText('Template criado com sucesso')).toBeVisible();

    const searchInput = page.getByPlaceholder('Buscar templates...');
    await searchInput.fill(templateName);
    const templateTitle = page.locator('h4', { hasText: templateName }).first();
    await expect(templateTitle).toBeVisible({ timeout: 10000 });

    const card = templateTitle.locator('xpath=ancestor::div[contains(@class,"cursor-pointer")]').first();
    await card.hover();
    await card.locator('button').last().click();
    await page.getByRole('button', { name: 'Excluir' }).last().click();

    await expect(page.getByText('Template excluído com sucesso')).toBeVisible();
  });

  test('Exercise Protocol CRUD Flow', async ({ page }) => {
    const protocolName = `E2E Protocolo ${Date.now()}`;

    const protocolsTab = page.locator('[data-testid="tab-protocols"]');
    await protocolsTab.scrollIntoViewIfNeeded();
    await protocolsTab.click({ force: true });
    await expect(protocolsTab).toHaveAttribute('data-state', 'active', { timeout: 10000 });
    await expect(page.getByRole('button', { name: 'NOVO PROTOCOLO' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'NOVO PROTOCOLO' }).click();
    const dialog = page.getByRole('dialog').last();
    await expect(dialog.getByRole('heading', { name: 'Criar Novo Protocolo' }).nth(1)).toBeVisible({ timeout: 10000 });

    await dialog.getByPlaceholder(/Reabilitação LCA/i).fill(protocolName);
    await dialog.getByPlaceholder(/LCA, Menisco/i).fill('LCA');
    await dialog.locator('input[type="number"]').fill('8');
    await dialog.getByRole('button', { name: 'Continuar' }).click();
    await dialog.getByRole('button', { name: 'Continuar' }).click();
    await dialog.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Protocolo criado com sucesso')).toBeVisible();

    await page.getByPlaceholder('Buscar protocolo...').fill(protocolName);
    const protocolTitle = page.getByText(protocolName).first();
    await expect(protocolTitle).toBeVisible({ timeout: 10000 });
  });
});
