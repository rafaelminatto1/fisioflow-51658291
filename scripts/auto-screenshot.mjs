import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, "../screenshots");

if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

async function autoScreenshot() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    console.log("🔍 Navigating to login page...");
    await page.goto("http://localhost:8080/auth", { waitUntil: "networkidle" });

    // Login
    console.log("📧 Logging in...");
    await page.fill('input[type="email"]', "REDACTED_EMAIL");
    await page.fill('input[type="password"]', "REDACTED");
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL(/\/(eventos|dashboard|schedule)/, { timeout: 10000 });
    console.log("✅ Logged in!");

    // Navigate to schedule
    console.log("📅 Going to schedule...");
    await page.goto("http://localhost:8080/schedule", { waitUntil: "networkidle" });

    // Look for appointment card and click
    console.log("🔍 Looking for appointment...");
    await page.waitForTimeout(1000);

    // Try to find and click an appointment
    const appointmentFound =
      (await page.locator('.appointment-card, [role="button"]:has-text("Dr.")').count()) > 0;

    if (appointmentFound) {
      await page.click('.appointment-card, [role="button"]:has-text("Dr.")', { timeout: 5000 });
      await page.waitForTimeout(500);

      // Click "Iniciar atendimento"
      const startButton = page.locator('button:has-text("Iniciar atendimento")');
      if ((await startButton.count()) > 0) {
        await startButton.click();
        console.log("✅ Starting attendance...");
      }
    }

    // Wait for evolution page
    await page.waitForURL(/\/patients\/.*\/evolution\/.*/, { timeout: 15000 });
    console.log("✅ On evolution page!");

    // Click Evolução tab if needed
    const evolucaoTab = page.locator('button[value="evolucao"]');
    if ((await evolucaoTab.count()) > 0) {
      await evolucaoTab.click();
      await page.waitForTimeout(500);
    }

    // Clear localStorage for fresh state
    await page.evaluate(() => {
      localStorage.removeItem("evolution_layout_v1");
    });
    console.log("🗑️  Cleared saved layout from localStorage");

    // Reload to apply cleared state
    await page.reload({ waitUntil: "networkidle" });

    // Wait for grid to load
    await page.waitForSelector(".react-grid-layout", { timeout: 10000 });
    await page.waitForSelector(".react-grid-item", { timeout: 5000 });
    await page.waitForTimeout(1000); // Extra wait for rendering

    console.log("📸 Taking screenshots...");

    // Screenshot 1: Full page - Collapsed state
    await page.screenshot({
      path: "screenshots/01-grid-collapsed-full.avif",
      fullPage: true,
    });
    console.log("✅ Saved: screenshots/01-grid-collapsed-full.avif");

    // Get widget positions
    const items = await page.locator(".react-grid-item").all();
    console.log(`\n📊 Widget positions (${items.length} widgets):`);

    const positions = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const box = await item.boundingBox();
      const text = await item
        .locator("h3, .card-title")
        .first()
        .textContent()
        .catch(() => `Widget ${i + 1}`);

      if (box) {
        positions.push({
          index: i,
          name: text.trim(),
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
        console.log(`   ${i + 1}. ${text.trim()}`);
        console.log(`      Position: x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
        console.log(`      Size: ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
    }

    // Check if Pain Scale and Exercises are on same row
    const painScale = positions.find((p) => p.name.includes("Nível de Dor"));
    const exercises = positions.find((p) => p.name.includes("Exercícios"));

    if (painScale && exercises) {
      const yDiff = Math.abs(painScale.y - exercises.y);
      console.log(`\n🔍 Pain Scale vs Exercises Y difference: ${yDiff}px`);
      if (yDiff < 50) {
        console.log("✅ SUCCESS: Pain Scale and Exercises are on the SAME row!");
      } else {
        console.log("❌ PROBLEM: Pain Scale and Exercises are on DIFFERENT rows!");
      }
    }

    // Try to expand Pain Scale
    console.log("\n🔄 Expanding Pain Scale...");
    const painScaleWidget = page.locator(".react-grid-item").filter({ hasText: /Nível de Dor/i });
    const expandBtn = painScaleWidget.locator(
      'button:has(.lucide-chevron-down), button[aria-label*="Expandir"]',
    );

    const hasExpandBtn = (await expandBtn.count()) > 0;
    if (hasExpandBtn) {
      await expandBtn.click();
      await page.waitForTimeout(1000);

      // Screenshot 2: Full page - Expanded state
      await page.screenshot({
        path: "screenshots/02-grid-expanded-full.avif",
        fullPage: true,
      });
      console.log("✅ Saved: screenshots/02-grid-expanded-full.avif");

      // Get widget positions after expansion
      const expandedItems = await page.locator(".react-grid-item").all();
      console.log(`\n📊 Widget positions after expansion (${expandedItems.length} widgets):`);

      for (let i = 0; i < Math.min(expandedItems.length, 10); i++) {
        const item = expandedItems[i];
        const box = await item.boundingBox();
        const text = await item
          .locator("h3, .card-title")
          .first()
          .textContent()
          .catch(() => `Widget ${i + 1}`);

        if (box) {
          console.log(`   ${i + 1}. ${text.trim()}`);
          console.log(`      Position: x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
        }
      }
    } else {
      console.log("⚠️  Could not find expand button");
    }

    console.log("\n✅ Screenshots complete!");
    console.log("📁 Check the screenshots/ directory");
    console.log("⏳ Keeping browser open for 10 seconds for manual verification...");
    await page.waitForTimeout(10000);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await page.screenshot({ path: "screenshots/error.avif" });
  } finally {
    await browser.close();
  }
}

autoScreenshot().catch(console.error);
