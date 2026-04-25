import { chromium } from "playwright";
const BASE_URL = "https://www.moocafisio.com.br";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const allRequests = [];
  page.on("response", async (resp) => {
    if (resp.url().includes("whatsapp") || resp.url().includes("inbox")) {
      allRequests.push({
        url: resp.url(),
        status: resp.status(),
        ct: resp.headers()["content-type"],
      });
    }
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE:", msg.text().substring(0, 300));
  });

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').first().fill("REDACTED_EMAIL");
  await page.locator('input[type="password"]').first().fill("REDACTED");
  await page.locator("button:has-text('Acessar Minha Conta')").first().click();
  await delay(8000);

  await page.goto(`${BASE_URL}/whatsapp/inbox`, { waitUntil: "domcontentloaded" });
  await delay(15000);

  console.log("\n=== WHATSAPP API REQUESTS ===");
  allRequests.forEach((r) => {
    console.log(`${r.status} [${r.ct}] ${r.url}`);
  });

  console.log("\n=== FINAL STATE ===");
  const body = await page.locator("body").innerText();
  console.log("Rafael:", body.includes("Rafael"));
  console.log("Aberta:", body.includes("Aberta"));
  console.log("Selecione:", body.includes("Selecione"));

  await browser.close();
})();
