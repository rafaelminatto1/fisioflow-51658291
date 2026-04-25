import { chromium } from "playwright";
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("BROWSER [" + msg.type() + "]:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  try {
    await page.goto("https://moocafisio.com.br/auth");
    await page.waitForTimeout(5000);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await browser.close();
  }
}
run();
