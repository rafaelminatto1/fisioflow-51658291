import { chromium } from "playwright";
const BASE_URL = "https://www.moocafisio.com.br";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const failedRequests = [];
  page.on("response", async (resp) => {
    if (resp.status() >= 400) {
      failedRequests.push({ url: resp.url(), status: resp.status() });
    }
  });

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator('input[type="email"]').first().fill("REDACTED_EMAIL");
  await page.locator('input[type="password"]').first().fill("REDACTED");
  await page.locator("button:has-text('Acessar Minha Conta')").first().click();
  await delay(8000);

  await page.goto(`${BASE_URL}/whatsapp/inbox`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await delay(15000);

  console.log("=== REQUISICOES COM ERRO ===");
  failedRequests.forEach((r) => console.log(`${r.status} ${r.url}`));

  const bodyText = await page.locator("body").innerText();
  console.log("\n--- ESTADO FINAL ---");
  console.log("Tem Rafael:", bodyText.includes("Rafael"));
  console.log("Tem 'Nenhuma conversa':", bodyText.includes("Nenhuma conversa"));
  console.log("Tem 'Carregando':", bodyText.includes("Carregando"));
  console.log("Tem 'Selecione':", bodyText.includes("Selecione"));

  await browser.close();
})();
