import { chromium, type FullConfig } from "@playwright/test";

/**
 * Global Setup for Playwright E2E Tests
 * Authenticates once and saves storage state for all tests
 */
async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log(`🚀 Iniciando autenticação global em: ${baseURL}`);
    await page.goto(baseURL + "/login" || "http://localhost:3001/login");

    // Preenche o formulário de login com credenciais de teste
    // NOTA: Estas credenciais devem ser passadas via ENV no CI
    await page.fill('input[type="email"]', process.env.E2E_USER || "admin@moocafisio.com.br");
    await page.fill('input[type="password"]', process.env.E2E_PASSWORD || "admin123");
    await page.click('button[type="submit"]');

    // Espera o redirecionamento para o dashboard
    await page.waitForURL("**/agenda");

    // Salva o estado (cookies, localStorage) para os outros testes
    await page.context().storageState({ path: storageState as string });
    console.log("✅ Autenticação concluída e sessão salva.");
  } catch (error) {
    console.error("❌ Falha na autenticação global:", error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
