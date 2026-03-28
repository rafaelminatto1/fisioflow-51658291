import { expect, test } from "@playwright/test";
import { testUsers } from "./fixtures/test-data";
import { authenticateBrowserContext } from "./helpers/neon-auth";

/**
 * E2E Tests: Sistema de Favoritos de Exercícios
 *
 * Este suite testa a funcionalidade de favoritar/desfavoritar exercícios
 * usando a API backend (PostgreSQL) ao invés de localStorage.
 *
 * Cenários testados:
 * 1. Favoritar exercício pela biblioteca
 * 2. Desfavoritar exercício
 * 3. Persistência após recarregar página
 * 4. Filtro de favoritos
 * 5. Favoritar/desfavoritar pelo modal de detalhes
 */

test.describe("Sistema de Favoritos de Exercícios", () => {
	const TEST_USER = testUsers.rafael;

	test.beforeEach(async ({ page }) => {
		await authenticateBrowserContext(
			page.context(),
			TEST_USER.email,
			TEST_USER.password,
		);
	});

	/**
	 * Teste 1: Favoritar exercício pela biblioteca
	 * Verifica se o ícone de coração é preenchido após favoritar
	 */
	test("deve favoritar um exercício pela biblioteca", async ({ page }) => {
		await page.goto("/exercises");

		// Agregar carregamento da lista de exercícios
		await page.waitForSelector("div.group\\/overflow-hidden", {
			timeout: 15000,
		});

		// Encontrar primeiro card de exercício com botão de favorito (ícone Heart)
		const firstCard = page.locator("div.group\\/overflow-hidden").first();
		const heartButton = firstCard
			.locator('button:has(svg[data-lucide="heart"])')
			.first();

		// Verificar que o botão existe
		await expect(heartButton).toBeVisible();

		// Clicar para favoritar
		await heartButton.click();

		// Aguardar sucesso (toast)
		await expect(page.locator("text=/adicionado aos favoritos/i")).toBeVisible({
			timeout: 5000,
		});

		// Verificar que o ícone tem classe de preenchimento
		const updatedIcon = heartButton.locator('svg[data-lucide="heart"]');
		await expect(updatedIcon).toHaveClass(/fill-current|fill-rose-500/i, {
			timeout: 5000,
		});
	});

	/**
	 * Teste 2: Desfavoritar exercício
	 * Verifica se o coração volta ao estado vazio
	 */
	test("deve desfavoritar um exercício", async ({ page }) => {
		await page.goto("/exercises");

		await page.waitForSelector("div.group\\/overflow-hidden", {
			timeout: 15000,
		});

		const firstCard = page.locator("div.group\\/overflow-hidden").first();
		const heartButton = firstCard
			.locator('button:has(svg[data-lucide="heart"])')
			.first();

		// Primeiro favoritar (se já não estiver)
		const icon = heartButton.locator('svg[data-lucide="heart"]');
		const fill = await icon.getAttribute("fill");

		if (fill === null) {
			await heartButton.click();
			await expect(
				page.locator("text=/adicionado aos favoritos/i"),
			).toBeVisible();
		}

		// Agora desfavoritar
		await heartButton.click();

		// Verificar toast de sucesso
		await expect(page.locator("text=/removido dos favoritos/i")).toBeVisible({
			timeout: 5000,
		});

		// Verificar que o ícone não tem mais classe de preenchimento
		await expect(icon).not.toHaveClass(/fill-current|fill-rose-500/i, {
			timeout: 5000,
		});
	});

	/**
	 * Teste 3: Persistência após recarregar página
	 * Verifica se favoritos são mantidos via API backend
	 */
	test("deve manter favoritos após recarregar a página", async ({ page }) => {
		await page.goto("/exercises");

		await page.waitForSelector("div.group\\/overflow-hidden", {
			timeout: 15000,
		});

		const firstCard = page.locator("div.group\\/overflow-hidden").first();
		const heartButton = firstCard
			.locator('button:has(svg[data-lucide="heart"])')
			.first();
		const icon = heartButton.locator('svg[data-lucide="heart"]');

		// Garantir que está favoritado
		const initialFill = await icon.getAttribute("fill");
		if (initialFill === null) {
			await heartButton.click();
			await expect(
				page.locator("text=/adicionado aos favoritos/i"),
			).toBeVisible();
		}

		// Recarregar página
		await page.reload();

		// Agregar carregamento novamente
		await page.waitForSelector("div.group\\/overflow-hidden", {
			timeout: 15000,
		});

		// Encontrar o mesmo card e verificar estado
		const reloadedCard = page.locator("div.group\\/overflow-hidden").first();
		const reloadedButton = reloadedCard
			.locator('button:has(svg[data-lucide="heart"])')
			.first();
		const reloadedIcon = reloadedButton.locator('svg[data-lucide="heart"]');

		// Verificar que o coração ainda está preenchido
		await expect(reloadedIcon).toHaveClass(/fill-current|fill-rose-500/i, {
			timeout: 5000,
		});

		// Limpar: desfavoritar após teste
		await reloadedButton.click();
		await expect(page.locator("text=/removido dos favoritos/i")).toBeVisible();
	});

	/**
	 * Teste 4: Filtro de favoritos
	 * Verifica se o filtro mostra apenas exercícios favoritados
	 */
	test("deve filtrar exercícios por favoritos", async ({ page }) => {
		await page.goto("/exercises");

		await page.waitForSelector("div.group\\/overflow-hidden", {
			timeout: 15000,
		});

		const cards = page.locator("div.group\\/overflow-hidden");
		const cardCount = await cards.count();

		if (cardCount < 2) {
			test.skip("Não há exercícios suficientes para teste de filtro");
		}

		// Favoritar 2 exercícios
		const card1 = cards.nth(0);
		const card2 = cards.nth(1);
		const button1 = card1
			.locator('button:has(svg[data-lucide="heart"])')
			.first();
		const button2 = card2
			.locator('button:has(svg[data-lucide="heart"])')
			.first();

		await button1.click();
		await expect(
			page.locator("text=/adicionado aos favoritos/i"),
		).toBeVisible();
		await button2.click();
		await expect(
			page.locator("text=/adicionado aos favoritos/i"),
		).toBeVisible();

		// Clicar no filtro "Favoritos"
		const favoritesFilter = page.getByRole("button", { name: /favoritos/i });
		await favoritesFilter.click();

		// Verificar que apenas os favoritados aparecem
		const filteredCards = page.locator("div.group\\/overflow-hidden");
		const filteredCount = await filteredCards.count();
		expect(filteredCount).toBeGreaterThanOrEqual(2);

		// Limpar: desfavoritar e resetar filtro
		const allFilter = page.getByRole("button", { name: /todos/i });
		await allFilter.click();

		await button1.click();
		await expect(page.locator("text=/removido dos favoritos/i")).toBeVisible();
		await button2.click();
		await expect(page.locator("text=/removido dos favoritos/i")).toBeVisible();
	});

	/**
	 * Teste 5: Favoritar pelo modal de detalhes
	 * Verifica sincronização entre card e modal
	 */
	test("deve favoritar pelo modal de detalhes", async ({ page }) => {
		await page.goto("/exercises");

		await page.waitForSelector("div.group\\/overflow-hidden", {
			timeout: 15000,
		});

		const firstCard = page.locator("div.group\\/overflow-hidden").first();
		const cardHeartButton = firstCard
			.locator('button:has(svg[data-lucide="heart"])')
			.first();
		const cardIcon = cardHeartButton.locator('svg[data-lucide="heart"]');

		// Verificar estado inicial
		const initialFill = await cardIcon.getAttribute("fill");
		expect(initialFill).toBeNull();

		// Clicar em "Ver Detalhes"
		const detailsButton = firstCard.getByRole("button", {
			name: /ver detalhes/i,
		});
		await detailsButton.click();

		// Agregar modal abrir
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Favoritar pelo modal
		const modalHeartButton = page
			.locator('[role="dialog"]')
			.locator('button:has(svg[data-lucide="heart"])')
			.first();
		await modalHeartButton.click();

		// Verificar toast
		await expect(
			page.locator("text=/adicionado aos favoritos/i"),
		).toBeVisible();

		// Fechar modal
		const closeButton = page
			.locator('[role="dialog"]')
			.locator("button")
			.filter({ hasText: /close|fechar|x/i })
			.first();
		await closeButton.click();

		// Agregar modal fechar
		await expect(page.locator('[role="dialog"]')).toBeHidden({
			timeout: 5000,
		});

		// Verificar que o card agora mostra coração preenchido
		await expect(cardIcon).toHaveClass(/fill-current|fill-rose-500/i, {
			timeout: 5000,
		});

		// Limpar
		await cardHeartButton.click();
		await expect(page.locator("text=/removido dos favoritos/i")).toBeVisible();
	});

	/**
	 * Teste 6: Múltiplos favoritos simultâneos
	 * Verifica se múltiplos exercícios podem ser favoritados
	 */
	test("deve permitir favoritar múltiplos exercícios", async ({ page }) => {
		await page.goto("/exercises");

		await page.waitForSelector("div.group\\/overflow-hidden", {
			timeout: 15000,
		});

		const cards = page.locator("div.group\\/overflow-hidden");
		const cardCount = await cards.count();

		if (cardCount < 3) {
			test.skip(
				"Não há exercícios suficientes para teste de múltiplos favoritos",
			);
		}

		const favoriteIds: string[] = [];

		// Favoritar 3 exercícios
		for (let i = 0; i < 3; i++) {
			const card = cards.nth(i);
			const button = card
				.locator('button:has(svg[data-lucide="heart"])')
				.first();
			const icon = button.locator('svg[data-lucide="heart"]');

			await button.click();
			await expect(
				page.locator("text=/adicionado aos favoritos/i"),
			).toBeVisible();

			// Verificar que foi favoritado
			await expect(icon).toHaveClass(/fill-current|fill-rose-500/i, {
				timeout: 5000,
			});

			favoriteIds.push(`exercise-${i}`);
		}

		// Verificar que o contador de favoritos está correto (se existir)
		const favoritesFilter = page.getByRole("button", { name: /favoritos/i });
		await favoritesFilter.click();

		const filteredCards = page.locator("div.group\\/overflow-hidden");
		const filteredCount = await filteredCards.count();
		expect(filteredCount).toBeGreaterThanOrEqual(3);

		// Limpar: desfavoritar todos
		const allFilter = page.getByRole("button", { name: /todos/i });
		await allFilter.click();

		for (let i = 0; i < 3; i++) {
			const card = cards.nth(i);
			const button = card
				.locator('button:has(svg[data-lucide="heart"])')
				.first();
			await button.click();
			await expect(
				page.locator("text=/removido dos favoritos/i"),
			).toBeVisible();
		}
	});
});
