import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb";

async function main() {
  console.log("Iniciando navegador Chromium para captura visual...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    console.log("Acessando https://moocafisio.com.br/auth/login...");
    await page.goto("https://moocafisio.com.br/auth/login", { waitUntil: "networkidle" });
    const loginScreenshotPath = path.join(ARTIFACT_DIR, "prod_login_page.png");
    await page.screenshot({ path: loginScreenshotPath, fullPage: true });
    console.log(`Saved: ${loginScreenshotPath}`);

    console.log("Acessando https://moocafisio.com.br/inteligencia...");
    await page.goto("https://moocafisio.com.br/inteligencia", { waitUntil: "networkidle" });
    const authRedirectPath = path.join(ARTIFACT_DIR, "prod_inteligencia_redirect.png");
    await page.screenshot({ path: authRedirectPath, fullPage: true });
    console.log(`Saved: ${authRedirectPath}`);

  } catch (error) {
    console.error("Erro durante captura:", error);
  } finally {
    await browser.close();
    console.log("Capturas concluídas.");
  }
}

main();
