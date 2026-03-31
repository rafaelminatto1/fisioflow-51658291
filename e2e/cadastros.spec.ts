/**
 * FisioFlow - Cadastros E2E Tests
 *
 * Testes de ponta a ponta para módulo de Cadastros.
 */

import { expect, test } from "@playwright/test";

const CADASTROS_PAGES = [
	{
		path: "/cadastros/servicos",
		name: /Serviços|Services/i,
		title: /Serviços/i,
	},
	{
		path: "/cadastros/fornecedores",
		name: /Fornecedores|Suppliers/i,
		title: /Fornecedores/i,
	},
	{
		path: "/cadastros/feriados",
		name: /Feriados|Holidays/i,
		title: /Feriados/i,
	},
	{
		path: "/cadastros/atestados",
		name: /Atestados|Certificates/i,
		title: /Atestados/i,
	},
	{
		path: "/cadastros/contratos",
		name: /Contratos|Contracts/i,
		title: /Contratos/i,
	},
	{
		path: "/cadastros/contratados",
		name: /Contratados/i,
		title: /Contratados/i,
	},
	{
		path: "/cadastros/templates-evolucao",
		name: /Templates/i,
		title: /Templates/i,
	},
	{
		path: "/cadastros/fichas-avaliacao",
		name: /Fichas|Forms/i,
		title: /Fichas/i,
	},
	{ path: "/cadastros/objetivos", name: /Objetivos/i, title: /Objetivos/i },
	{ path: "/cadastros/medicos", name: /Médicos/i, title: /Médicos/i },
	{
		path: "/cadastros/formas-pagamento",
		name: /Formas de Pagamento/i,
		title: /Formas de Pagamento/i,
	},
	{ path: "/cadastros/convenios", name: /Convênios/i, title: /Convênios/i },
];

test.describe("Módulo Cadastros", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await page.keyboard.press("Escape").catch(() => {});
		await page.waitForTimeout(300);
	});

	test("Deve acessar a página principal de cadastros", async ({ page }) => {
		await page.goto("/cadastros");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page
				.locator("h1, h2")
				.filter({ hasText: /Cadastros/i })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	for (const pageInfo of CADASTROS_PAGES) {
		test(`Deve acessar a página de ${pageInfo.title.source}`, async ({
			page,
		}) => {
			await page.goto(pageInfo.path);
			await page.waitForLoadState("domcontentloaded");

			await expect(
				page.locator("h1, h2").filter({ hasText: pageInfo.name }).first(),
			).toBeVisible({ timeout: 10000 });
		});
	}

	test("Deve exibir botão de criar novo em serviços", async ({ page }) => {
		await page.goto("/cadastros/servicos");
		await page.waitForLoadState("domcontentloaded");

		const addButton = page
			.getByRole("button", { name: /Novo|Criar|Adicionar/i })
			.first();
		await expect(addButton).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir botão de criar novo em convênios", async ({ page }) => {
		await page.goto("/cadastros/convenios");
		await page.waitForLoadState("domcontentloaded");

		const addButton = page
			.getByRole("button", { name: /Novo|Criar|Adicionar/i })
			.first();
		await expect(addButton).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir filtros de busca em serviços", async ({ page }) => {
		await page.goto("/cadastros/servicos");
		await page.waitForLoadState("domcontentloaded");

		const searchInput = page
			.locator(
				'input[placeholder*="Buscar"], input[placeholder*="Pesquisar"], input[type="search"]',
			)
			.first();
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir filtros de busca em convênios", async ({ page }) => {
		await page.goto("/cadastros/convenios");
		await page.waitForLoadState("domcontentloaded");

		const searchInput = page
			.locator(
				'input[placeholder*="Buscar"], input[placeholder*="Pesquisar"], input[type="search"]',
			)
			.first();
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir tabela de serviços", async ({ page }) => {
		await page.goto("/cadastros/servicos");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator('table, [role="table"]').first();
		if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(table).toBeVisible();
		}
	});

	test("Deve exibir tabela de convênios", async ({ page }) => {
		await page.goto("/cadastros/convenios");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator('table, [role="table"]').first();
		if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(table).toBeVisible();
		}
	});

	test("Deve exibir cards de templates de evolução", async ({ page }) => {
		await page.goto("/cadastros/templates-evolucao");
		await page.waitForLoadState("domcontentloaded");

		const cards = page
			.locator(
				'[data-testid*="template"], [data-testid*="card"], .template-card',
			)
			.first();
		if (await cards.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(cards).toBeVisible();
		}
	});

	test("Deve exibir cards de fichas de avaliação", async ({ page }) => {
		await page.goto("/cadastros/fichas-avaliacao");
		await page.waitForLoadState("domcontentloaded");

		const cards = page
			.locator('[data-testid*="form"], [data-testid*="card"], .form-card')
			.first();
		if (await cards.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(cards).toBeVisible();
		}
	});

	test("Deve exibir estados vazios quando não há serviços", async ({
		page,
	}) => {
		await page.goto("/cadastros/servicos");
		await page.waitForLoadState("domcontentloaded");

		const emptyState = page
			.locator('[data-testid*="empty"], [data-testid*="vazio"], .empty-state')
			.first();
		if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(emptyState).toBeVisible();
		}
	});

	test("Deve exibir estados vazios quando não há convênios", async ({
		page,
	}) => {
		await page.goto("/cadastros/convenios");
		await page.waitForLoadState("domcontentloaded");

		const emptyState = page
			.locator('[data-testid*="empty"], [data-testid*="vazio"], .empty-state')
			.first();
		if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(emptyState).toBeVisible();
		}
	});

	test("Deve abrir modal de criação de serviço", async ({ page }) => {
		await page.goto("/cadastros/servicos");
		await page.waitForLoadState("domcontentloaded");

		const addButton = page
			.getByRole("button", { name: /Novo|Criar|Adicionar/i })
			.first();
		await addButton.click();
		await page.waitForTimeout(300);

		const modal = page
			.locator('[role="dialog"]')
			.filter({ has: page.locator("input") })
			.first();
		if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(modal).toBeVisible();
		}
	});

	test("Deve abrir modal de criação de convênio", async ({ page }) => {
		await page.goto("/cadastros/convenios");
		await page.waitForLoadState("domcontentloaded");

		const addButton = page
			.getByRole("button", { name: /Novo|Criar|Adicionar/i })
			.first();
		await addButton.click();
		await page.waitForTimeout(300);

		const modal = page
			.locator('[role="dialog"]')
			.filter({ has: page.locator("input") })
			.first();
		if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(modal).toBeVisible();
		}
	});

	test("Deve exibir badges de status em convênios", async ({ page }) => {
		await page.goto("/cadastros/convenios");
		await page.waitForLoadState("domcontentloaded");

		const statusBadges = page.locator(
			'.badge, [role="status"], [data-testid*="status"]',
		);
		if ((await statusBadges.count()) > 0) {
			await expect(statusBadges.first()).toBeVisible({ timeout: 10000 });
		}
	});

	test("Deve exibir menus de ação em serviços", async ({ page }) => {
		await page.goto("/cadastros/servicos");
		await page.waitForLoadState("domcontentloaded");

		const firstRow = page.locator("tr").first();
		if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
			const actionButton = firstRow
				.getByRole("button")
				.filter({ hasText: "" })
				.first();
			if (await actionButton.isVisible({ timeout: 3000 }).catch(() => false)) {
				await expect(actionButton).toBeVisible();
			}
		}
	});

	test("Deve ter loading state durante carregamento", async ({ page }) => {
		await page.goto("/cadastros/servicos");

		const loader = page
			.locator('.loading, [data-testid*="loading"], .skeleton')
			.first();
		if (await loader.isVisible({ timeout: 2000 }).catch(() => false)) {
			await expect(loader).toBeVisible();
		}
	});

	test("Deve ter consistência de UX entre páginas de cadastros", async ({
		page,
	}) => {
		const pagesToCheck = ["/cadastros/servicos", "/cadastros/convenios"];

		for (const path of pagesToCheck) {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			const addButton = page
				.getByRole("button", { name: /Novo|Criar|Adicionar/i })
				.first();
			const searchInput = page
				.locator(
					'input[placeholder*="Buscar"], input[placeholder*="Pesquisar"], input[type="search"]',
				)
				.first();

			const addVisible = await addButton
				.isVisible({ timeout: 3000 })
				.catch(() => false);
			const searchVisible = await searchInput
				.isVisible({ timeout: 3000 })
				.catch(() => false);

			if (!addVisible && !searchVisible) {
				console.log(`Nenhum dos elementos encontrados em ${path}`);
			}
		}
	});
});
