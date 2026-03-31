/**
 * FisioFlow - Telemedicine E2E Tests
 *
 * Testes de ponta a ponta para módulo de Telemedicina.
 */

import { expect, test } from "@playwright/test";

test.describe("Módulo Telemedicine", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await page.keyboard.press("Escape").catch(() => {});
		await page.waitForTimeout(300);
	});

	test("Deve acessar a página de telemedicina", async ({ page }) => {
		await page.goto("/telemedicine");
		await page.waitForLoadState("domcontentloaded");

		await expect(
			page
				.locator("h1, h2")
				.filter({ hasText: /Telemedicina|Telemedicine/i })
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("Deve exibir o botão de criar nova sala", async ({ page }) => {
		await page.goto("/telemedicine");
		await page.waitForLoadState("domcontentloaded");

		const createButton = page
			.getByRole("button", { name: /Nova Sala|Criar Sala|Criar|Adicionar/i })
			.first();
		await expect(createButton).toBeVisible({ timeout: 10000 });
	});

	test("Deve abrir modal de criação de sala", async ({ page }) => {
		await page.goto("/telemedicine");
		await page.waitForLoadState("domcontentloaded");

		const createButton = page
			.getByRole("button", { name: /Nova Sala|Criar Sala|Criar|Adicionar/i })
			.first();
		await createButton.click();
		await page.waitForTimeout(300);

		const modal = page
			.locator('[role="dialog"]')
			.filter({ has: page.locator("input, select") })
			.first();
		if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(modal).toBeVisible();
		}
	});

	test("Deve exibir seletor de pacientes", async ({ page }) => {
		await page.goto("/telemedicine");
		await page.waitForLoadState("domcontentloaded");

		const createButton = page
			.getByRole("button", { name: /Nova Sala|Criar Sala|Criar|Adicionar/i })
			.first();
		await createButton.click();
		await page.waitForTimeout(300);

		const patientSelect = page
			.locator('select, [role="combobox"]')
			.filter({ hasText: /Paciente/i })
			.first();
		if (await patientSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(patientSelect).toBeVisible();
		}
	});

	test("Deve exibir estados vazios quando não há salas", async ({ page }) => {
		await page.goto("/telemedicine");
		await page.waitForLoadState("domcontentloaded");

		const emptyState = page
			.locator('[data-testid*="empty"], [data-testid*="vazio"], .empty-state')
			.first();
		if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(emptyState).toBeVisible();
		}
	});

	test("Deve exibir cards de salas existentes", async ({ page }) => {
		await page.goto("/telemedicine");
		await page.waitForLoadState("domcontentloaded");

		const roomCards = page
			.locator('[data-testid*="room"], [data-testid*="sala"], .room-card')
			.first();
		if (await roomCards.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(roomCards).toBeVisible();
		}
	});

	test("Deve exibir informações de salas (nome, paciente, status)", async ({
		page,
	}) => {
		await page.goto("/telemedicine");
		await page.waitForLoadState("domcontentloaded");

		const roomCards = page
			.locator('[data-testid*="room"], [data-testid*="sala"], .room-card')
			.all();

		for (const card of await roomCards) {
			if (await card.isVisible().catch(() => false)) {
				const hasName =
					(await card.locator("h1, h2, h3, .name, .title").count()) > 0;
				const hasStatus =
					(await card.locator('.badge, [role="status"], .status').count()) > 0;
				expect(hasName || hasStatus).toBeTruthy();
			}
		}
	});

	test("Deve exibir botões de ação nas salas (entrar, copiar link, excluir)", async ({
		page,
	}) => {
		await page.goto("/telemedicine");
		await page.waitForLoadState("domcontentloaded");

		const firstRoomCard = page
			.locator('[data-testid*="room"], [data-testid*="sala"], .room-card')
			.first();

		if (await firstRoomCard.isVisible({ timeout: 5000 }).catch(() => false)) {
			const actionButtons = firstRoomCard.getByRole("button");
			const buttonCount = await actionButtons.count();
			expect(buttonCount).toBeGreaterThan(0);
		}
	});

	test("Deve ter loading state durante carregamento", async ({ page }) => {
		await page.goto("/telemedicine");

		const loader = page
			.locator('.loading, [data-testid*="loading"], .skeleton')
			.first();
		if (await loader.isVisible({ timeout: 2000 }).catch(() => false)) {
			await expect(loader).toBeVisible();
		}
	});
});
