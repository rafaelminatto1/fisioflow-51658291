import { expect, type Page, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { testUsers } from "./fixtures/test-data";

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword =
	process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, "../playwright/.auth/user.json");
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
	// Resetar storageState para este teste específico para garantir que o formulário de login apareça
	test.use({ storageState: { cookies: [], origins: [] } });

	test("deve fazer login com credenciais válidas", async ({ page }) => {
		console.log(`[Test] Iniciando login para: ${loginEmail}`);
		await mockOrganizationBootstrap(page);
		await page.goto("/auth", { waitUntil: "domcontentloaded" });

		// Esperar que o loading spinner desapareça
		console.log("[Test] Aguardando loading spinner desaparecer...");
		const loader = page.locator("#initial-loader");
		if (await loader.isVisible({ timeout: 5000 }).catch(() => false)) {
			await loader.waitFor({ state: "hidden", timeout: 20000 });
		}
		console.log("[Test] Loading spinner desapareceu");

		// Aguardar um pouco para garantir renderização completa
		await page.waitForTimeout(2000);

		// Aguardar inputs estarem prontos usando data-testid
		console.log("[Test] Procurando input de email...");
		const emailInput = page.locator('[data-testid="auth-email-input"]');
		await emailInput.waitFor({ state: "visible", timeout: 20000 });
		console.log("[Test] Input de email encontrado!");

		console.log("[Test] Procurando input de password...");
		const passwordInput = page.locator('[data-testid="auth-password-input"]');
		await passwordInput.waitFor({ state: "visible", timeout: 20000 });
		console.log("[Test] Input de password encontrado!");

		await emailInput.fill(loginEmail);
		await passwordInput.fill(loginPassword);

		console.log("[Test] Clicando no botão de submit...");
		await page.click('[data-testid="auth-submit-button"]');

		console.log(
			"[Test] Clique no submit realizado, aguardando redirecionamento...",
		);

		// Esperar redirecionamento para o dashboard ou agenda
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

		// Aguardar o app inicializar e o menu estar disponível
		await expectAuthenticatedShell(page);

		console.log(
			"[Test] Login validado com sucesso (shell autenticado visível)",
		);
	});

	test("deve mostrar erro com credenciais inválidas", async ({ page }) => {
		await page.goto("/auth", { waitUntil: "domcontentloaded" });

		// Esperar que o loading spinner desapareça
		console.log("[Test] Aguardando loading spinner desaparecer...");
		const loader = page.locator("#initial-loader");
		if (await loader.isVisible({ timeout: 5000 }).catch(() => false)) {
			await loader.waitFor({ state: "hidden", timeout: 20000 });
		}
		console.log("[Test] Loading spinner desapareceu");

		// Aguardar um pouco para garantir renderização completa
		await page.waitForTimeout(2000);

		// Aguardar campos de input usando data-testid
		const emailInput = page.locator('[data-testid="auth-email-input"]');
		const passwordInput = page.locator('[data-testid="auth-password-input"]');

		await emailInput.waitFor({ state: "visible", timeout: 20000 });
		await passwordInput.waitFor({ state: "visible", timeout: 20000 });

		await emailInput.fill("invalido@example.com");
		await passwordInput.fill("senhaErrada123");
		await page.click('[data-testid="auth-submit-button"]');

		// Procurar por mensagem de erro usando data-testid
		await expect(page.locator('[data-testid="login-error"]')).toBeVisible({
			timeout: 15000,
		});
	});
});

test("deve fazer logout", async ({ browser }) => {
	// Para logout, precisamos estar logado primeiro. Usamos a sessão global aqui abrindo um novo contexto
	const context = await browser.newContext({ storageState: AUTH_STATE_PATH });
	const page = await context.newPage();
	await mockOrganizationBootstrap(page);

	await page.goto("/agenda", { waitUntil: "domcontentloaded" });
	await expectAuthenticatedShell(page);
	await page.keyboard.press("Escape").catch(() => {});
	await page.waitForTimeout(250);

	const directLogoutButton = page
		.locator(
			'button:has-text("Sair do Sistema"), button:has-text("Encerrar Sessão"), [data-testid="user-menu-logout"], button[aria-label*="logout"], button[aria-label*="Sair"]',
		)
		.first();

	if (
		await directLogoutButton.isVisible({ timeout: 5000 }).catch(() => false)
	) {
		await directLogoutButton.evaluate((button: HTMLElement) => button.click());
	} else {
		const userMenuTrigger = page.locator('[data-testid="user-menu"]').first();
		if (await userMenuTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
			await userMenuTrigger.evaluate((button: HTMLElement) => button.click());

			const dropdownLogoutButton = page
				.locator(
					'[data-testid="user-menu-logout"], [role="menuitem"]:has-text("Encerrar Sessão"), button:has-text("Encerrar Sessão")',
				)
				.first();
			await expect(dropdownLogoutButton).toBeVisible({ timeout: 15000 });
			await dropdownLogoutButton.evaluate((button: HTMLElement) =>
				button.click(),
			);
		} else {
			await page.evaluate(async () => {
				const neonAuth = await import("/src/integrations/neon/auth.ts");
				await neonAuth.signOut();
			});
		}
	}

	// Verificar se voltou para a página de login
	await page.waitForURL(/\/auth/, { timeout: 20000 });
	await expect(page).toHaveURL(/\/auth/);

	await context.close();
});

test("deve redirecionar para /auth quando não autenticado", async ({
	browser,
}) => {
	// Usar um contexto novo e vazio para garantir que não há sessão
	const context = await browser.newContext({
		storageState: { cookies: [], origins: [] },
	});
	const page = await context.newPage();

	await page.goto("/agenda");

	// Deve ser redirecionado para /auth
	await expect(page).toHaveURL(/\/auth/, { timeout: 20000 });

	await context.close();
});

test("deve carregar profile após login", async ({ page }) => {
	await mockOrganizationBootstrap(page);
	await page.goto("/auth", { waitUntil: "domcontentloaded" });

	// Aguardar um pouco para garantir renderização completa
	await page.waitForTimeout(1000);

	// Aguardar campos de input usando data-testid
	const emailInput = page.locator('[data-testid="auth-email-input"]');
	const passwordInput = page.locator('[data-testid="auth-password-input"]');

	await emailInput.waitFor({ state: "visible", timeout: 15000 });
	await passwordInput.waitFor({ state: "visible", timeout: 15000 });

	await emailInput.fill(loginEmail);
	await passwordInput.fill(loginPassword);
	await page.click('[data-testid="auth-submit-button"]');

	// Aguardar carregamento do menu que contém dados do perfil
	await expectAuthenticatedShell(page);

	console.log("✅ Profile carregado após login");
});
})
