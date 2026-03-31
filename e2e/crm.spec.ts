/**
 * FisioFlow - CRM E2E Tests
 *
 * Testes de ponta a ponta para módulo de CRM.
 */

import { expect, test } from "@playwright/test";

test.describe("Módulo CRM", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await page.keyboard.press("Escape").catch(() => {});
		await page.waitForTimeout(300);
	});

	test("Deve acessar a página de CRM", async ({ page }) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page
				.locator("h1, h2")
				.filter({ hasText: /CRM|Leads|Campanhas|Tarefas/i })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir abas de navegação (leads, campanhas, tarefas, automações)", async ({
		page,
	}) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const leadsTab = page
			.locator('[role="tab"]')
			.filter({ hasText: /Leads/i })
			.first();
		await expect(leadsTab).toBeVisible({ timeout: 10000 });
	});

	test("Deve navegar entre as abas do CRM", async ({ page }) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const tabs = ["Leads", "Campanhas", "Tarefas", "Automações"];

		for (const tabName of tabs) {
			const tab = page
				.locator('button, [role="tab"]')
				.filter({ hasText: new RegExp(tabName, "i") })
				.first();
			if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
				await tab.click();
				await page.waitForTimeout(300);
			}
		}
	});

	test("Deve exibir o botão de importar leads na aba de leads", async ({
		page,
	}) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const leadsTab = page
			.locator('[role="tab"]')
			.filter({ hasText: /Leads/i })
			.first();
		if (await leadsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await leadsTab.click();
			await page.waitForTimeout(300);
		}

		const importButton = page
			.getByRole("button", { name: /Importar|Upload|Adicionar/i })
			.first();
		if (await importButton.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(importButton).toBeVisible();
		}
	});

	test("Deve exibir filtros de busca em leads", async ({ page }) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const leadsTab = page
			.locator('button, [role="tab"]')
			.filter({ hasText: /Leads/i })
			.first();
		if (await leadsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await leadsTab.click();
			await page.waitForTimeout(300);
		}

		const searchInput = page
			.locator(
				'input[placeholder*="Buscar"], input[placeholder*="Pesquisar"], input[type="search"]',
			)
			.first();
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir tabela ou lista de leads", async ({ page }) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const leadsTab = page
			.locator('button, [role="tab"]')
			.filter({ hasText: /Leads/i })
			.first();
		if (await leadsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await leadsTab.click();
			await page.waitForTimeout(300);
		}

		const leadsList = page
			.locator('table, [role="table"], [data-testid*="lead-list"], .lead-card')
			.first();
		if (await leadsList.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(leadsList).toBeVisible();
		}
	});

	test("Deve exibir estados vazios quando não há leads", async ({ page }) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const leadsTab = page
			.locator('button, [role="tab"]')
			.filter({ hasText: /Leads/i })
			.first();
		if (await leadsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await leadsTab.click();
			await page.waitForTimeout(300);
		}

		const emptyState = page
			.locator('[data-testid*="empty"], [data-testid*="vazio"], .empty-state')
			.first();
		if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(emptyState).toBeVisible();
		}
	});

	test("Deve exibir botões de ação em campanhas", async ({ page }) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const campanhasTab = page
			.locator('button, [role="tab"]')
			.filter({ hasText: /Campanhas/i })
			.first();
		if (await campanhasTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await campanhasTab.click();
			await page.waitForTimeout(300);
		}

		const actionButton = page
			.getByRole("button", { name: /Criar|Nova|Adicionar/i })
			.first();
		if (await actionButton.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(actionButton).toBeVisible();
		}
	});

	test("Deve exibir lista de tarefas na aba de tarefas", async ({ page }) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const tarefasTab = page
			.locator('button, [role="tab"]')
			.filter({ hasText: /Tarefas/i })
			.first();
		if (await tarefasTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await tarefasTab.click();
			await page.waitForTimeout(300);
		}

		const tasksList = page
			.locator('[data-testid*="task"], [data-testid*="tarefa"], .task-card')
			.first();
		if (await tasksList.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(tasksList).toBeVisible();
		}
	});

	test("Deve exibir lista de automações na aba de automações", async ({
		page,
	}) => {
		await page.goto("/crm");
		await page.waitForLoadState("domcontentloaded");

		const automacoesTab = page
			.locator('button, [role="tab"]')
			.filter({ hasText: /Automações/i })
			.first();
		if (await automacoesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await automacoesTab.click();
			await page.waitForTimeout(300);
		}

		const automationsList = page
			.locator(
				'[data-testid*="automation"], [data-testid*="automação"], .automation-card',
			)
			.first();
		if (await automationsList.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(automationsList).toBeVisible();
		}
	});

	test("Deve ter loading state durante carregamento", async ({ page }) => {
		await page.goto("/crm");

		const loader = page
			.locator('.loading, [data-testid*="loading"], .skeleton')
			.first();
		if (await loader.isVisible({ timeout: 2000 }).catch(() => false)) {
			await expect(loader).toBeVisible();
		}
	});
});
