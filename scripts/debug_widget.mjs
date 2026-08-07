import { chromium } from "playwright";

(async () => {
  console.log("🚀 Testing Blue AI Widget on /inteligencia...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await page.goto("https://moocafisio.com.br/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
    await page.fill('input[type="password"]', "Yukari30@");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(4000);
    await page.goto("https://moocafisio.com.br/inteligencia", { waitUntil: "networkidle" });
    await page.waitForTimeout(4000);

    // Find launcher button
    const widgetBtn = page.locator("div.fixed.bottom-6.right-6 button").first();
    console.log("Widget button visible on /inteligencia:", await widgetBtn.isVisible());

    // Screenshot closed state (icon-only blue FAB)
    await page.screenshot({ path: "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb/prod_widget_blue_icon_closed.png" });
    console.log("📸 Saved screenshot of icon-only blue launcher!");

    if (await widgetBtn.isVisible()) {
      await widgetBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb/prod_widget_blue_open_filters.png" });
      console.log("📸 Saved screenshot of open widget with Workers AI & filters!");
    }

  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await browser.close();
  }
})();
