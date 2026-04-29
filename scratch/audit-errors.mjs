import { chromium } from "playwright";
async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[CONSOLE ERROR] ${msg.text()}`);
  });

  await page.goto("https://moocafisio.com.br/auth");
  await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
  await page.fill('input[type="password"]', "Yukari30@");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/agenda", { timeout: 60000 });

  const routes = ["/gamification", "/wiki", "/portal"];
  for (const route of routes) {
    console.log(`--- Checking ${route} ---`);
    await page.goto(`https://moocafisio.com.br${route}`);
    await page.waitForTimeout(5000);
  }

  await browser.close();
}
run();
