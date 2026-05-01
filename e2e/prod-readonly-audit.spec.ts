import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

const BASE_URL = process.env.PROD_BASE_URL ?? "https://moocafisio.com.br";
const EMAIL = process.env.TEST_USER_EMAIL ?? "";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

const ROUTES = [
  "/dashboard",
  "/agenda",
  "/schedule/settings",
  "/pacientes",
  "/exercises",
  "/protocols",
  "/financial",
  "/analytics",
  "/settings",
];

type RouteAudit = {
  route: string;
  finalUrl: string;
  status: "ok" | "login-redirect" | "error";
  consoleErrors: string[];
  networkErrors: string[];
  metrics: Record<string, number>;
};

function collect(page: Page) {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("posthog") || text.includes("sentry")) return;
    consoleErrors.push(text.slice(0, 500));
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (status < 400) return;
    if (url.includes("posthog") || url.includes("sentry") || url.includes("google")) return;
    networkErrors.push(`HTTP ${status} ${url}`);
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.includes("posthog") || url.includes("sentry") || url.includes("google")) return;
    networkErrors.push(`FAILED ${url}: ${request.failure()?.errorText ?? "unknown"}`);
  });

  return { consoleErrors, networkErrors };
}

async function metrics(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? 0;

    return {
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
      fcp: Math.round(fcp),
      transferSize: nav.transferSize ?? 0,
    };
  });
}

test("production read-only route audit", async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD are required.");
  }

  const results: RouteAudit[] = [];
  const listeners = collect(page);

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"], #login-email', EMAIL);
  await page.fill('input[type="password"], input[name="password"], #login-password', PASSWORD);
  await page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")').first().click();
  await page.waitForURL((url) => !url.pathname.includes("/auth") && !url.pathname.includes("/login"), {
    timeout: 30000,
  });

  for (const route of ROUTES) {
    listeners.consoleErrors.length = 0;
    listeners.networkErrors.length = 0;

    let status: RouteAudit["status"] = "ok";
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
      if (page.url().includes("/auth") || page.url().includes("/login")) {
        status = "login-redirect";
      }
    } catch {
      status = "error";
    }

    results.push({
      route,
      finalUrl: page.url(),
      status,
      consoleErrors: [...listeners.consoleErrors],
      networkErrors: [...listeners.networkErrors],
      metrics: await metrics(page).catch(() => ({})),
    });
  }

  console.log(JSON.stringify(results, null, 2));
  expect(results.filter((result) => result.status !== "ok")).toEqual([]);
});
