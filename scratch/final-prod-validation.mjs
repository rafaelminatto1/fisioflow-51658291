import { chromium } from "playwright";

const BASE_URL = "https://moocafisio.com.br";
const EMAIL = "rafael.minatto@yahoo.com.br";
const PASS = "Yukari30@";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("rum?")) {
      console.log(`[PROD ERROR] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    console.log(`[PROD CRASH] ${err.message}`);
  });

  try {
    console.log("--- Logging into Production ---");
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/agenda", { timeout: 60000 });
    console.log("Login OK");

    const routes = ["/ia-studio", "/patients", "/exercises", "/protocols", "/clinical-tests"];
    for (const route of routes) {
      console.log(`Checking route: ${route}`);
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForTimeout(4000);

      if (route === "/ia-studio") {
        const hasStudio = await page.content();
        if (hasStudio.includes("FisioAmbient")) console.log("  IA Studio Content: OK");
        else console.log("  IA Studio Content: NOT FOUND");
      }
    }

    console.log("--- Validation Finished ---");
  } catch (e) {
    console.error("Validation failed:", e.message);
  } finally {
    await browser.close();
  }
}
run();
