import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const WORKERS_BASE =
  (process.env.VITE_WORKERS_API_URL || 'https://fisioflow-api.rafalegollas.workers.dev').replace(/\/$/, '');

async function captureNeonBearerFromPage(page: import('@playwright/test').Page, routeFragment: string): Promise<string> {
  const response = await page.waitForResponse(
    (resp) =>
      resp.url().includes(routeFragment) &&
      resp.request().method() === 'GET' &&
      resp.status() === 200,
    { timeout: 30000 },
  );

  const headers = response.request().headers();
  const auth = headers.authorization || headers.Authorization;
  expect(auth, `Authorization ausente na chamada ${routeFragment}`).toBeTruthy();
  expect(auth?.startsWith('Bearer ')).toBeTruthy();
  return auth!;
}

test.describe('Deploy Gate - Fluxo Critico', () => {
  test('auth: sessão válida e app carregado', async ({ page }) => {
    await page.goto('/agenda?e2e=true');
    await expect(page.locator('[data-testid="user-menu"]').first()).toBeVisible({ timeout: 30000 });
  });

  test('patients: endpoint autenticado responde 200', async ({ page }) => {
    await page.goto('/patients?e2e=true');
    const auth = await captureNeonBearerFromPage(page, '/api/patients');
    expect(auth.length).toBeGreaterThan(20);
  });

  test('appointments: endpoint autenticado responde 200', async ({ page }) => {
    await page.goto('/agenda?e2e=true');
    const auth = await captureNeonBearerFromPage(page, '/api/appointments');
    expect(auth.length).toBeGreaterThan(20);
  });

  test('r2: upload-url + PUT no objeto com JWT Neon', async ({ page, request }) => {
    await page.goto('/exercises?e2e=true');
    const auth = await captureNeonBearerFromPage(page, '/api/exercises');

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
