import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb";
const USER_EMAIL = "rafael.minatto@yahoo.com.br";
const USER_PASS = "Yukari30@";

const TABS_TO_TEST = [
  { tab: "overview", name: "Visão Geral" },
  { tab: "analytics", name: "Analytics & Negócio" },
  { tab: "copilot", name: "Copiloto Clínico" },
  { tab: "knowledge", name: "Conhecimento & Pesquisa" },
  { tab: "studio", name: "Studio IA & Fisio Brain" },
];

async function main() {
  console.log("Iniciando teste completo de todas as abas da Central de IA...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // Login
    await page.goto("https://moocafisio.com.br/auth/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASS);
    const submitBtn = page.locator('button:has-text("Entrar"), button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
    console.log("Login OK");

    // Test each tab
    for (const { tab, name } of TABS_TO_TEST) {
      console.log(`\n--- Testando aba: ${name} (tab=${tab}) ---`);
      await page.goto(`https://moocafisio.com.br/inteligencia?tab=${tab}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      
      const screenshotPath = path.join(ARTIFACT_DIR, `prod_tab_${tab}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot: ${screenshotPath}`);
    }

    // Test Copilot chat interaction
    console.log("\n--- Teste interativo: Copiloto Clínico ---");
    await page.goto("https://moocafisio.com.br/inteligencia?tab=copilot", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const chatInput = page.locator('textarea, input[placeholder*="pergunta"], input[placeholder*="copiloto"]').first();
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill("Quais são os critérios de retorno ao esporte após reconstrução do LCA baseado em evidência nível 1?");
      await chatInput.press("Enter");
      console.log("Pergunta enviada ao Copiloto. Aguardando 15s para resposta...");
      await page.waitForTimeout(15000);
      
      const chatScreenshot = path.join(ARTIFACT_DIR, "prod_copilot_ortho_response.png");
      await page.screenshot({ path: chatScreenshot, fullPage: true });
      console.log(`Chat response screenshot: ${chatScreenshot}`);
    }

    // Test Knowledge search
    console.log("\n--- Teste interativo: Conhecimento & Pesquisa ---");
    await page.goto("https://moocafisio.com.br/inteligencia?tab=knowledge", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Try to click PubMed mode if available
    const pubmedBtn = page.locator('button:has-text("PubMed Ouro")').first();
    if (await pubmedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pubmedBtn.click();
      await page.waitForTimeout(500);
      
      const searchInput = page.locator('input[placeholder*="PubMed"], input[placeholder*="literatura"]').first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill("rotator cuff tendinopathy exercise evidence");
        
        const searchBtn = page.locator('button:has-text("Pesquisar")').first();
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          console.log("PubMed search enviado. Aguardando 10s...");
          await page.waitForTimeout(10000);
        }
      }
      
      const knowledgeScreenshot = path.join(ARTIFACT_DIR, "prod_knowledge_pubmed_results.png");
      await page.screenshot({ path: knowledgeScreenshot, fullPage: true });
      console.log(`Knowledge screenshot: ${knowledgeScreenshot}`);
    }

    console.log("\n✅ Teste completo de todas as abas finalizado com sucesso!");

  } catch (error) {
    console.error("Erro:", error);
    const errPath = path.join(ARTIFACT_DIR, "prod_test_error.png");
    await page.screenshot({ path: errPath, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
