import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";

test.use({ storageState: { cookies: [], origins: [] } });

test("abre a Central de Notas autenticada em produção", async ({ page, baseURL }) => {
  test.skip(!email || !password, "Defina E2E_EMAIL e E2E_PASSWORD para validar produção.");

  await page.goto(`${baseURL}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"], #login-email').first().fill(email);
  await page.locator('input[type="password"], input[name="password"], #login-password').first().fill(password);
  await page.getByRole("button", { name: /acessar|entrar|login/i }).first().click();
  await page.waitForURL((url) => !url.pathname.includes("/auth") && !url.pathname.includes("/login"), { timeout: 30_000 });

  await page.goto(`${baseURL}/notes`, { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/auth|\/login/);
  await expect(page.getByText("Minhas notas").first()).toBeVisible({ timeout: 20_000 });
});
