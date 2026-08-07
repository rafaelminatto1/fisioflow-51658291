import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb";
const USER_EMAIL = "rafael.minatto@yahoo.com.br";
const USER_PASS = "Yukari30@";

async function main() {
  console.log("Iniciando Chromium para captura da resposta completa do Copiloto...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto("https://moocafisio.com.br/auth/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASS);
    
    const submitBtn = page.locator('button:has-text("Entrar"), button[type="submit"], .btn-primary').first();
    await submitBtn.click();

    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });

    await page.goto("https://moocafisio.com.br/inteligencia?tab=copilot", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const chatInput = page.locator('textarea, input[placeholder*="pergunta"], input[placeholder*="Digite"], input[placeholder*="Copiloto"], textarea[placeholder*="pergunta"]').first();
    if (await chatInput.isVisible()) {
      const promptText = "Qual o protocolo de reabilitação baseado em evidências de alto nível (nível Ouro) para pós-operatório de reconstrução do LCA (Fase 1: Semanas 1 a 4)? Detalhe controle de edema, extensão total de joelho e ativação de quadríceps.";
      await chatInput.fill(promptText);
      await chatInput.press("Enter");

      console.log("Aguardando 12 segundos para geração completa da resposta...");
      await page.waitForTimeout(12000);

      const responseScreenshotPath = path.join(ARTIFACT_DIR, "prod_copilot_full_response.png");
      await page.screenshot({ path: responseScreenshotPath, fullPage: true });
      console.log(`Saved: ${responseScreenshotPath}`);
    }

  } catch (error) {
    console.error("Erro ao capturar resposta:", error);
  } finally {
    await browser.close();
    console.log("Captura concluída.");
  }
}

main();
