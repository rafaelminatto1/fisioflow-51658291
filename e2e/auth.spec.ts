import { expect, type Page, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { testUsers } from "./fixtures/test-data";

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword =
	process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";

async function mockOrganizationBootstrap(page: Page) {
	await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				data: {
					id: TEST_ORG_ID,
					name: "Organização E2E",
					slug: "organizacao-e2e",
					settings: {},
					active: true,
					created_at: null,
					updated_at: null,
				},
			}),
		});
	});

	await page.route(`**/api/organization-members?**`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				data: [
					{
						id: "member-e2e-admin",
						organization_id: TEST_ORG_ID,
						user_id: "user-e2e-admin",
						role: "admin",
						active: true,
						joined_at: new Date().toISOString(),
						profiles: {
							full_name: "Admin E2E",
							email: loginEmail,
						},
					},
				],
				total: 1,
			}),
		});
	});
}

async function expectAuthenticatedShell(page: Page) {
	await page.waitForLoadState("networkidle", { timeout: 30000 });
	await expect(
		page
			.locator(
				'main, nav, [data-testid="main-layout"], a[href="/agenda"], a[href="/dashboard"]',
			)
			.first(),
	).toBeVisible({ timeout: 30000 });
}

test.describe("Autenticação", () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test("deve fazer login com credenciais válidas", async ({ page }) => {
		console.log(`[Test] Iniciando login para: ${loginEmail}`);
		await mockOrganizationBootstrap(page);
		await page.goto("/auth", { waitUntil: "domcontentloaded" });

		// Aguardar React carregar completamente (sem depender do loader)
		console.log("[Test] Aguardando React carregar e renderizar formulário...");
		await page.waitForTimeout(3000);

		console.log("[Test] Procurando input de email...");
		const emailInput = page.locator('[data-testid="auth-email-input"]');
		await emailInput.waitFor({ state: "visible", timeout: 30000 });
		console.log("[Test] Input de email encontrado!");

		console.log("[Test] Procurando input de password...");
		const passwordInput = page.locator('[data-testid="auth-password-input"]');
		await passwordInput.waitFor({ state: "visible", timeout: 30000 });
		console.log("[Test] Input de password encontrado!");

		await emailInput.fill(loginEmail);
		await passwordInput.fill(loginPassword);

		console.log("[Test] Clicando no botão de submit...");
		await page.click('[data-testid="auth-submit-button"]');

		console.log(
			"[Test] Clique no submit realizado, aguardando redirecionamento...",
		);

		await page.waitForURL(
			(url) =>
				url.pathname.includes("/agenda") ||
				url.pathname.includes("/dashboard") ||
				url.pathname === "/",
			{
				timeout: 40000,
			},
		);

		console.log(`[Test] Redirecionado para: ${page.url()}`);

		await expectAuthenticatedShell(page);

		console.log(
			"[Test] Login validado com sucesso (shell autenticado visível)",
		);
	});

	test("deve mostrar erro com credenciais inválidas", async ({ page }) => {
		await page.goto("/auth", { waitUntil: "domcontentloaded" });

		// Aguardar React carregar completamente (sem depender do loader)
		console.log("[Test] Aguardando React carregar e renderizar formulário...");
		await page.waitForTimeout(3000);

		const emailInput = page.locator('[data-testid="auth-email-input"]');
		const passwordInput = page.locator('[data-testid="auth-password-input"]');

		await emailInput.waitFor({ state: "visible", timeout: 30000 });
		await passwordInput.waitFor({ state: "visible", timeout: 30000 });

		await emailInput.fill("invalido@example.com");
		await passwordInput.fill("senhaErrada123");
		await page.click('[data-testid="auth-submit-button"]');

		await expect(page.locator('[data-testid="login-error"]')).toBeVisible({
			timeout: 15000,
		});
	});
});
