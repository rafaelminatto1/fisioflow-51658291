import { chromium } from "playwright";

(async () => {
  console.log("🚀 Debugging Button 14 (Icon-only Floating Widget)...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await page.goto("https://moocafisio.com.br/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
    await page.fill('input[type="password"]', "Yukari30@");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(6000);

    // Look for button inside div.fixed.bottom-6.right-6
    const widgetBtn = page.locator("div.fixed.bottom-6.right-6 button").first();
    console.log("Widget button visible:", await widgetBtn.isVisible());

    // Screenshot closed widget (round blue icon)
    await page.screenshot({ path: "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb/prod_widget_blue_icon_closed.png" });
    console.log("📸 Captured closed round blue icon screenshot!");

    // Click button
    await widgetBtn.click();
    await page.waitForTimeout(1000);

    // Screenshot open widget
    await page.screenshot({ path: "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb/prod_widget_blue_open_filters.png" });
    console.log("📸 Captured open widget screenshot!");

    // Click PubMed filter button
    const pubmedFilter = page.locator('button:has-text("PubMed")').first();
    if (await pubmedFilter.isVisible()) {
      console.log("🎯 Clicking PubMed filter button...");
      await pubmedFilter.click();
      await page.waitForTimeout(500);
    }

    // Fill query
    const input = page.locator('input[placeholder*="Pergunte"], input[placeholder*="Buscar"]').first();
    await input.fill("Quais os testes para Síndrome do Impacto no Ombro?");
    await page.keyboard.press("Enter");
    console.log("⏳ Waiting for Workers AI response...");
    await page.waitForTimeout(5000);

    await page.screenshot({ path: "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb/prod_widget_blue_response.png" });
    console.log("📸 Captured response screenshot!");

    console.log("✅ SUCCESS!");

  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await browser.close();
  }
})();
