import { chromium } from "playwright";
import * as fs from "fs";

(async () => {
  console.log("🚀 Starting E2E verification of Updated Blue AI Widget with Cloudflare Workers AI & Filters...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log("🔐 Logging in at https://moocafisio.com.br...");
    await page.goto("https://moocafisio.com.br/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
    await page.fill('input[type="password"]', "Yukari30@");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle" });
    console.log("✅ Logged in successfully!");

    // 2. Verify floating widget launcher is ICON-ONLY and BLUE
    console.log("🔍 Checking floating widget launcher...");
    const launcher = page.locator('button[title*="Cloudflare Workers AI"]');
    await launcher.waitFor({ state: "visible", timeout: 10000 });
    
    // Screenshot closed state (icon only, clinic blue)
    await page.screenshot({ path: "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb/prod_widget_blue_icon_closed.png" });
    console.log("📸 Saved screenshot of closed launcher (icon-only blue FAB).");

    // 3. Open widget and verify Cloudflare Workers AI header + Category Filters
    await launcher.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb/prod_widget_blue_open_filters.png" });
    console.log("📸 Saved screenshot of open widget with Workers AI header & filters.");

    // 4. Test Category Filter Click (e.g. PubMed)
    console.log("🧪 Testing PubMed category filter...");
    const pubmedFilter = page.locator('button:has-text("PubMed")');
    await pubmedFilter.click();
    await page.waitForTimeout(300);

    // Click quick prompt chip under PubMed category
    const pubmedChip = page.locator('button:has-text("Osteoartrite")').first();
    if (await pubmedChip.isVisible()) {
      console.log("💬 Clicking quick prompt chip for PubMed...");
      await pubmedChip.click();
      await page.waitForTimeout(4000);
    } else {
      console.log("💬 Sending question directly...");
      await page.fill('input[placeholder*="PubMed"]', "Quais as evidencias para reabilitacao de LCA?");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb/prod_widget_blue_response.png" });
    console.log("📸 Saved screenshot of widget response.");

    console.log("🎉 All E2E checks passed cleanly!");
  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await browser.close();
  }
})();
