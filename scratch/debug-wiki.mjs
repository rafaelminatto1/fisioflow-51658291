import { chromium } from "playwright";
async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("request", (req) => {
    console.log(`[REQUEST] ${req.url()}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) console.log(`[ERROR ${res.status()}] ${res.url()}`);
  });

  await page.goto("https://moocafisio.com.br/auth");
  await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
  await page.fill('input[type="password"]', "Yukari30@");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/agenda", { timeout: 60000 });

  console.log("--- Checking /wiki ---");
  await page.goto("https://moocafisio.com.br/wiki");
  await page.waitForTimeout(5000);

  await browser.close();
}
run();
