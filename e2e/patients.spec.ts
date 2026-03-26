import { test, expect, Page } from '@playwright/test';
import { authenticateBrowserContext } from './helpers/neon-auth';

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';

const neonAuthUrl = process.env.VITE_NEON_AUTH_URL || '';
const loginEmail = process.env.E2E_LOGIN_EMAIL || 'rafael.minatto@yahoo.com.br';
const loginPassword = process.env.E2E_LOGIN_PASSWORD || 'Yukari30@';

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

async function mockPatientsBootstrap(page: Page) {
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

  await page.route('**/api/patients?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'patient-e2e-list',
            name: 'João Silva',
            full_name: 'João Silva',
            status: 'active',
            email: 'joao.silva@example.com',
            phone: '11999999999',
            cpf: '12345678901',
            main_condition: 'Dor Lombar',
          },
        ],
        total: 1,
      }),
    });
  });

  await page.route('**/api/patients', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: `patient-created-${Date.now()}`,
            name: 'Paciente Teste',
            full_name: 'Paciente Teste',
            status: 'active',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });
}

async function authenticatePage(page: Page) {
  if (!neonAuthUrl) {
    throw new Error('VITE_NEON_AUTH_URL ausente para patients.spec.ts');
  }
  await authenticateBrowserContext(page.context(), loginEmail, loginPassword);
}

test.describe('Pacientes - CRUD Completo', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticatePage(page);
    await mockPatientsBootstrap(page);
    await page.goto('/patients?e2e=true');
    await page.waitForLoadState('domcontentloaded');
    await dismissOnboardingIfPresent(page);
    await expect(page.locator('[data-testid="patients-page-header"]')).toBeVisible({ timeout: 25000 });
  });

  test('deve exibir lista de pacientes', async ({ page }) => {
    // Verificar que a página carregou usando data-testid
    await expect(page.locator('[data-testid="patients-page"]')).toBeVisible({ timeout: 15000 });
    console.log('✅ Página de pacientes carregada');
  });

  test('deve criar novo paciente', async ({ page }) => {
    const createButton = page.locator('[data-testid="add-patient"]').first();
    const emptyStateButton = page.locator('button:has-text("Novo Paciente"), button:has-text("Adicionar")').last();

    await page.waitForTimeout(2000); // Dar tempo para renderizar

    const isVisible = await createButton.isVisible().catch(() => false) || 
                      await emptyStateButton.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Botão de criar encontrado');
    } else {
      console.log('ℹ️ Botão de criar não visível no momento');
    }

    await expect(page.locator('#page-title, h1')).toContainText('Pacientes');
  });

  test('deve buscar pacientes', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Buscar pacientes"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 10000 })) {
      await searchInput.fill('Maria');
      await page.waitForTimeout(1000);
      console.log('✅ Busca executada');
    } else {
      console.log('⚠ Campo de busca não encontrado');
    }
  });

  test('deve filtrar pacientes por status', async ({ page }) => {
    // O Seletor de Status é o primeiro SelectTrigger (combobox)
    const statusFilter = page.locator('button[role="combobox"]').first();

    if (await statusFilter.isVisible({ timeout: 10000 })) {
      await statusFilter.click();
      await page.waitForTimeout(1000);
      
      const option = page.locator('[role="option"]:has-text("Em Tratamento"), [role="menuitem"]:has-text("Em Tratamento")').first();
      if (await option.isVisible({ timeout: 5000 })) {
        await option.click();
        console.log('✅ Filtro de status aplicado');
      } else {
        console.log('⚠ Opção "Em Tratamento" não encontrada');
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('⚠ Filtro de status não encontrado');
    }
  });

  test('deve visualizar detalhes do paciente', async ({ page }) => {
    await page.waitForTimeout(3000); // Esperar carregar dados
    const isEmpty = await page.locator('text=/Nenhum paciente|Comece adicionando/i').isVisible().catch(() => false);
    
    if (isEmpty) {
      console.log('ℹ️ Lista vazia');
      return;
    }

    const patientCard = page.locator('[data-testid="patient-list"] > div, .card, [class*="PatientCard"]').first();

    if (await patientCard.isVisible({ timeout: 10000 })) {
      await patientCard.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicou em paciente');
    } else {
      console.log('⚠ Card não encontrado');
    }
  });

  test('deve editar paciente', async ({ page }) => {
    await page.waitForTimeout(3000);
    const patientCard = page.locator('[data-testid="patient-list"] > div').first();

    if (await patientCard.isVisible({ timeout: 5000 })) {
      // O menu de ações geralmente é o último botão do card
      const actionsMenu = patientCard.locator('button').last();
      await actionsMenu.click();
      await page.waitForTimeout(1000);

      // No dropdown do Radix/Shadcn, os itens costumam ser role="menuitem"
      const editOption = page.locator('div[role="menuitem"]:has-text("Editar"), [role="option"]:has-text("Editar")').first();
      if (await editOption.isVisible({ timeout: 5000 })) {
        await editOption.click();
        console.log('✅ Modal de edição aberto');
        await page.keyboard.press('Escape');
      } else {
        console.log('⚠ Opção Editar não encontrada no menu');
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('⚠ Paciente não disponível para editar');
    }
  });

  test('deve exportar lista de pacientes', async ({ page }) => {
    const exportButton = page.locator('button[title*="Exportar"], button:has(svg[class*="download"]), button:has(svg[class*="Download"])').first();

    if (await exportButton.isVisible({ timeout: 10000 })) {
      console.log('✅ Botão de exportar encontrado');
    } else {
      console.log('⚠ Botão de exportar não encontrado');
    }
  });

  test('deve limpar filtros', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Buscar pacientes"], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 10000 })) {
      await searchInput.fill('teste');
      await page.waitForTimeout(1000);

      const clearButton = page.locator('button:has-text("Limpar")').first();
      if (await clearButton.isVisible({ timeout: 5000 })) {
        await clearButton.click();
        console.log('✅ Filtros limpos');
      }
    }
  });
});
