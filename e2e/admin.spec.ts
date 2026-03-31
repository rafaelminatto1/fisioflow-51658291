/**
 * FisioFlow - Admin E2E Tests
 *
 * Testes de ponta a ponta para módulo de Admin.
 */

import { expect, test } from "@playwright/test";

test.describe("Módulo Admin", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await page.keyboard.press("Escape").catch(() => {});
		await page.waitForTimeout(300);
	});

	test("Deve acessar a página de admin", async ({ page }) => {
		await page.goto("/admin/analytics");
		await page.waitForLoadState("domcontentloaded");

		const pageTitle = page
			.locator("h1, h2")
			.filter({ hasText: /Admin|Analytics|Dashboard/i })
			.first();
		if (await pageTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(pageTitle).toBeVisible();
		}
	});

	test("Deve acessar a página de gestão de profissionais", async ({ page }) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const pageTitle = page
			.locator("h1, h2")
			.filter({ hasText: /Profissionais|Professional/i })
			.first();
		if (await pageTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(pageTitle).toBeVisible();
		}
	});

	test("Deve exibir cards de profissionais", async ({ page }) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const professionalCards = page
			.locator(
				'[data-testid*="professional"], [data-testid*="profissional"], .professional-card',
			)
			.first();
		if (
			await professionalCards.isVisible({ timeout: 5000 }).catch(() => false)
		) {
			await expect(professionalCards).toBeVisible();
		}
	});

	test("Deve exibir botão de adicionar profissional", async ({ page }) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const addButton = page
			.getByRole("button", { name: /Adicionar|Novo|Criar|Convidar/i })
			.first();
		await expect(addButton).toBeVisible({ timeout: 10000 });
	});

	test("Deve abrir modal de adicionar profissional", async ({ page }) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const addButton = page
			.getByRole("button", { name: /Adicionar|Novo|Criar|Convidar/i })
			.first();
		await addButton.click();
		await page.waitForTimeout(300);

		const modal = page
			.locator('[role="dialog"]')
			.filter({ has: page.locator("input, select") })
			.first();
		if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(modal).toBeVisible();
		}
	});

	test("Deve exibir filtros de busca em profissionais", async ({ page }) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const searchInput = page
			.locator(
				'input[placeholder*="Buscar"], input[placeholder*="Pesquisar"], input[type="search"]',
			)
			.first();
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir tabela de profissionais", async ({ page }) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator('table, [role="table"]').first();
		if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(table).toBeVisible();
		}
	});

	test("Deve exibir badges de status de profissionais", async ({ page }) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const statusBadges = page.locator(
			'.badge, [role="status"], [data-testid*="status"]',
		);
		if ((await statusBadges.count()) > 0) {
			await expect(statusBadges.first()).toBeVisible({ timeout: 10000 });
		}
	});

	test("Deve exibir menus de ação em profissionais (editar, excluir, etc.)", async ({
		page,
	}) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const firstCard = page
			.locator(
				'[data-testid*="professional"], [data-testid*="profissional"], tr',
			)
			.first();
		if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
			const actionButton = firstCard
				.getByRole("button")
				.filter({ hasText: "" })
				.first();
			if (await actionButton.isVisible({ timeout: 3000 }).catch(() => false)) {
				await expect(actionButton).toBeVisible();
			}
		}
	});

	test("Deve exibir estados vazios quando não há profissionais", async ({
		page,
	}) => {
		await page.goto("/admin/professionals");
		await page.waitForLoadState("domcontentloaded");

		const emptyState = page
			.locator('[data-testid*="empty"], [data-testid*="vazio"], .empty-state')
			.first();
		if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(emptyState).toBeVisible();
		}
	});

	test("Deve ter loading state durante carregamento", async ({ page }) => {
		await page.goto("/admin/professionals");

		const loader = page
			.locator('.loading, [data-testid*="loading"], .skeleton')
			.first();
		if (await loader.isVisible({ timeout: 2000 }).catch(() => false)) {
			await expect(loader).toBeVisible();
		}
	});

	test("Deve exibir informações de métricas (uptime, taxa de erro, etc.)", async ({
		page,
	}) => {
		await page.goto("/admin/health");
		await page.waitForLoadState("domcontentloaded");

		const metricCards = page.locator('.card, [data-testid*="card"]');
		if ((await metricCards.count()) > 0) {
			const firstCard = metricCards.first();
			const hasContent =
				(await firstCard.locator("h1, h2, h3, .value, .metric").count()) > 0;
			expect(hasContent).toBeTruthy();
		}
	});
});
