import { chromium, type Page, type ConsoleMessage } from "playwright";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env.test" });

const BASE_URL = "https://moocafisio.com.br";
const EMAIL = "rafael.minatto@yahoo.com.br";
const PASSWORD = "Yukari30@";
const REPORT_PATH = path.resolve(process.cwd(), "scripts/deep-audit-report.json");

const ROUTES = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/pacientes", name: "Pacientes" },
  { path: "/agenda", name: "Agenda" },
  { path: "/exercises", name: "Exercícios" },
  { path: "/financial", name: "Financeiro" },
  { path: "/analytics", name: "Analytics" },
  { path: "/settings", name: "Configurações" },
];

async function runDeepAudit() {
  console.log("🚀 Starting deep production audit (Tabs & Interactions)...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const auditResults: any[] = [];

  // --- LOGIN ---
  console.log("🔐 Logging in...");
  try {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15000 });
    console.log("✅ Login successful");
  } catch (e: any) {
    console.error("❌ Login failed:", e.message);
    await browser.close();
    process.exit(1);
  }

  // --- AUDIT ROUTES & TABS ---
  for (const route of ROUTES) {
    console.log(`\n🔍 Auditing ${route.name} (${route.path})...`);
    
    const routeResults: any = {
      name: route.name,
      path: route.path,
      tabs: [],
      errors: [],
      warnings: [],
      networkErrors: []
    };

    const consoleListener = (msg: ConsoleMessage) => {
      const text = msg.text();
      if (msg.type() === "error") {
        console.log(`   [ERROR] ${text}`);
        routeResults.errors.push(text);
      }
      if (msg.type() === "warning") routeResults.warnings.push(text);
    };

    const requestFailedListener = (request: any) => {
      const failure = request.failure();
      const errorText = `${request.url()} - ${failure?.errorText || 'Unknown'}`;
      routeResults.networkErrors.push({ type: 'failed', url: request.url(), error: failure?.errorText });
      console.log(`   [NET FAIL] ${errorText}`);
    };

    const responseListener = (response: any) => {
      const status = response.status();
      if (status >= 400) {
        routeResults.networkErrors.push({ type: 'http_error', url: response.url(), status });
        console.log(`   [HTTP ERROR] ${status} - ${response.url()}`);
      }
    };

    page.on("console", consoleListener);
    page.on("requestfailed", requestFailedListener);
    page.on("response", responseListener);

    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(3000);

      // Find all tabs on the page
      const tabs = await page.locator('[role="tab"]').all();
      console.log(`   Found ${tabs.length} tabs.`);

      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const tabName = await tab.innerText() || `Tab ${i+1}`;
        console.log(`   -> Clicking tab: ${tabName}`);
        
        try {
          await tab.click();
          await page.waitForTimeout(2000); // Wait for tab content to render
          
          routeResults.tabs.push({
            name: tabName,
            status: "ok"
          });
        } catch (tabErr: any) {
          console.error(`   [TAB ERROR] ${tabName}: ${tabErr.message}`);
          routeResults.tabs.push({
            name: tabName,
            status: "error",
            error: tabErr.message
          });
        }
      }

    } catch (e: any) {
      console.error(`   [ROUTE ERROR] ${route.name}: ${e.message}`);
      routeResults.errors.push(`Navigation/Interaction failed: ${e.message}`);
    }

    auditResults.push(routeResults);

    // Cleanup listeners
    page.off("console", consoleListener);
    page.off("requestfailed", requestFailedListener);
    page.off("response", responseListener);
  }

  // --- SAVE REPORT ---
  const finalReport = {
    timestamp: new Date().toISOString(),
    results: auditResults,
    summary: {
      totalPages: auditResults.length,
      totalErrors: auditResults.reduce((acc, r) => acc + r.errors.length, 0),
      totalWarnings: auditResults.reduce((acc, r) => acc + r.warnings.length, 0),
      totalNetworkErrors: auditResults.reduce((acc, r) => acc + r.networkErrors.length, 0),
      totalTabsTested: auditResults.reduce((acc, r) => acc + r.tabs.length, 0)
    }
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(finalReport, null, 2));
  console.log(`\n📊 Deep Audit complete! Report saved to ${REPORT_PATH}`);

  await browser.close();
}

runDeepAudit().catch(console.error);
