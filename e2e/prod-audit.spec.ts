/**
 * FisioFlow Production Audit Script
 * Audits all pages for console errors, warnings, and performance issues.
 *
 * Usage:
 *   BASE_URL=https://moocafisio.com.br npx playwright test scripts/prod-audit.spec.ts --reporter=list
 */

import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ─── Config ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://moocafisio.com.br";
const EMAIL = "rafael.minatto@yahoo.com.br";
const PASSWORD = "Yukari30@";
const REPORT_PATH = path.resolve(
  process.cwd(),
  "scripts/prod-audit-report.json"
);

// ─── Routes to audit (from src/routes.ts) ───────────────────────────────────

const ROUTES: { path: string; name: string; tabs?: string[] }[] = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/pacientes", name: "Pacientes" },
  {
    path: "/agenda",
    name: "Agenda",
    tabs: ["[data-tab]", "[role='tab']"],
  },
  { path: "/exercises", name: "Exercícios" },
  { path: "/protocols", name: "Protocolos" },
  { path: "/financial", name: "Financeiro" },
  { path: "/financeiro/fluxo-caixa", name: "Fluxo de Caixa" },
  { path: "/financeiro/contas", name: "Contas Financeiras" },
  { path: "/financeiro/recibos", name: "Recibos" },
  { path: "/financeiro/nfse", name: "NFS-e" },
  { path: "/analytics", name: "Analytics" },
  { path: "/telemedicine", name: "Telemedicina" },
  { path: "/whatsapp/inbox", name: "WhatsApp Inbox" },
  { path: "/whatsapp/dashboard", name: "WhatsApp Dashboard" },
  { path: "/whatsapp/automations", name: "WhatsApp Automações" },
  { path: "/whatsapp/templates", name: "WhatsApp Templates" },
  { path: "/settings", name: "Configurações" },
  { path: "/schedule/settings", name: "Config Agenda" },
  { path: "/profile", name: "Perfil" },
  { path: "/organization", name: "Organização" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface PageAuditResult {
  route: string;
  name: string;
  url: string;
  loadTimeMs: number;
  status: "ok" | "error" | "timeout";
  consoleErrors: string[];
  consoleWarnings: string[];
  networkErrors: string[];
  tabsAudited: string[];
  screenshot?: string;
  performanceMetrics?: Record<string, number>;
}

const auditResults: PageAuditResult[] = [];
const globalErrors: string[] = [];

function collectConsoleMessages(page: Page) {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    const text = msg.text();
    const type = msg.type();
    // Skip noisy browser internals
    if (
      text.includes("Download the React DevTools") ||
      text.includes("[HMR]") ||
      text.includes("vite") ||
      text.includes("posthog")
    )
      return;

    if (type === "error") errors.push(`[ERROR] ${text}`);
    else if (type === "warning") warnings.push(`[WARN] ${text}`);
  });

  return { errors, warnings };
}

function collectNetworkErrors(page: Page) {
  const networkErrors: string[] = [];

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    // Only flag API/asset failures (not analytics, tracking etc)
    if (
      status >= 400 &&
      !url.includes("posthog") &&
      !url.includes("sentry") &&
      !url.includes("google-analytics") &&
      !url.includes("clarity") &&
      !url.includes("hotjar")
    ) {
      networkErrors.push(`HTTP ${status}: ${url}`);
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (
      !url.includes("posthog") &&
      !url.includes("sentry") &&
      !url.includes("google-analytics")
    ) {
      networkErrors.push(`REQUEST FAILED: ${url} — ${request.failure()?.errorText}`);
    }
  });

  return networkErrors;
}

async function getPerformanceMetrics(
  page: Page
): Promise<Record<string, number>> {
  return await page.evaluate(() => {
    const nav = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType("paint");

    const fcp =
      paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? 0;
    const lcp = 0; // Would need PerformanceObserver - captured separately

    return {
      domContentLoaded: Math.round(
        nav.domContentLoadedEventEnd - nav.startTime
      ),
      loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      fcp: Math.round(fcp),
      domInteractive: Math.round(nav.domInteractive - nav.startTime),
      transferSize: nav.transferSize ?? 0,
    };
  });
}

async function clickAllTabs(
  page: Page,
  auditedTabs: string[]
): Promise<void> {
  // Try multiple tab selectors
  const tabSelectors = [
    '[role="tab"]:not([disabled])',
    ".tabs-trigger",
    "[data-state]",
    'button[class*="tab"]',
  ];

  for (const selector of tabSelectors) {
    const tabs = await page.locator(selector).all();
    for (const tab of tabs) {
      try {
        const isVisible = await tab.isVisible();
        const text = await tab.textContent().catch(() => "unknown");
        if (isVisible && text) {
          const trimmedText = text.trim();
          if (trimmedText && !auditedTabs.includes(trimmedText)) {
            await tab.click({ timeout: 3000 });
            await page.waitForTimeout(800); // let content render
            auditedTabs.push(trimmedText);
          }
        }
      } catch {
        // Tab may have disappeared or navigated — skip
      }
    }
    if (auditedTabs.length > 0) break; // Found tabs with first matching selector
  }
}

// ─── Audit ──────────────────────────────────────────────────────────────────

test.describe("Production Audit", () => {
  test.describe.configure({ mode: "serial" });

  for (const route of ROUTES) {
    test(`[AUDIT] ${route.name} → ${route.path}`, async ({ page }, testInfo) => {
      const { errors, warnings } = collectConsoleMessages(page);
      const networkErrors = collectNetworkErrors(page);
      const auditedTabs: string[] = [];

      const startTime = Date.now();
      let status: "ok" | "error" | "timeout" = "ok";

      try {
        await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });

        // Check if we got redirected to login (auth guard)
        if (page.url().includes("/auth") || page.url().includes("/login")) {
           // If we are here, storage state might not have worked or session expired
           // But global setup should have handled it. Let's log it.
           errors.push(`Redirected to login on ${route.path}`);
           status = "error";
        } else {
          // Wait for main content to appear
          await page.waitForTimeout(3000);

          // Click all tabs in the page
          await clickAllTabs(page, auditedTabs);

          // Wait a bit more to collect any async errors
          await page.waitForTimeout(2000);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("Timeout") || errMsg.includes("timeout")) {
          status = "timeout";
        } else {
          status = "error";
        }
        errors.push(`Navigation error: ${errMsg}`);
      }

      const loadTimeMs = Date.now() - startTime;

      // Performance metrics
      let performanceMetrics: Record<string, number> | undefined;
      try {
        performanceMetrics = await getPerformanceMetrics(page);
      } catch {
        // page may have navigated, skip
      }

      // Screenshot on error
      let screenshotPath: string | undefined;
      if (errors.length > 0 || status !== "ok") {
        const screenshotName = `audit-${route.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
        screenshotPath = path.resolve(process.cwd(), "test-results", screenshotName);
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
      }

      const result: PageAuditResult = {
        route: route.path,
        name: route.name,
        url: page.url(),
        loadTimeMs,
        status,
        consoleErrors: [...errors],
        consoleWarnings: [...warnings],
        networkErrors: [...networkErrors],
        tabsAudited,
        screenshot: screenshotPath,
        performanceMetrics,
      };

      auditResults.push(result);

      // Log summary per page
      const errorCount = errors.length;
      const warnCount = warnings.length;
      const netCount = networkErrors.length;
      const tabs = auditedTabs.length;
      const icon = errorCount > 0 ? "🔴" : warnCount > 0 ? "🟡" : "🟢";
      console.log(
        `${icon} ${route.name.padEnd(25)} | ` +
          `${String(loadTimeMs).padStart(5)}ms | ` +
          `tabs: ${tabs} | ` +
          `errors: ${errorCount} | ` +
          `warns: ${warnCount} | ` +
          `net: ${netCount}`
      );

      // Attach data to report
      testInfo.attach(`audit-${route.name}`, {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
      });
    });
  }
});

// ─── Generate Final Report ────────────────────────────────────────────────────

test.afterAll(async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalPages: auditResults.length,
    summary: {
      pagesWithErrors: auditResults.filter((r) => r.consoleErrors.length > 0)
        .length,
      pagesWithWarnings: auditResults.filter(
        (r) => r.consoleWarnings.length > 0
      ).length,
      pagesWithNetworkErrors: auditResults.filter(
        (r) => r.networkErrors.length > 0
      ).length,
      timeouts: auditResults.filter((r) => r.status === "timeout").length,
      avgLoadTimeMs:
        Math.round(
          auditResults.reduce((acc, r) => acc + r.loadTimeMs, 0) /
            auditResults.length
        ),
    },
    globalErrors,
    pages: auditResults,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n📊 Report saved → ${REPORT_PATH}`);
  console.log(`\n====== AUDIT SUMMARY ======`);
  console.log(`Total pages: ${report.totalPages}`);
  console.log(`Pages with JS errors: ${report.summary.pagesWithErrors}`);
  console.log(`Pages with warnings: ${report.summary.pagesWithWarnings}`);
  console.log(
    `Pages with network errors: ${report.summary.pagesWithNetworkErrors}`
  );
  console.log(`Avg load time: ${report.summary.avgLoadTimeMs}ms`);
});
