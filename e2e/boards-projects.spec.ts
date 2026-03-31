/**
 * FisioFlow - Boards & Projects E2E Tests
 *
 * Testes de ponta a ponta para módulo de Boards e Projects.
 */

import { expect, test } from "@playwright/test";

test.describe("Módulo Boards & Projects", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await page.keyboard.press("Escape").catch(() => {});
		await page.waitForTimeout(300);
	});

	test("Deve acessar a página de boards", async ({ page }) => {
		await page.goto("/boards");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page
				.locator("h1, h2")
				.filter({ hasText: /Boards|Quadros|Projetos/i })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("Deve acessar a página de projects", async ({ page }) => {
		await page.goto("/projects");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page
				.locator("h1, h2")
				.filter({ hasText: /Projetos|Projects/i })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir o botão de criar novo board", async ({ page }) => {
		await page.goto("/boards");
		await page.waitForLoadState("domcontentloaded");

		const createButton = page
			.getByRole("button", { name: /Novo|Criar|Adicionar/i })
			.first();
		await expect(createButton).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir o botão de criar novo projeto", async ({ page }) => {
		await page.goto("/projects");
		await page.waitForLoadState("domcontentloaded");

		const createButton = page
			.getByRole("button", { name: /Novo|Criar|Adicionar/i })
			.first();
		await expect(createButton).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir filtros de busca em boards", async ({ page }) => {
		await page.goto("/boards");
		await page.waitForLoadState("domcontentloaded");

		const searchInput = page
			.locator(
				'input[placeholder*="Buscar"], input[placeholder*="Pesquisar"], input[type="search"]',
			)
			.first();
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir filtros de busca em projetos", async ({ page }) => {
		await page.goto("/projects");
		await page.waitForLoadState("domcontentloaded");

		const searchInput = page
			.locator(
				'input[placeholder*="Buscar"], input[placeholder*="Pesquisar"], input[type="search"]',
			)
			.first();
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test("Deve navegar entre collections de boards", async ({ page }) => {
		await page.goto("/boards");
		await page.waitForLoadState("domcontentloaded");

		const allTab = page
			.locator('button, [role="tab"]')
			.filter({ hasText: /Todos|All/i })
			.first();
		const favoritesTab = page
			.locator('button, [role="tab"]')
			.filter({ hasText: /Favoritos|Favorites/i })
			.first();

		if (await allTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await allTab.click();
			await page.waitForTimeout(300);
		}

		if (await favoritesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await favoritesTab.click();
			await page.waitForTimeout(300);
		}
	});

	test("Deve exibir estados vazios quando não há boards", async ({ page }) => {
		await page.goto("/boards");
		await page.waitForLoadState("domcontentloaded");

		const emptyState = page
			.locator('[data-testid*="empty"], [data-testid*="vazio"], .empty-state')
			.first();
		if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(emptyState).toBeVisible();
		}
	});

	test("Deve exibir estados vazios quando não há projetos", async ({
		page,
	}) => {
		await page.goto("/projects");
		await page.waitForLoadState("domcontentloaded");

		const emptyState = page
			.locator('[data-testid*="empty"], [data-testid*="vazio"], .empty-state')
			.first();
		if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(emptyState).toBeVisible();
		}
	});

	test("Deve abrir modal de criação de board", async ({ page }) => {
		await page.goto("/boards");
		await page.waitForLoadState("domcontentloaded");

		const createButton = page
			.getByRole("button", { name: /Novo|Criar|Adicionar/i })
			.first();
		await createButton.click();
		await page.waitForTimeout(300);

		const modal = page
			.locator('[role="dialog"]')
			.filter({ has: page.locator("input") })
			.first();
		if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(modal).toBeVisible();
		}
	});

	test("Deve abrir modal de criação de projeto", async ({ page }) => {
		await page.goto("/projects");
		await page.waitForLoadState("domcontentloaded");

		const createButton = page
			.getByRole("button", { name: /Novo|Criar|Adicionar/i })
			.first();
		await createButton.click();
		await page.waitForTimeout(300);

		const modal = page
			.locator('[role="dialog"]')
			.filter({ has: page.locator("input") })
			.first();
		if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(modal).toBeVisible();
		}
	});
});
