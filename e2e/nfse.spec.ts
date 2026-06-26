import { test, expect } from "@playwright/test";

const PROD_URL = "https://www.moocafisio.com.br";

test.describe("Produção - NFS-e", () => {
  test.setTimeout(120000);

  test("carregar /financeiro/nfse sem erro 500 nos endpoints /api/nfse", async ({ page }) => {
    const errors: string[] = [];
    const nfseResponses: { url: string; status: number }[] = [];

    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/nfse") && !url.includes("/api/nfse/")) {
        nfseResponses.push({ url, status: response.status() });
        if (response.status() >= 500) {
          errors.push(`5xx em ${url} -> ${response.status()}`);
        }
      }
    });

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("Failed to load resource") && text.includes("/api/nfse") && text.includes("500")) {
        errors.push(`Console: ${text}`);
      }
    });

    await page.goto(`${PROD_URL}/auth/login`, { waitUntil: "networkidle" });

    await page.fill('input[name="email"], input[type="email"]', process.env.E2E_EMAIL || "");
    await page.fill('input[name="password"], input[type="password"]', process.env.E2E_PASSWORD || "");

    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")');

    await expect.poll(() => page.url(), { timeout: 30000 }).not.toContain("/auth");

    await page.goto(`${PROD_URL}/financeiro/nfse`, { waitUntil: "networkidle", timeout: 30000 });

    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(8000);

    const nfseListResponses = nfseResponses.filter((r) => /\/api\/nfse(\?|$)/.test(r.url));

    expect(
      nfseListResponses.length,
      `Nenhuma chamada a /api/nfse encontrada. Capturados: ${JSON.stringify(nfseResponses)}`,
    ).toBeGreaterThan(0);

    for (const r of nfseListResponses) {
      expect(r.status, `Erro na chamada ${r.url}`).toBeLessThan(500);
    }

    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
