import { chromium } from "playwright";
import path from "path";

async function main() {
  console.log("Launching browser with persistent context for manual login...");
  const userDataDir = path.join(process.cwd(), "playwright-profile");

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    permissions: ["clipboard-read"],
  });

  const page = await context.newPage();

  console.log("Navigating to ScienceDirect via CAPES/CAFe (USP)...");
  await page.goto("https://www.sciencedirect.com/science/activate/login");

  console.log("\n*** MENSAGEM PARA O USUÁRIO ***");
  console.log(
    "A janela está aberta no VNC. Por favor, faça o login normalmente com seu email e senha.",
  );
  console.log(
    "Se pedir CAPTCHA, resolva. Quando estiver logado com sucesso (você verá seu nome ou USP no site da ScienceDirect), pule de volta no chat e me avise escrevendo 'pronto'!",
  );
  console.log("Vou manter essa janela aberta por 15 minutos...");

  // Wait a long time so the user can login at their pace without it jumping to DOIs.
  await page.waitForTimeout(15 * 60 * 1000);

  console.log("Browser closing automatically after 15 minutes.");
  await context.close();
}

main().catch(console.error);
