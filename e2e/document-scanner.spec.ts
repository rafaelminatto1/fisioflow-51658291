import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { authenticateBrowserContext } from './helpers/neon-auth';

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';

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
}

async function mockScannerBootstrap(page: Page) {
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

  await page.route('**/api/patients?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Paciente Scanner Teste',
            full_name: 'Paciente Scanner Teste',
            cpf: '12345678901',
            phone: '11999999999',
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Outro Paciente',
            full_name: 'Outro Paciente',
            cpf: '98765432100',
            phone: '11888888888',
          },
        ],
        total: 2,
      }),
    });
  });
}

test.describe('Document Scanner', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('autocomplete de paciente aceita digitação e exibe resultados', async ({ page }) => {
    await authenticateBrowserContext(page.context(), testUsers.rafael.email, testUsers.rafael.password);
    await mockScannerBootstrap(page);
    await page.goto('/ai/scanner?e2e=true', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingIfPresent(page);

    await expect(page.getByRole('heading', { name: /Digitalizador Inteligente de Laudos/i })).toBeVisible({ timeout: 15000 });

    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3+K4QAAAAASUVORK5CYII=',
      'base64',
    );
    await page.setInputFiles('input[type="file"]', {
      name: 'scanner-test.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    const comboboxButton = page.getByTestId('patient-select');
    await comboboxButton.click();

    const searchInput = page.getByTestId('patient-search');
    await searchInput.fill('paciente');
    await expect(searchInput).toHaveValue('paciente');

    const resultOption = page.getByRole('option').filter({ hasText: /Paciente Scanner Teste/i }).first();
    await expect(resultOption).toBeVisible({ timeout: 10000 });
  });
});

