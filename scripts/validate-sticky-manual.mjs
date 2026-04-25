import { chromium } from "playwright";

const loginEmail = "REDACTED_EMAIL";
const loginPassword = "REDACTED";
const prodUrl = "https://www.moocafisio.com.br";

async function validateSticky() {
  console.log("🚀 Starting Manual Sticky Validation...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    console.log(`[1/4] Logging in to ${prodUrl}/auth...`);
    await page.goto(`${prodUrl}/auth`, { waitUntil: "networkidle" });

    await page.fill('input[name="email"], #login-email', loginEmail);
    await page.fill('input[name="password"], #login-password', loginPassword);
    await page.click(
      'button:has-text("Entrar"), button:has-text("Acessar"), button[type="submit"]',
    );

    // Wait for redirection
    await page.waitForURL((url) => !url.href.includes("/auth"), { timeout: 60000 });
    console.log("✅ Logged in!");

    console.log("[2/4] Navigating to Exercises Library...");
    await page.goto(`${prodUrl}/exercises`, { waitUntil: "networkidle" });

    // Updated selector to h1 or data-testid
    await page.waitForSelector(
      '[data-testid="exercise-library-title"], h1:has-text("Biblioteca de Exercícios")',
      { timeout: 30000 },
    );
    console.log("✅ Exercises page loaded.");

    // Scroll
    console.log("[3/4] Scrolling 1000px down...");
    await page.evaluate(() => window.scrollTo(0, 1000));
    await new Promise((r) => setTimeout(r, 3000)); // Wait a bit more for stability

    // Check sticky elements
    const results = await page.evaluate(() => {
      // Find the sticky containers by classes and content
      const stickyElements = Array.from(document.querySelectorAll("div.sticky"));

      // Find tabs (usually have z-30)
      const tabs = stickyElements.find((el) => el.classList.contains("z-30"));
      // Find search/filters (usually have z-20)
      const search = stickyElements.find((el) => el.classList.contains("z-20"));

      if (!tabs || !search) {
        return {
          error: "Sticky containers not found",
          stickyCount: stickyElements.length,
          classes: stickyElements.map((e) => e.className),
        };
      }

      const tabsRect = tabs.getBoundingClientRect();
      const searchRect = search.getBoundingClientRect();

      return {
        tabsY: tabsRect.top,
        searchY: searchRect.top,
        tabsVisible: tabsRect.height > 0,
        searchVisible: searchRect.height > 0,
        tabsClass: tabs.className,
        searchClass: search.className,
      };
    });

    if (results.error) {
      console.error("❌ Error:", results.error);
      console.log("Found sticky elements:", results.stickyCount);
      console.log("Classes found:", results.classes);
    } else {
      console.log(`[4/4] Results: Tabs Top=${results.tabsY}px, Search Top=${results.searchY}px`);

      // Check if they are stuck within the expected range
      // Tabs should be at top-10 (40px) or similar
      const isTabsSticky = results.tabsY < 0; // Tabs should now scroll out of view (negative Y)
      const isSearchSticky = results.tabsY < 0 && results.searchY >= -5 && results.searchY <= 15; // Search should stick at top-0

      if (isSearchSticky) {
        console.log("✅ SUCCESS: ONLY Search is STICKY at the top!");
      } else {
        console.log("❌ FAILURE: Sticky behavior is not as expected.");
        console.log(`Current state: Tabs=${results.tabsY}px, Search=${results.searchY}px`);
        console.log("Expected Tabs < 0, Search ~0px");
      }
    }

    await page.screenshot({ path: "test-results/manual-sticky-validation.png" });
    console.log("📸 Screenshot saved to test-results/manual-sticky-validation.png");
  } catch (error) {
    console.error("❌ Critical Error:", error);
  } finally {
    await browser.close();
  }
}

validateSticky();
