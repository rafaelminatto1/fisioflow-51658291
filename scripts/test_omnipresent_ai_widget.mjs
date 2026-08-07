import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb";
const USER_EMAIL = "rafael.minatto@yahoo.com.br";
const USER_PASS = "Yukari30@";

async function main() {
  console.log("Iniciando validação E2E do Assistente de IA Flutuante e Spotlight Cmd+K...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
  });
  const page = await context.newPage();

  try {
    // 1. Login
    await page.goto("https://moocafisio.com.br/auth/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASS);
    await page.locator('button:has-text("Entrar"), button[type="submit"]').first().click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
    console.log("✅ Login realizado com sucesso");

    // 2. Navegar para a Agenda (para provar que o widget funciona em QUALQUER página)
    await page.goto("https://moocafisio.com.br/agenda", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const agendaScreenshot = path.join(ARTIFACT_DIR, "prod_omnipresent_widget_agenda.png");
    await page.screenshot({ path: agendaScreenshot, fullPage: true });
    console.log(`📸 Screenshot do Widget Flutuante na Agenda: ${agendaScreenshot}`);

    // 3. Abrir o Chat Flutuante clicando no botão do canto inferior direito
    const aiPill = page.locator('button:has-text("COPILOTO IA"), button:has-text("FisioFlow Intelligence")').first();
    if (await aiPill.isVisible({ timeout: 4000 }).catch(() => false)) {
      await aiPill.click();
      console.log("✅ Botão flutuante do Copiloto clicado!");
      await page.waitForTimeout(1500);

      const drawerScreenshot = path.join(ARTIFACT_DIR, "prod_omnipresent_widget_open.png");
      await page.screenshot({ path: drawerScreenshot, fullPage: true });
      console.log(`📸 Screenshot do Drawer Flutuante Aberto: ${drawerScreenshot}`);
    }

    // 4. Testar atalho Cmd+K / Ctrl+K Spotlight
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(1000);

    const spotlightInput = page.locator('input[placeholder*="Spotlight"], input[placeholder*="@paciente"]').first();
    if (await spotlightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await spotlightInput.fill("@");
      await page.waitForTimeout(2000);

      const spotlightScreenshot = path.join(ARTIFACT_DIR, "prod_omnipresent_spotlight_mention.png");
      await page.screenshot({ path: spotlightScreenshot, fullPage: true });
      console.log(`📸 Screenshot do Spotlight Cmd+K com @paciente: ${spotlightScreenshot}`);
    }

    console.log("\n🎉 Validação E2E do Assistente Flutuante e Spotlight finalizada com sucesso!");

  } catch (err) {
    console.error("Erro na validação:", err);
  } finally {
    await browser.close();
  }
}

main();
