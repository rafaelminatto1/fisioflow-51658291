import { chromium, type Page, type ConsoleMessage } from "playwright";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables if needed
dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env.test" });

const BASE_URL = "https://moocafisio.com.br";
const EMAIL = "REDACTED_EMAIL";
const PASSWORD = "REDACTED";
const REPORT_PATH = path.resolve(process.cwd(), "scripts/audit-report.json");

const ROUTES = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/pacientes", name: "Pacientes" },
  { path: "/agenda", name: "Agenda" },
  { path: "/exercises", name: "Exercícios" },
  { path: "/financial", name: "Financeiro" },
  { path: "/analytics", name: "Analytics" },
  { path: "/settings", name: "Configurações" },
];

async function runAudit() {
  console.log("🚀 Starting standalone production audit...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const auditResults: any[] = [];

  // --- LOGIN ---
  console.log("🔐 Logging in...");
  await page.goto(`${BASE_URL}/auth/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15000 });
    console.log("✅ Login successful");
  } catch (e) {
    console.error("❌ Login failed or timed out");
    await browser.close();
    process.exit(1);
  }

  // --- AUDIT ROUTES ---
  for (const route of ROUTES) {
    console.log(`🔍 Auditing ${route.name} (${route.path})...`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const networkFailures: string[] = [];

    // Attach listeners
    const consoleListener = (msg: ConsoleMessage) => {
      if (msg.type() === "error") errors.push(msg.text());
      if (msg.type() === "warning") warnings.push(msg.text());
    };
    page.on("console", consoleListener);

    const requestListener = (request: any) => {
      const failure = request.failure();
      if (failure) networkFailures.push(`${request.url()} - ${failure.errorText}`);
    };
    page.on("requestfailed", requestListener);

    const startTime = Date.now();
    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000); // Wait for some hydration
    } catch (e: any) {
      errors.push(`Navigation failed: ${e.message}`);
    }
    const duration = Date.now() - startTime;

    // Performance Metrics
    const metrics = await page.evaluate(() => {
      const perf = window.performance.getEntriesByType("navigation")[0] as any;
      return {
        ttfb: perf?.responseStart - perf?.requestStart,
        domInteractive: perf?.domInteractive,
        loadTime: perf?.loadEventEnd,
      };
    });

    auditResults.push({
      name: route.name,
      path: route.path,
      durationMs: duration,
      errors,
      warnings,
      networkFailures,
      metrics,
    });

    // Cleanup listeners for next route
    page.off("console", consoleListener);
    page.off("requestfailed", requestListener);

    console.log(`   Done in ${duration}ms. Errors: ${errors.length}, Warnings: ${warnings.length}`);
  }

  // --- SAVE REPORT ---
  const finalReport = {
    timestamp: new Date().toISOString(),
    results: auditResults,
    summary: {
      totalPages: auditResults.length,
      totalErrors: auditResults.reduce((acc, r) => acc + r.errors.length, 0),
      totalWarnings: auditResults.reduce((acc, r) => acc + r.warnings.length, 0),
    },
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(finalReport, null, 2));
  console.log(`\n📊 Audit complete! Report saved to ${REPORT_PATH}`);

  await browser.close();
}

runAudit().catch(console.error);
