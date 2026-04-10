import { chromium } from "playwright";
const BASE_URL = "https://www.moocafisio.com.br";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR"
  });
  const page = await context.newPage();
  
  page.on("console", msg => {
    const text = msg.text();
    if (text.includes("WhatsAppInbox") || text.includes("Rafael") || text.includes("conversations:") || text.includes("filtered:")) {
      console.log("PAGE LOG:", text);
    }
    if (msg.type() === "error" && !text.includes("500")) {
      console.log("PAGE ERROR:", text.substring(0, 200));
    }
  });

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').first().fill("REDACTED_EMAIL");
  await page.locator('input[type="password"]').first().fill("REDACTED");
  await page.locator("button:has-text('Acessar Minha Conta')").first().click();
  await delay(10000);
  console.log("Logged in, going to inbox...");

  await page.goto(`${BASE_URL}/whatsapp/inbox`, { waitUntil: "networkidle", timeout: 60000 });
  await delay(15000);
  
  console.log("\n=== FINAL STATE ===");
  const body = await page.locator("body").innerText();
  console.log("Has Rafael:", body.includes("Rafael"));
  console.log("Has Minatto:", body.includes("Minatto"));
  console.log("Has 'Nenhuma':", body.includes("Nenhuma conversa"));
  console.log("Has tabs:", body.includes("Aberta") && body.includes("Pendente"));

  // Check number of buttons in the list area
  const listArea = page.locator("div.w-\\[340px\\]");
  const btns = await listArea.locator("button").count();
  console.log("Buttons in list area:", btns);

  await page.screenshot({ path: "/tmp/wa-final.png" });
  await browser.close();
})();
