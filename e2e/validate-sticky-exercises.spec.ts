import { test, expect } from "@playwright/test";

const loginEmail = "rafael.minatto@yahoo.com.br";
const loginPassword = "Yukari30@";
const prodUrl = "https://www.moocafisio.com.br";

test.describe("Production Validation - Sticky Exercise Filters", () => {
  test.setTimeout(120000);

  test("should keep exercise headers sticky on scroll", async ({ page }) => {
    console.log(`[Test] Accessing: ${prodUrl}/auth`);
    await page.goto(`${prodUrl}/auth`, { waitUntil: "networkidle" });

    await page.fill('input[name="email"], #login-email', loginEmail);
    await page.fill('input[name="password"], #login-password', loginPassword);
    await page.click('button:has-text("Entrar"), button:has-text("Acessar"), button[type="submit"]');

    await expect.poll(() => page.url(), { timeout: 60000 }).not.toContain("/auth");
    console.log("[Test] Logged in!");

    console.log("[Test] Navigating to Exercises Library...");
    await page.goto(`${prodUrl}/exercises`, { waitUntil: "networkidle" });

    await page.waitForSelector('h2:has-text("Biblioteca de Exercícios")', { timeout: 30000 });
    console.log("[Test] Exercises page loaded.");

    const tabsContainer = page.locator("div.sticky.z-30").first();
    const searchContainer = page.locator("div.sticky.z-20").first();

    console.log("[Test] Scrolling 1000px down...");
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(2000);

    const scrolledTabsBox = await tabsContainer.boundingBox();
    const scrolledSearchBox = await searchContainer.boundingBox();

    console.log(`[Scrolled] Tabs viewport top: ${scrolledTabsBox?.y}, Search viewport top: ${scrolledSearchBox?.y}`);

    if (scrolledTabsBox) {
      expect(scrolledTabsBox.y).toBeGreaterThanOrEqual(30);
      expect(scrolledTabsBox.y).toBeLessThanOrEqual(50);
    } else {
      throw new Error("Tabs container not found or not visible");
    }

    if (scrolledSearchBox) {
      expect(scrolledSearchBox.y).toBeGreaterThanOrEqual(80);
      expect(scrolledSearchBox.y).toBeLessThanOrEqual(115);
    } else {
      throw new Error("Search container not found or not visible");
    }

    console.log("✅ Validation successful: Filters and tabs remain STICKY and VISIBLE in production!");

    await page.screenshot({ path: "test-results/sticky-production-validation.png", fullPage: false });
  });
});
