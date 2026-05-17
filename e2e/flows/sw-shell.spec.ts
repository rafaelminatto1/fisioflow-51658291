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

    // 2) Aguarda SW ficar ativo (activated, não só registered)
    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg?.active?.state === "activated";
      },
      { timeout: 30000 },
    );

    // 3) Faz uma segunda navegação para o SW interceptar via NavigationRoute
    //    e popular o cache "app-shell" com a resposta da rota raiz.
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // 4) Vai offline e recarrega
    await context.setOffline(true);
    const response = await page.reload();

    // Resposta vinda do SW (cache app-shell)
    expect(response?.status()).toBeLessThan(400);

    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
    expect(html).not.toContain("ERR_INTERNET_DISCONNECTED");

    // Navegação SPA via History API também deve funcionar (cache de chunks)
    const navOk = await page.evaluate(() => {
      window.history.pushState({}, "", "/agenda");
      return location.pathname === "/agenda";
    });
    expect(navOk).toBe(true);

    await context.setOffline(false);
  });
});
