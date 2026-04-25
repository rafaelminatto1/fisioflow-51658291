import { chromium } from "playwright";
const BASE_URL = "https://www.moocafisio.com.br";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
  });
  const page = await context.newPage();

  const requests = [];
  page.on("response", async (resp) => {
    if (resp.url().includes("whatsapp-api")) {
      requests.push({ url: resp.url(), status: resp.status() });
    }
  });

  // Clear cache by forcing fresh load
  await page.goto(`${BASE_URL}/auth/login?nocache=${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.locator('input[type="email"]').first().fill("rafael.minatto@yahoo.com.br");
  await page.locator('input[type="password"]').first().fill("Yukari30@");
  await page.locator("button:has-text('Acessar Minha Conta')").first().click();
  await new Promise((r) => setTimeout(r, 8000));

  await page.goto(`${BASE_URL}/whatsapp/inbox?nocache=${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 8000));

  console.log("JS requests:", requests.length);
  requests.forEach((r) => console.log(" ", r.url));

  console.log("\n=== FINAL ===");
  const body = await page.locator("body").innerText();
  console.log("Has Rafael:", body.includes("Rafael"));
  console.log("Has Minatto:", body.includes("Minatto"));

  await browser.close();
})();
