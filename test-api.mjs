import { chromium } from "playwright";
const BASE_URL = "https://www.moocafisio.com.br";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Intercept and log API responses
  await page.route("**/whatsapp/inbox/conversations", async (route) => {
    const resp = await route.fetch();
    const body = await resp.text();
    console.log("\n=== API RESPONSE ===");
    console.log("Status:", resp.status());
    console.log("Body (first 1000):", body.substring(0, 1000));
    await route.respond({ status: resp.status(), body });
  });

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill("REDACTED_EMAIL");
  await page.locator('input[type="password"]').first().fill("REDACTED");
  await page.locator("button:has-text('Acessar Minha Conta')").first().click();
  await new Promise((r) => setTimeout(r, 10000));

  await page.goto(`${BASE_URL}/whatsapp/inbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 8000));

  await browser.close();
})();
