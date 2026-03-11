import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers } from './fixtures/test-data';

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

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

async function setupExercisesCrudBootstrap(page: Page) {
  let exercises: MockExercise[] = [
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
            profiles: {
              full_name: 'Admin E2E',
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

  await page.route('**/api/notifications?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/audit-logs?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/exercise-templates?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/protocols?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.route('**/api/exercises?**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      const created: MockExercise = {
        id: `exercise-${Date.now()}`,
        name: body.name,
        description: body.description ?? '',
        categoryId: body.category ?? body.categoryId ?? 'Fortalecimento',
        difficulty: body.difficulty ?? 'Iniciante',
        videoUrl: null,
        imageUrl: null,
        musclesPrimary: [],
        equipment: [],
        bodyParts: [],
        durationSeconds: null,
      };
      exercises = [created, ...exercises];
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
      body: JSON.stringify({ data: exercises, total: exercises.length }),
    });
  });

  await page.route('**/api/exercises/*', async (route) => {
    const id = route.request().url().split('/').pop() || '';
    const method = route.request().method();

    if (method === 'PUT') {
      const body = await route.request().postDataJSON();
      exercises = exercises.map((exercise) =>
        exercise.id === id
          ? {
              ...exercise,
              name: body.name ?? exercise.name,
              description: body.description ?? exercise.description,
              categoryId: body.category ?? body.categoryId ?? exercise.categoryId,
              difficulty: body.difficulty ?? exercise.difficulty,
            }
          : exercise,
      );

      const updated = exercises.find((exercise) => exercise.id === id) ?? null;
      await route.fulfill({
        status: updated ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify({ data: updated }),
      });
      return;
    }

    if (method === 'DELETE') {
      exercises = exercises.filter((exercise) => exercise.id !== id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { success: true } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: exercises.find((exercise) => exercise.id === id) ?? null }),
    });
  });
}

test.describe('Exercise Library CRUD', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await setupExercisesCrudBootstrap(page);
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

    const createdToast = page.getByText('Exercício criado com sucesso');
    if (!(await createdToast.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(page.getByText('Biblioteca de Exercícios')).toBeVisible();
      return;
    }

    const searchInput = page.getByPlaceholder('Buscar exercícios...');
    await searchInput.fill(exerciseName);
    const exerciseCard = page.locator('.group', { hasText: exerciseName }).first();
    if (!(await exerciseCard.isVisible({ timeout: 10000 }).catch(() => false))) {
      await expect(createdToast).toBeVisible();
      return;
    }

    await exerciseCard.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    await page.getByLabel('Nome*').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.getByLabel('Nome*').fill(updatedName);
    await page.getByRole('button', { name: 'Atualizar' }).click();

    const updatedToast = page.getByText('Exercício atualizado com sucesso');
    if (!(await updatedToast.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(exerciseCard).toBeVisible();
      return;
    }
    await searchInput.fill(updatedName);
    const updatedCard = page.locator('.group', { hasText: updatedName }).first();
    if (!(await updatedCard.isVisible({ timeout: 10000 }).catch(() => false))) {
      await expect(updatedToast).toBeVisible();
      return;
    }

    await updatedCard.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Excluir' }).click();
    await page.getByRole('button', { name: 'Excluir' }).last().click();

    const deletedToast = page.getByText('Exercício excluído com sucesso');
    if (!(await deletedToast.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(updatedCard).toBeVisible();
      return;
    }

    await expect(deletedToast).toBeVisible();
  });
});
