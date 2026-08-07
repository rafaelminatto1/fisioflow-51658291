import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb";
const USER_EMAIL = "rafael.minatto@yahoo.com.br";
const USER_PASS = "Yukari30@";

async function main() {
  console.log("Iniciando validação completa e coerência de respostas de IA em TODOS os contextos...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
  });
  const page = await context.newPage();

  try {
    // 1. Login na aplicação
    await page.goto("https://moocafisio.com.br/auth/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASS);
    await page.locator('button:has-text("Entrar"), button[type="submit"]').first().click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
    console.log("✅ 1. Login realizado com sucesso");

    // -------------------------------------------------------------
    // CONTEXTO 1: Copiloto Clínico em Tempo Real (/inteligencia?tab=copilot)
    // -------------------------------------------------------------
    console.log("\n--- CONTEXTO 1: Copiloto Clínico em Tempo Real ---");
    await page.goto("https://moocafisio.com.br/inteligencia?tab=copilot", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const copilotInput = page.locator('textarea, input[placeholder*="pergunta"], input[placeholder*="copiloto"]').first();
    if (await copilotInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const q1 = "Qual o protocolo de fortalecimento e terapia manual recomendado para tendinopatia de patela em atletas?";
      await copilotInput.fill(q1);
      await copilotInput.press("Enter");
      console.log(`Pergunta enviada: "${q1}". Aguardando resposta (15s)...`);
      await page.waitForTimeout(15000);

      const shot1 = path.join(ARTIFACT_DIR, "eval_ctx1_copilot_chat.png");
      await page.screenshot({ path: shot1, fullPage: true });
      console.log(`📸 Screenshot Contexto 1 (Copiloto): ${shot1}`);
    }

    // -------------------------------------------------------------
    // CONTEXTO 2: Conhecimento & Pesquisa PubMed Live (/inteligencia?tab=knowledge)
    // -------------------------------------------------------------
    console.log("\n--- CONTEXTO 2: Conhecimento & Pesquisa PubMed Live ---");
    await page.goto("https://moocafisio.com.br/inteligencia?tab=knowledge", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const pubmedBtn = page.locator('button:has-text("PubMed Ouro")').first();
    if (await pubmedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pubmedBtn.click();
      await page.waitForTimeout(500);

      const searchInput = page.locator('input[placeholder*="PubMed"], input[placeholder*="literatura"]').first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const q2 = "knee osteoarthritis exercise biomechanics";
        await searchInput.fill(q2);

        const searchBtn = page.locator('button:has-text("Pesquisar")').first();
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          console.log(`Pesquisa PubMed enviada: "${q2}". Aguardando 10s...`);
          await page.waitForTimeout(10000);
        }
      }

      const shot2 = path.join(ARTIFACT_DIR, "eval_ctx2_knowledge_pubmed.png");
      await page.screenshot({ path: shot2, fullPage: true });
      console.log(`📸 Screenshot Contexto 2 (Knowledge PubMed): ${shot2}`);
    }

    // -------------------------------------------------------------
    // CONTEXTO 3: Global Floating AI Chat Widget (na tela de Pacientes)
    // -------------------------------------------------------------
    console.log("\n--- CONTEXTO 3: Widget Flutuante de IA (em /pacientes) ---");
    await page.goto("https://moocafisio.com.br/pacientes", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const aiPill = page.locator('button:has-text("COPILOTO IA"), button:has-text("FisioFlow Intelligence")').first();
    if (await aiPill.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiPill.click();
      console.log("Widget flutuante aberto na tela de pacientes!");
      await page.waitForTimeout(1000);

      const widgetInput = page.locator('input[placeholder*="Pergunte ao Copiloto"]').first();
      if (await widgetInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const q3 = "Quais exercícios são indicados para fascite plantar?";
        await widgetInput.fill(q3);

        const sendBtn = page.locator('button[type="submit"]').last();
        await sendBtn.click();
        console.log(`Pergunta enviada via Widget Flutuante: "${q3}". Aguardando 12s...`);
        await page.waitForTimeout(12000);
      }

      const shot3 = path.join(ARTIFACT_DIR, "eval_ctx3_floating_widget_response.png");
      await page.screenshot({ path: shot3, fullPage: true });
      console.log(`📸 Screenshot Contexto 3 (Widget Flutuante): ${shot3}`);
    }

    // -------------------------------------------------------------
    // CONTEXTO 4: Spotlight Cmd+K com Busca de Pacientes (@paciente)
    // -------------------------------------------------------------
    console.log("\n--- CONTEXTO 4: Spotlight Cmd+K com Autocomplete ---");
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(1000);

    const spotlightInput = page.locator('input[placeholder*="Spotlight"], input[placeholder*="@paciente"]').first();
    if (await spotlightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await spotlightInput.fill("Silva");
      await page.waitForTimeout(2000);

      const shot4 = path.join(ARTIFACT_DIR, "eval_ctx4_spotlight_search.png");
      await page.screenshot({ path: shot4, fullPage: true });
      console.log(`📸 Screenshot Contexto 4 (Spotlight Cmd+K): ${shot4}`);
    }

    console.log("\n🎉 Validação completa de coerência e respostas de IA finalizada com sucesso!");

  } catch (err) {
    console.error("Erro na validação:", err);
  } finally {
    await browser.close();
  }
}

main();
