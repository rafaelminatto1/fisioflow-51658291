import { chromium } from "playwright";
const BASE_URL = "https://www.moocafisio.com.br";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill("REDACTED_EMAIL");
  await page.locator('input[type="password"]').first().fill("REDACTED");
  await page.locator("button:has-text('Acessar Minha Conta')").first().click();
  await new Promise(r => setTimeout(r, 10000));
  
  await page.goto(`${BASE_URL}/whatsapp/inbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise(r => setTimeout(r, 10000));
  
  const body = await page.locator("body").innerText();
  console.log("\n--- TEXTO ---");
  console.log(body.substring(0, 2000));
  
  await browser.close();
})();
