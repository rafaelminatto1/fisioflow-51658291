import { expect, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || process.env.VITE_PAGES_URL || "https://www.moocafisio.com.br";
const API_URL =
  process.env.VITE_WORKERS_API_URL || "https://fisioflow-api.rafalegollas.workers.dev";
const NEON_AUTH_URL = process.env.VITE_NEON_AUTH_URL || "";
const EMAIL = process.env.TEST_USER_EMAIL || "";
const PASSWORD = process.env.TEST_USER_PASSWORD || "";

async function login(page: Parameters<(typeof test)["extend"]>[0] extends never ? never : any) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "domcontentloaded" });
  if (!/\/auth|\/login/.test(page.url())) {
    return;
  }

  const emailInput = page.locator('input[type="email"], input[name="email"], #login-email').first();
  const passwordInput = page
    .locator('input[type="password"], input[name="password"], #login-password')
    .first();
  const submitButton = page
    .locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")')
    .first();

  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await passwordInput.waitFor({ state: "visible", timeout: 15000 });

  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);
  await submitButton.click().catch(async () => {
    await page.keyboard.press("Enter");
  });
  await page.waitForURL(/\/(agenda|dashboard)/, { timeout: 30000 });
}

async function apiFetch<T>(
  page: Parameters<(typeof test)["extend"]>[0] extends never ? never : any,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ url, init, neonAuthUrl }) => {
      let jwt: string | null = null;
      if (neonAuthUrl) {
        try {
          const sessionResponse = await fetch(`${neonAuthUrl}/get-session`, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          jwt = sessionResponse.headers.get("set-auth-jwt");
        } catch {
          jwt = null;
        }
      }

      const response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          ...(init?.headers || {}),
        },
      });
      const body = await response.json().catch(() => null);
      return { status: response.status, body };
    },
    { url: `${API_URL}${path}`, init, neonAuthUrl: NEON_AUTH_URL },
  );
}

test.describe("Legacy features smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, "TEST_USER_EMAIL/TEST_USER_PASSWORD não configurados.");
    await login(page);
  });

  test("import dry-run e risk_of_no_show respondem sem regressão", async ({ page }) => {
    const importResponse = await apiFetch<{
      summary?: { totalPatients: number };
      results?: Array<{ status: string }>;
    }>(page, "/api/import/legacy-data", {
      method: "POST",
      body: JSON.stringify({
        replaceExisting: true,
        dryRun: true,
        patients: [
          {
            fullName: `Paciente Smoke ${Date.now()}`,
            legacyId: `smoke-${Date.now()}`,
            evolutions: [
              {
                date: "2026-06-01",
                observacao: "Paciente relata melhora clínica no smoke test.",
                status: "finalized",
              },
            ],
          },
        ],
      }),
    });

    expect(importResponse.status).toBe(200);
    expect(importResponse.body.summary?.totalPatients).toBe(1);
    expect(importResponse.body.results?.[0]?.status).toBe("wouldImport");

    const today = new Date().toISOString().slice(0, 10);
    const appointmentsResponse = await apiFetch<{ data?: Array<Record<string, unknown>> }>(
      page,
      `/api/appointments?dateFrom=${today}&dateTo=${today}&limit=10`,
    );

    expect(appointmentsResponse.status).toBe(200);
    for (const row of appointmentsResponse.body.data ?? []) {
      expect(Object.prototype.hasOwnProperty.call(row, "risk_of_no_show")).toBeTruthy();
    }
  });

  test("resumo IA e fluxo Antes/Depois aparecem na interface", async ({ page }) => {
    const appointmentsResponse = await apiFetch<{ data?: Array<{ id: string }> }>(
      page,
      "/api/appointments?limit=1",
    );
    expect(appointmentsResponse.status).toBe(200);
    expect((appointmentsResponse.body.data ?? []).length).toBeGreaterThan(0);

    const appointmentId = appointmentsResponse.body.data?.[0]?.id;
    expect(appointmentId).toBeTruthy();

    await page.goto(`${BASE_URL}/patient-evolution/${appointmentId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL(/patient-evolution|session-evolution/i, { timeout: 20000 });
    await expect(
      page.locator('button:has-text("RESUMO IA"), button:has-text("Gerar resumo com IA")').first(),
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /mídia/i }).click();
    await expect(
      page.locator('button:has-text("Antes/Depois"), button:has-text("Comparar")').first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
