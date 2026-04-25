import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const email = process.env.E2E_LOGIN_EMAIL;
const password = process.env.E2E_LOGIN_PASSWORD;
const baseUrl = process.env.BASE_URL || "https://www.moocafisio.com.br";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localIndexPath = path.resolve(__dirname, "../apps/web/dist/index.html");

if (!email || !password) {
  throw new Error("E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD sao obrigatorios.");
}

async function expectEvidencePanel(page) {
  await page.getByText("Evidência científica").waitFor({ timeout: 30000 });
}

function getEmailLocator(page) {
  return page
    .locator("[data-testid=auth-email-input], input[type='email'], input[name='email']")
    .first();
}

function getPasswordLocator(page) {
  return page
    .locator("[data-testid=auth-password-input], input[type='password'], input[name='password']")
    .first();
}

function getSubmitLocator(page) {
  return page
    .locator(
      "[data-testid=auth-submit-button], button[type='submit'], button:has-text('Acessar Minha Conta')",
    )
    .first();
}

function readVersionMarkers(html) {
  return {
    appVersion: html.match(/<meta name="app-version" content="([^"]+)"/)?.[1] ?? null,
    buildTime: html.match(/<meta name="build-time" content="([^"]+)"/)?.[1] ?? null,
  };
}

async function getLocalBuildVersion() {
  try {
    const html = await readFile(localIndexPath, "utf-8");
    return readVersionMarkers(html);
  } catch {
    return null;
  }
}

async function getRemoteBuildVersion() {
  const response = await fetch(baseUrl);
  const html = await response.text();
  return readVersionMarkers(html);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(30000);

try {
  const [localBuild, remoteBuild] = await Promise.all([
    getLocalBuildVersion(),
    getRemoteBuildVersion(),
  ]);

  console.log(
    `[validate] versoes local=${localBuild?.appVersion ?? "n/a"} remote=${remoteBuild?.appVersion ?? "n/a"}`,
  );
  if (
    localBuild?.appVersion &&
    remoteBuild?.appVersion &&
    localBuild.appVersion !== remoteBuild.appVersion
  ) {
    console.warn(
      `[validate] WARNING: producao serve build diferente do local (${remoteBuild.appVersion} != ${localBuild.appVersion})`,
    );
  }

  console.log("[validate] abrindo auth");
  await page.goto(`${baseUrl}/auth`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await getEmailLocator(page).waitFor({ state: "visible", timeout: 60000 });

  console.log("[validate] preenchendo login");
  await getEmailLocator(page).fill(email);
  await getPasswordLocator(page).fill(password);
  await getSubmitLocator(page).click();

  console.log("[validate] aguardando pós-login");
  await page.waitForURL(
    (url) =>
      url.pathname.includes("/agenda") ||
      url.pathname.includes("/dashboard") ||
      url.pathname === "/",
    { timeout: 60000 },
  );

  const loginPath = new URL(page.url()).pathname;
  console.log(`[validate] login ok em ${loginPath}`);

  console.log("[validate] abrindo rota legada /ai/dicom");
  await page.goto(`${baseUrl}/ai/dicom`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForURL(
    (url) =>
      url.pathname === "/biomechanics" ||
      url.pathname === "/clinical/biomechanics" ||
      url.pathname === "/auth",
    { timeout: 60000 },
  );

  const dicomRedirectPath = new URL(page.url()).pathname;
  console.log(`[validate] redirect ok em ${dicomRedirectPath}`);

  console.log("[validate] validando jump");
  await page.goto(`${baseUrl}/clinical/biomechanics/jump`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await expectEvidencePanel(page);
  const jumpArticleLinks = await page.getByRole("link", { name: /ler artigo/i }).count();
  const jumpWikiActions = await page
    .locator("button")
    .filter({ hasText: /Ler na wiki|Adicionar à wiki/i })
    .count();

  console.log("[validate] validando gait");
  await page.goto(`${baseUrl}/clinical/biomechanics/gait`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await expectEvidencePanel(page);

  console.log("[validate] validando posture");
  await page.goto(`${baseUrl}/clinical/biomechanics/posture`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await expectEvidencePanel(page);

  console.log("[validate] validando functional");
  await page.goto(`${baseUrl}/clinical/biomechanics/functional`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await expectEvidencePanel(page);

  console.log(
    JSON.stringify(
      {
        ok: true,
        loginPath,
        dicomRedirectPath,
        jumpArticleLinks,
        jumpWikiActions,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        url: page.url(),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
