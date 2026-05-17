/**
 * Service Worker shell-precache spec — valida que após o SW instalar,
 * recarregar a aba offline NÃO dispara ERR_INTERNET_DISCONNECTED
 * (o app shell é servido do cache do SW).
 *
 * Roda contra `vite preview` local (não precisa de API/auth).
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.PREVIEW_BASE_URL || "http://127.0.0.1:4321";

async function waitForSWActive(page: Page) {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
}

test.describe("Service Worker — shell precache", () => {
  test.use({ baseURL: BASE });

  test("reload offline serve o shell do cache (não dá ERR_INTERNET_DISCONNECTED)", async ({
    page,
    context,
  }) => {
    // 1) Carrega — SW registra
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 2) Aguarda SW ficar ativo
    await waitForSWActive(page);

    // Pequeno respiro pro precaching baixar shell
    await page.waitForTimeout(3000);

    // 3) Vai offline e recarrega — antes da correção dava ERR_INTERNET_DISCONNECTED
    await context.setOffline(true);
    const response = await page.reload();

    // Resposta vinda do SW (precache)
    expect(response?.status()).toBeLessThan(400);

    // Documento deve renderizar (não tela de erro do browser)
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
    expect(html).not.toContain("ERR_INTERNET_DISCONNECTED");

    // E navegação SPA para rota inexistente também deve cair no shell
    const navResp = await page.goto("/agenda");
    expect(navResp?.status()).toBeLessThan(400);

    await context.setOffline(false);
  });
});
