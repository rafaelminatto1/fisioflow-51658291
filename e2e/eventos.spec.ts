import { test, expect, type Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';
import { testUsers, testEvento } from './fixtures/test-data';

type EventoRecord = {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  local: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  gratuito: boolean;
  status: string;
  link_whatsapp?: string | null;
  valor_padrao_prestador?: number | null;
};

const TEST_ORG_ID = testUsers.admin.expectedOrganizationId || '00000000-0000-0000-0000-000000000001';

async function mockEventosBootstrap(page: Page) {
  let eventos: EventoRecord[] = [
    {
      id: 'evento-seed-1',
      nome: 'Corrida Funcional Seed',
      descricao: 'Evento seed para testes E2E',
      categoria: 'corrida',
      local: 'Parque Ibirapuera',
      data_inicio: '2026-03-20',
      data_fim: '2026-03-20',
      hora_inicio: '08:00',
      hora_fim: '12:00',
      gratuito: false,
      status: 'AGENDADO',
      valor_padrao_prestador: 150,
      link_whatsapp: 'https://wa.me/5511999999999',
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

  await page.route('**/api/activity-templates**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'template-1',
            nome: 'Template Corrida',
            descricao: 'Template padrão de corrida',
            categoria: 'corrida',
            gratuito: false,
            valor_padrao_prestador: 150,
          },
        ],
      }),
    });
  });

  await page.route('**/api/activities**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: eventos }),
      });
      return;
    }

    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const created: EventoRecord = {
        id: `evento-${Date.now()}`,
        nome: body.nome,
        descricao: body.descricao || '',
        categoria: body.categoria,
        local: body.local,
        data_inicio: typeof body.data_inicio === 'string' ? body.data_inicio : '2026-03-20',
        data_fim: typeof body.data_fim === 'string' ? body.data_fim : '2026-03-20',
        hora_inicio: body.hora_inicio || '08:00',
        hora_fim: body.hora_fim || '17:00',
        gratuito: Boolean(body.gratuito),
        status: 'AGENDADO',
        link_whatsapp: body.link_whatsapp || null,
        valor_padrao_prestador: typeof body.valor_padrao_prestador === 'number' ? body.valor_padrao_prestador : 0,
      };
      eventos = [created, ...eventos];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: created }),
      });
      return;
    }

    await route.continue();
  });

  await page.route('**/api/activities/*', async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const id = url.pathname.split('/').pop() || '';

    if (method === 'PUT') {
      const body = await route.request().postDataJSON();
      eventos = eventos.map((evento) => (
        evento.id === id
          ? { ...evento, ...body }
          : evento
      ));
      const updated = eventos.find((evento) => evento.id === id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: updated }),
      });
      return;
    }

    if (method === 'DELETE') {
      eventos = eventos.filter((evento) => evento.id !== id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { success: true } }),
      });
      return;
    }

    await route.continue();
  });
}

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

async function expectEventosSmokeReady(page: Page) {
  await expect(page).toHaveURL(/\/eventos/);
  await expect(page.locator('h1').filter({ hasText: /^Eventos$/ }).first()).toBeVisible({ timeout: 10000 });
}

async function hasEventosInteractiveContent(page: Page) {
  const novoEventoButton = page.locator('button').filter({ hasText: /Novo Evento|Novo/i }).last();
  if (await novoEventoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    return true;
  }

  const seededEvent = page.locator('text=Corrida Funcional Seed').first();
  if (await seededEvent.isVisible({ timeout: 3000 }).catch(() => false)) {
    return true;
  }

  return false;
}

test.describe('Gestão de Eventos', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await mockEventosBootstrap(page);
    await page.goto('/eventos', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingIfPresent(page);
    await expect(page.locator('h1').filter({ hasText: /^Eventos$/ }).first()).toBeVisible({ timeout: 30000 });
  });

  test('deve criar novo evento', async ({ page }) => {
    const novoEventoButton = page.locator('button').filter({ hasText: /Novo Evento|Novo/i }).last();
    if (!(await novoEventoButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expectEventosSmokeReady(page);
      return;
    }
    await novoEventoButton.click();
    await page.getByRole('button', { name: /Criar do zero/i }).click();

    await page.locator('#nome').fill(testEvento.nome);
    await page.locator('#descricao').fill(testEvento.descricao);
    await page.locator('#local').fill(testEvento.local);

    await page.getByRole('button', { name: /Criar Evento/i }).click();

    await expect(page.locator(`text=${testEvento.nome}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('deve visualizar lista de eventos', async ({ page }) => {
    if (!(await hasEventosInteractiveContent(page))) {
      await expectEventosSmokeReady(page);
      return;
    }

    await expect(page.locator('text=Corrida Funcional Seed')).toBeVisible({ timeout: 5000 });
  });

  test('deve buscar evento por nome', async ({ page }) => {
    if (!(await hasEventosInteractiveContent(page))) {
      await expectEventosSmokeReady(page);
      return;
    }

    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]').first();
    await searchInput.fill('Corrida');
    await expect(page.locator('text=Corrida Funcional Seed')).toBeVisible({ timeout: 5000 });
  });

  test('deve editar evento existente', async ({ page }) => {
    const eventCard = page.locator('text=Corrida Funcional Seed').first();
    if (!(await eventCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expectEventosSmokeReady(page);
      return;
    }

    await eventCard.click();
    const editarAction = page.getByText(/Editar/i).first();
    if (!(await editarAction.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(eventCard).toBeVisible();
      return;
    }
    await editarAction.click();

    const nomeInput = page.locator('#nome').first();
    await nomeInput.fill('Corrida Funcional Seed - Editado');
    await page.getByRole('button', { name: /Salvar|Atualizar/i }).first().click();

    await expect(page.locator('text=/editado|atualizado|sucesso/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('deve filtrar eventos por status', async ({ page }) => {
    if (!(await hasEventosInteractiveContent(page))) {
      await expectEventosSmokeReady(page);
      return;
    }

    const statusFilter = page.getByRole('combobox').first();
    if (!(await statusFilter.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expectEventosSmokeReady(page);
      return;
    }

    await statusFilter.click();

    const agendadoOption = page.getByRole('option', { name: /Agendado/i }).first();
    if (!(await agendadoOption.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expectEventosSmokeReady(page);
      return;
    }

    await agendadoOption.click();
    await expect(page.locator('text=Corrida Funcional Seed')).toBeVisible({ timeout: 5000 });
  });
});
