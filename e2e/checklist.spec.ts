import { expect, test, type Page } from '@playwright/test';
import { testChecklistItem, testUsers } from './fixtures/test-data';
import { authenticateBrowserContext } from './helpers/neon-auth';

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEST_EVENT_ID = 'evento-e2e-checklist';

function buildChecklistItems() {
  return [
    {
      id: 'check-1',
      evento_id: TEST_EVENT_ID,
      titulo: 'Cadeira dobrável',
      tipo: 'levar',
      quantidade: 2,
      custo_unitario: 25,
      status: 'ABERTO',
    },
    {
      id: 'check-2',
      evento_id: TEST_EVENT_ID,
      titulo: 'Tenda',
      tipo: 'alugar',
      quantidade: 1,
      custo_unitario: 200,
      status: 'OK',
    },
  ];
}

async function dismissOnboardingIfPresent(page: Page) {
  const onboardingDialog = page
    .locator('[role="dialog"]')
    .filter({ has: page.getByText(/Bem-vindo ao FisioFlow/i) })
    .first();

  if (!(await onboardingDialog.isVisible({ timeout: 2000 }).catch(() => false))) return;

  const closeButton = onboardingDialog.getByRole('button', { name: /Close|Fechar/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ force: true });
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }

  await expect(onboardingDialog).toBeHidden({ timeout: 5000 });
}

async function mockChecklistFlow(page: Page) {
  const checklistItems = buildChecklistItems();

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
            profiles: { full_name: 'Admin E2E', email: 'admin@e2e.local' },
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

  for (const endpoint of ['notifications', 'audit-logs']) {
    await page.route(`**/api/${endpoint}?**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
  }

  await page.route(`**/api/eventos/${TEST_EVENT_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_EVENT_ID,
          nome: 'Evento E2E Checklist',
          descricao: 'Evento de teste',
          categoria: 'workshop',
          local: 'Auditório',
          data_inicio: '2026-03-10',
          data_fim: '2026-03-10',
          gratuito: true,
          status: 'AGENDADO',
        },
      }),
    });
  });

  await page.route(`**/api/checklist?**`, async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: checklistItems }),
      });
      return;
    }

    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'check-created',
            evento_id: TEST_EVENT_ID,
            titulo: testChecklistItem.titulo,
            tipo: testChecklistItem.tipo,
            quantidade: testChecklistItem.quantidade,
            custo_unitario: testChecklistItem.custoUnitario,
            status: 'ABERTO',
          },
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.route('**/api/checklist/**', async (route) => {
    const method = route.request().method();

    if (method === 'PUT') {
      const url = route.request().url();
      const id = url.split('/').pop() || 'check-1';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id,
            evento_id: TEST_EVENT_ID,
            titulo: id === 'check-1' ? 'Cadeira dobrável' : 'Tenda',
            tipo: id === 'check-1' ? 'levar' : 'alugar',
            quantidade: 10,
            custo_unitario: id === 'check-1' ? 25 : 200,
            status: 'OK',
          },
        }),
      });
      return;
    }

    if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    window.confirm = () => true;
  });
}

test.describe('Gestão de Checklist', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.admin.email, testUsers.admin.password);
    await mockChecklistFlow(page);
    await page.goto(`/eventos/${TEST_EVENT_ID}?e2e=true`);
    await dismissOnboardingIfPresent(page);
    await page.getByRole('tab', { name: /Checklist/i }).click();
    await expect(page.getByText('Checklist').first()).toBeVisible({ timeout: 15000 });
  });

  test('deve renderizar itens do checklist', async ({ page }) => {
    await expect(page.getByText('Cadeira dobrável')).toBeVisible();
    await expect(page.getByText('Tenda')).toBeVisible();
  });

  test('deve exibir status e tipos dos itens', async ({ page }) => {
    await expect(page.getByText(/Levar/i).first()).toBeVisible();
    await expect(page.getByText(/Alugar/i).first()).toBeVisible();
    await expect(page.getByText(/R\$ 25\.00/i)).toBeVisible();
  });

  test('deve visualizar totais por tipo', async ({ page }) => {
    await expect(page.getByText(/Total: R\$/i)).toBeVisible();
    await expect(page.getByText(/levar: R\$/i)).toBeVisible();
    await expect(page.getByText(/alugar: R\$/i)).toBeVisible();
  });

  test('deve permitir filtrar itens por tipo', async ({ page }) => {
    await page.getByRole('button', { name: /Levar \(1\)/i }).click();
    await expect(page.getByText('Cadeira dobrável')).toBeVisible();
    await expect(page.getByText('Tenda')).not.toBeVisible();
  });

  test('deve mostrar estado vazio ao filtrar um tipo sem itens', async ({ page }) => {
    await page.getByRole('button', { name: /Comprar \(0\)/i }).click();
    await expect(page.getByText(/Nenhum item para comprar\./i)).toBeVisible();
  });
});
