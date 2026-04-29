import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join(process.cwd(), "TESTES-APAGAR");

(async () => {
  console.log("🚀 Iniciando DOWNLOAD de PDFs Premium de PRODUÇÃO...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  console.log("🔐 Login...");
  await page.goto("https://www.moocafisio.com.br/login");
  await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
  await page.fill('input[type="password"]', "Yukari30@");
  await page.click('button[type="submit"], [data-testid="auth-submit-button"]');
  await page.waitForURL("**/agenda");

  console.log("🔍 Buscando pacientes Dr. Robot...");
  await page.goto("https://www.moocafisio.com.br/patients");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Pegar todos os links de pacientes que contém "Dr. Robot"
  const patientLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a, button"))
      .filter((el) => el.innerText.includes("Dr. Robot"))
      .map((el) => {
        // Se for um card, tentar achar o ID no atributo data ou similar
        const id = el.getAttribute("data-patient-id") || el.getAttribute("data-id");
        return { id, name: el.innerText.trim() };
      })
      .filter((p) => p.id);
  });

  console.log(`Encontrados ${patientLinks.length} pacientes para download.`);

  for (const p of patientLinks) {
    console.log(`📄 Baixando Premium para: ${p.name}`);
    await page.goto(`https://www.moocafisio.com.br/patients/${p.id}/evolution`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4000); // Dar tempo para renderizar o Hub de Inteligência

    try {
      // Esperar o botão aparecer
      const btn = page.locator('button:has-text("Relatório Premium")');
      await btn.waitFor({ state: "visible", timeout: 10000 });

      const [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);

      const downloadPath = path.join(TEST_DIR, `Premium_Real_${p.name.replace(/ /g, "_")}.pdf`);
      await download.saveAs(downloadPath);
      console.log(`✅ Salvo: ${downloadPath}`);
    } catch (e) {
      console.log(`❌ Falha ao baixar PDF para ${p.name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log("✨ Download concluído.");
})();
