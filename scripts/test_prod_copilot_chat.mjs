import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb";
const USER_EMAIL = "rafael.minatto@yahoo.com.br";
const USER_PASS = "Yukari30@";

async function main() {
  console.log("Iniciando Chromium para teste interativo do Copiloto em Produção...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // 1. Fazer Login
    console.log(`Logando com ${USER_EMAIL}...`);
    await page.goto("https://moocafisio.com.br/auth/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASS);
    
    const submitBtn = page.locator('button:has-text("Entrar"), button[type="submit"], .btn-primary').first();
    await submitBtn.click();

    console.log("Aguardando redirecionamento pós-login...");
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
    console.log(`Autenticado com sucesso! URL atual: ${page.url()}`);

    // 2. Ir para a Central de Inteligência na aba Copiloto
    console.log("Navegando para https://moocafisio.com.br/inteligencia?tab=copilot...");
    await page.goto("https://moocafisio.com.br/inteligencia?tab=copilot", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const initialScreenshotPath = path.join(ARTIFACT_DIR, "prod_copilot_loaded.png");
    await page.screenshot({ path: initialScreenshotPath, fullPage: true });
    console.log(`Saved: ${initialScreenshotPath}`);

    // 3. Procurar campo de input do chat e enviar pergunta ortopédica de alto nível
    const chatInput = page.locator('textarea, input[placeholder*="pergunta"], input[placeholder*="Digite"], input[placeholder*="Copiloto"], textarea[placeholder*="pergunta"]').first();
    
    if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Campo de chat encontrado! Digitando pergunta ortopédica...");
      const promptText = "Qual é o protocolo de reabilitação baseado em evidências de alto nível para pós-operatório de reconstrução do LCA (Fase 1: Semanas 1 a 4)? Inclua critérios de progressão de carga e ganho de ADM.";
      await chatInput.fill(promptText);
      await chatInput.press("Enter");

      console.log("Aguardando resposta da IA (Gemini)...");
      await page.waitForTimeout(6000);

      const responseScreenshotPath = path.join(ARTIFACT_DIR, "prod_copilot_chat_response.png");
      await page.screenshot({ path: responseScreenshotPath, fullPage: true });
      console.log(`Saved: ${responseScreenshotPath}`);
    } else {
      console.log("Procurando botões ou abas do chat...");
      const chatAreaScreenshot = path.join(ARTIFACT_DIR, "prod_copilot_chat_area.png");
      await page.screenshot({ path: chatAreaScreenshot, fullPage: true });
      console.log(`Saved: ${chatAreaScreenshot}`);
    }

  } catch (error) {
    console.error("Erro no teste do Copiloto:", error);
    const errScreenshot = path.join(ARTIFACT_DIR, "prod_copilot_error.png");
    await page.screenshot({ path: errScreenshot, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log("Teste de produção finalizado.");
  }
}

main();
