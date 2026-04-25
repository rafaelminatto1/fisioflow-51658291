import { chromium } from "playwright";
async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://moocafisio.com.br/auth");
  await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
  await page.fill('input[type="password"]', "Yukari30@");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/agenda", { timeout: 60000 });
  const auth = await page.evaluate(() => {
    // Try to get token from a successful request if possible, or search deeper
    return JSON.stringify({
      local: localStorage,
      session: sessionStorage,
    });
  });
  console.log(auth);
  await browser.close();
}
run();
