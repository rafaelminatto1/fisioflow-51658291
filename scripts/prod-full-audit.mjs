import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.PROD_BASE_URL || "https://www.moocafisio.com.br";
const EMAIL = process.env.TEST_USER_EMAIL || process.env.E2E_EMAIL || "";
const PASSWORD = process.env.TEST_USER_PASSWORD || process.env.E2E_PASSWORD || "";

const OUTPUT_DIR = path.resolve(process.cwd(), "tmp", "prod-audit-2026-06-19");
const JSON_PATH = path.join(OUTPUT_DIR, "audit-results.json");
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");

const ROUTES = [
  { key: "agenda", label: "Agenda", path: "/agenda" },
  { key: "patients", label: "Pacientes", path: "/patients" },
  { key: "crm-whatsapp", label: "CRM WhatsApp", path: "/crm-whatsapp" },
  { key: "whatsapp-inbox", label: "WhatsApp Inbox", path: "/whatsapp/inbox" },
  { key: "avaliacao-inicial", label: "Avaliacao Inicial", path: "/avaliacao-inicial" },
  { key: "evolucao-clinica", label: "Evolucao Clinica", path: "/evolucao-clinica" },
  { key: "exercises", label: "Exercicios", path: "/exercises" },
  { key: "exercicios-busca-ia", label: "Exercicios Busca IA", path: "/exercicios/busca-ia" },
  { key: "exercicios-curadoria", label: "Exercicios Curadoria", path: "/exercicios/curadoria" },
  { key: "protocols", label: "Protocolos", path: "/protocols" },
  { key: "clinical-tests", label: "Testes Clinicos", path: "/clinical-tests" },
  { key: "templates", label: "Avaliacoes Templates", path: "/templates" },
  { key: "inteligencia", label: "Central de Inteligencia AI", path: "/inteligencia" },
  { key: "copiloto", label: "Copiloto Clinico AI", path: "/copiloto" },
  { key: "base-conhecimento", label: "Base de Conhecimento AI", path: "/base-conhecimento" },
  { key: "briefing", label: "Briefing do Dia", path: "/briefing" },
  { key: "automacoes", label: "Automacoes", path: "/automacoes" },
  { key: "monitor", label: "Monitor de Atividades", path: "/monitor" },
  { key: "eventos", label: "Eventos", path: "/eventos" },
  { key: "boards", label: "Boards", path: "/boards" },
  { key: "cadastros", label: "Cadastros", path: "/cadastros" },
  { key: "wiki", label: "Wiki Clinica", path: "/wiki" },
  { key: "inventory", label: "Estoque", path: "/inventory" },
  { key: "telemedicine", label: "Telemedicina", path: "/telemedicine" },
  { key: "communications", label: "Comunicacao", path: "/communications" },
  { key: "settings", label: "Configuracoes", path: "/settings" },
  { key: "agenda-settings", label: "Configuracoes Agenda", path: "/agenda/settings" },
];

const PATIENT_TABS = [
  { key: "overview", label: "Visao Geral" },
  { key: "evolution", label: "Evolucao" },
  { key: "timeline", label: "Linha do Tempo" },
  { key: "analytics", label: "Analytics IA" },
  { key: "personal", label: "Dados Pessoais" },
  { key: "clinical", label: "Historico Clinico" },
  { key: "activity-lab", label: "Biomecanica" },
  { key: "financial", label: "Financeiro" },
  { key: "gamification", label: "Gamificacao" },
  { key: "documents", label: "Arquivos" },
  { key: "tasks", label: "Tarefas" },
  { key: "evidence", label: "Evidencia" },
];

const NOISE_PATTERNS = [
  "posthog",
  "clarity",
  "sentry",
  "google-analytics",
  "googleads",
  "doubleclick",
  "hotjar",
  "facebook",
];

const audit = [];
let currentScope = "boot";
let discoveredPatientPath = "";

function isNoise(urlOrText) {
  const value = String(urlOrText || "").toLowerCase();
  return NOISE_PATTERNS.some((pattern) => value.includes(pattern));
}

function pushEvent(store, type, payload) {
  store.push({
    type,
    scope: currentScope,
    at: new Date().toISOString(),
    ...payload,
  });
}

async function ensureDirs() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function writeSnapshot() {
  await fs.writeFile(
    JSON_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        patientPath: discoveredPatientPath,
        totalPages: audit.length,
        results: audit,
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function safeWait(page, ms = 1200) {
  await page.waitForTimeout(ms).catch(() => {});
}

async function waitForSettled(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await safeWait(page, 1200);
}

async function login(page) {
  currentScope = "login";
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator('input[type="email"], input[name="email"], #login-email').first().fill(EMAIL);
  await page
    .locator('input[type="password"], input[name="password"], #login-password')
    .first()
    .fill(PASSWORD);
  await page
    .locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")')
    .first()
    .click();
  await page.waitForURL((url) => !/\/auth|\/login/.test(url.pathname), { timeout: 30000 });
  await waitForSettled(page);
}

async function capturePage(page, route, extra = {}) {
  const result = {
    routeKey: route.key,
    label: route.label,
    path: route.path,
    startedAt: new Date().toISOString(),
    finalUrl: "",
    status: "ok",
    screenshot: "",
    ...extra,
  };
  const events = [];
  const start = Date.now();

  const onConsole = async (msg) => {
    const text = msg.text();
    if (isNoise(text)) return;
    if (!["error", "warning"].includes(msg.type())) return;
    const location = msg.location();
    pushEvent(events, "console", {
      level: msg.type(),
      text,
      sourceUrl: location?.url || "",
      lineNumber: location?.lineNumber ?? null,
      columnNumber: location?.columnNumber ?? null,
    });
  };

  const onPageError = async (error) => {
    pushEvent(events, "pageerror", {
      text: error?.message || String(error),
      stack: error?.stack || "",
    });
  };

  const onResponse = async (response) => {
    const status = response.status();
    const url = response.url();
    if (status < 400 || isNoise(url)) return;
    const request = response.request();
    pushEvent(events, "response", {
      status,
      url,
      method: request.method(),
      resourceType: request.resourceType(),
    });
  };

  const onRequestFailed = async (request) => {
    const url = request.url();
    if (isNoise(url)) return;
    pushEvent(events, "requestfailed", {
      url,
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText || "",
    });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);

  try {
    currentScope = route.label;
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForSettled(page);

    if (/\/auth|\/login/.test(new URL(page.url()).pathname)) {
      result.status = "login-redirect";
    }

    if (route.key === "patients") {
      await ensurePatientsListTab(page);
      result.discoveredPatientPath = await tryFindPatientPathInCurrentPage(page);
      if (result.discoveredPatientPath && !discoveredPatientPath) {
        discoveredPatientPath = result.discoveredPatientPath;
      }
    }

    const clickedTabs = await clickVisibleTabs(page, route.label, events);
    result.clickedTabs = clickedTabs;
  } catch (error) {
    result.status = "error";
    pushEvent(events, "navigation", {
      text: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack || "" : "",
    });
  } finally {
    result.finalUrl = page.url();
    result.durationMs = Date.now() - start;
    const screenshotName = `${String(audit.length + 1).padStart(2, "0")}-${route.key}.png`;
    result.screenshot = path.join(SCREENSHOT_DIR, screenshotName);
    await page.screenshot({ path: result.screenshot, fullPage: false }).catch(() => {});
    result.events = dedupeEvents(events);
    audit.push(result);
    await writeSnapshot();
    console.log(
      `[audit] ${route.label} | status=${result.status} | events=${result.events.length} | url=${result.finalUrl}`,
    );
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
    page.off("requestfailed", onRequestFailed);
  }
}

async function clickVisibleTabs(page, label, events) {
  const seen = new Set();
  const selectors = ['[role="tab"]', '[data-state="active"]', 'button[class*="tab"]'];

  for (const selector of selectors) {
    const tabs = await page.locator(selector).all();
    for (const tab of tabs) {
      try {
        const text = (await tab.textContent())?.trim();
        if (!text || seen.has(text)) continue;
        if (!(await tab.isVisible())) continue;
        seen.add(text);
        currentScope = `${label} > ${text}`;
        await tab.click({ timeout: 3000 });
        await safeWait(page, 900);
      } catch (error) {
        pushEvent(events, "tab-click", {
          text: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (seen.size > 0) break;
  }

  currentScope = label;
  return [...seen];
}

function dedupeEvents(events) {
  const seen = new Set();
  return events.filter((event) => {
    const key = JSON.stringify([
      event.type,
      event.scope,
      event.level,
      event.status,
      event.url,
      event.text,
      event.sourceUrl,
      event.lineNumber,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function tryFindPatientPathInCurrentPage(page) {
  return page.evaluate(() => {
    const attrNodes = Array.from(document.querySelectorAll("[data-patient-id]"));
    for (const node of attrNodes) {
      const patientId = node.getAttribute("data-patient-id");
      if (patientId && /^[0-9a-f-]{36}$/i.test(patientId)) return `/patients/${patientId}`;
    }

    const anchors = Array.from(document.querySelectorAll("a[href*=\"/patients/\"]"));
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href");
      if (href && /\/patients\/[0-9a-f-]{36}/i.test(href)) return href;
    }

    return null;
  });
}

async function ensurePatientsListTab(page) {
  const cockpitTab = page
    .locator('[role="tab"]')
    .filter({ hasText: /cockpit clínico|cockpit clinico/i })
    .first();

  if (await cockpitTab.isVisible().catch(() => false)) {
    await cockpitTab.click({ timeout: 3000 }).catch(() => {});
    await safeWait(page, 1200);
  }
}

async function auditPatientTabs(page, patientPath) {
  for (const tab of PATIENT_TABS) {
    await capturePage(page, {
      key: `patient-${tab.key}`,
      label: `Paciente > ${tab.label}`,
      path: `${patientPath}?tab=${encodeURIComponent(tab.key)}`,
    });
  }
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    throw new Error("Defina TEST_USER_EMAIL/TEST_USER_PASSWORD ou E2E_EMAIL/E2E_PASSWORD.");
  }

  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await login(page);

    for (const route of ROUTES) {
      await capturePage(page, route);
    }

    if (!discoveredPatientPath) {
      throw new Error("Nenhum link de perfil de paciente foi encontrado em /patients.");
    }

    await auditPatientTabs(page, discoveredPatientPath);
    await writeSnapshot();

    console.log(JSON_PATH);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
