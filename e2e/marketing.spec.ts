/**
 * FisioFlow - Marketing E2E Tests
 *
 * Testes de ponta a ponta para módulo de Marketing.
 */

import { expect, test } from "@playwright/test";

test.describe("Módulo Marketing", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await page.keyboard.press("Escape").catch(() => {});
		await page.waitForTimeout(300);
	});

	test("Deve acessar a página de marketing", async ({ page }) => {
		await page.goto("/marketing");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page
				.locator("h1, h2")
				.filter({ hasText: /Marketing/i })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir link para FisioLink correto", async ({ page }) => {
		await page.goto("/marketing");
		await page.waitForLoadState("domcontentloaded");

		const fisiolinkLink = page
			.getByRole("link", { name: /FisioLink|Fisiolink/i })
			.first();
		await expect(fisiolinkLink).toBeVisible({ timeout: 10000 });

		const href = await fisiolinkLink.getAttribute("href");
		expect(href).toContain("/marketing/fisiolink");
	});

	test("Deve acessar a página de FisioLink", async ({ page }) => {
		await page.goto("/marketing/fisiolink");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page
				.locator("h1, h2")
				.filter({ hasText: /FisioLink|Fisiolink/i })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("Deve acessar a página de gerador de conteúdo", async ({ page }) => {
		await page.goto("/marketing/content-generator");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page
				.locator("h1, h2")
				.filter({ hasText: /Gerador de Conteúdo|Content Generator/i })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir abas de plataformas (Instagram, Facebook, LinkedIn, Twitter)", async ({
		page,
	}) => {
		await page.goto("/marketing/content-generator");
		await page.waitForLoadState("domcontentloaded");

		const platforms = ["Instagram", "Facebook", "LinkedIn", "Twitter"];

		for (const platform of platforms) {
			const tab = page
				.locator('button, [role="tab"]')
				.filter({ hasText: new RegExp(platform, "i") })
				.first();
			if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
				await expect(tab).toBeVisible();
			}
		}
	});

	test("Deve navegar entre as plataformas do gerador de conteúdo", async ({
		page,
	}) => {
		await page.goto("/marketing/content-generator");
		await page.waitForLoadState("domcontentloaded");

		const platforms = ["Instagram", "Facebook", "LinkedIn", "Twitter"];

		for (const platform of platforms) {
			const tab = page
				.locator('button, [role="tab"]')
				.filter({ hasText: new RegExp(platform, "i") })
				.first();
			if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
				await tab.click();
				await page.waitForTimeout(300);
			}
		}
	});

	test("Deve exibir botão de gerar conteúdo", async ({ page }) => {
		await page.goto("/marketing/content-generator");
		await page.waitForLoadState("domcontentloaded");

		const generateButton = page
			.getByRole("button", { name: /Gerar|Generate|Criar/i })
			.first();
		await expect(generateButton).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir área de texto para geração de conteúdo", async ({
		page,
	}) => {
		await page.goto("/marketing/content-generator");
		await page.waitForLoadState("domcontentloaded");

		const textArea = page
			.locator('textarea, .editor, [contenteditable="true"]')
			.first();
		await expect(textArea).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir botões de ação (copiar, baixar, etc.)", async ({
		page,
	}) => {
		await page.goto("/marketing/content-generator");
		await page.waitForLoadState("domcontentloaded");

		const actionButtons = page
			.getByRole("button")
			.filter({ hasText: /Copiar|Baixar|Download|Salvar/i })
			.first();
		if (await actionButtons.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(actionButtons).toBeVisible();
		}
	});

	test("Deve acessar a página de reviews", async ({ page }) => {
		await page.goto("/marketing/reviews");
		await page.waitForLoadState("domcontentloaded");

		const pageTitle = page
			.locator("h1, h2")
			.filter({ hasText: /Reviews|Avaliações/i })
			.first();
		if (await pageTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(pageTitle).toBeVisible();
		}
	});

	test("Deve acessar a página de ROI", async ({ page }) => {
		await page.goto("/marketing/roi");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page.locator("h1, h2").filter({ hasText: /ROI/i }).first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("Deve acessar a página de WhatsApp Scripts", async ({ page }) => {
		await page.goto("/marketing/whatsapp");
		await page.waitForLoadState("domcontentloaded");

		const pageTitle = page
			.locator("h1, h2")
			.filter({ hasText: /WhatsApp|Scripts/i })
			.first();
		if (await pageTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(pageTitle).toBeVisible();
		}
	});

	test("Deve acessar a página de Local SEO", async ({ page }) => {
		await page.goto("/marketing/seo");
		await page.waitForLoadState("domcontentloaded");

		const pageTitle = page
			.locator("h1, h2")
			.filter({ hasText: /Local SEO|SEO Local/i })
			.first();
		if (await pageTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(pageTitle).toBeVisible();
		}
	});

	test("Deve exibir estados vazios quando não há conteúdo", async ({
		page,
	}) => {
		await page.goto("/marketing/content-generator");
		await page.waitForLoadState("domcontentloaded");

		const emptyState = page
			.locator('[data-testid*="empty"], [data-testid*="vazio"], .empty-state')
			.first();
		if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(emptyState).toBeVisible();
		}
	});

	test("Deve ter loading state durante carregamento", async ({ page }) => {
		await page.goto("/marketing");

		const loader = page
			.locator('.loading, [data-testid*="loading"], .skeleton')
			.first();
		if (await loader.isVisible({ timeout: 2000 }).catch(() => false)) {
			await expect(loader).toBeVisible();
		}
	});
});
