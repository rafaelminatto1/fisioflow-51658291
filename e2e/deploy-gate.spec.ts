import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { authenticateBrowserContext, getSharedBearer } from './helpers/neon-auth';

const WORKERS_BASE =
  (process.env.VITE_WORKERS_API_URL || 'https://fisioflow-api.rafalegollas.workers.dev').replace(/\/$/, '');
const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';
const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;

async function mockOrganizationBootstrap(page: Page) {
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
}

async function expectAuthenticatedShell(page: Page) {
  await expect(
    page.locator('main, nav, [data-testid="main-layout"], a[href="/agenda"], a[href="/dashboard"]').first(),
  ).toBeVisible({ timeout: 30000 });
}

async function getNeonBearerFromHttpSession(): Promise<string> {
  return getSharedBearer(loginEmail, loginPassword);
}

async function authenticatePage(page: Page) {
  const neonAuthUrl = process.env.VITE_NEON_AUTH_URL;

  expect(neonAuthUrl, 'VITE_NEON_AUTH_URL ausente no ambiente do teste').toBeTruthy();
  await authenticateBrowserContext(page.context(), loginEmail, loginPassword);
}

test.describe('Deploy Gate - Fluxo Critico', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await authenticatePage(page);
    await mockOrganizationBootstrap(page);
  });

  test('auth: sessão válida e app carregado', async ({ page }) => {
    await page.goto('/agenda?e2e=true');
    await expectAuthenticatedShell(page);
  });

  test('patients: endpoint autenticado responde 200', async ({ page, request }) => {
    await page.goto('/patients?e2e=true');
    await expectAuthenticatedShell(page);
    const auth = await getNeonBearerFromHttpSession();
    const response = await request.get(`${WORKERS_BASE}/api/patients`, {
      headers: { Authorization: auth },
    });
    expect(response.status()).toBe(200);
  });

  test('appointments: endpoint autenticado responde 200', async ({ page, request }) => {
    await page.goto('/agenda?e2e=true');
    await expectAuthenticatedShell(page);
    const auth = await getNeonBearerFromHttpSession();
    const response = await request.get(`${WORKERS_BASE}/api/appointments`, {
      headers: { Authorization: auth },
    });
    expect(response.status()).toBe(200);
  });

  test('r2: upload-url + PUT no objeto com JWT Neon', async ({ page, request }) => {
    await page.goto('/exercises?e2e=true');
    await expectAuthenticatedShell(page);
    const auth = await getNeonBearerFromHttpSession();

    const presign = await request.post(`${WORKERS_BASE}/api/media/upload-url`, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      data: {
        filename: 'gate-image.png',
        contentType: 'image/png',
        folder: 'e2e-gate',
      },
    });
    expect(presign.status()).toBe(200);

    const presignJson = await presign.json();
    const uploadUrl = presignJson?.data?.uploadUrl as string | undefined;
    const publicUrl = presignJson?.data?.publicUrl as string | undefined;
    const key = presignJson?.data?.key as string | undefined;
    expect(uploadUrl).toBeTruthy();
    expect(key).toContain('e2e-gate/');
    expect(publicUrl).toBeTruthy();

    const put = await request.put(uploadUrl!, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      data: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0+X9sAAAAASUVORK5CYII=',
        'base64',
      ),
    });

    expect(put.status(), 'upload PUT para R2 falhou').toBeGreaterThanOrEqual(200);
    expect(put.status(), 'upload PUT para R2 falhou').toBeLessThan(300);
  });
});
