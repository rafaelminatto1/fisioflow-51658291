import { chromium } from "playwright";
const BASE_URL = "https://www.moocafisio.com.br";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on("console", msg => {
    console.log("BROWSER:", msg.text());
  });

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill("rafael.minatto@yahoo.com.br");
  await page.locator('input[type="password"]').first().fill("Yukari30@");
  await page.locator("button:has-text('Acessar Minha Conta')").first().click();
  await new Promise(r => setTimeout(r, 10000));
  
  await page.goto(`${BASE_URL}/whatsapp/inbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise(r => setTimeout(r, 12000));
  
  console.log("\n=== FINAL ===");
  const body = await page.locator("body").innerText();
  console.log("Has Rafael:", body.includes("Rafael"));
  console.log("Has Aberta:", body.includes("Aberta"));
  
  await browser.close();
})();
