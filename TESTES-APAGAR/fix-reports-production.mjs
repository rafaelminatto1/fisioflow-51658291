import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join(process.cwd(), "TESTES-APAGAR");

(async () => {
  console.log("🚀 Iniciando DOWNLOAD OFICIAL de PDFs Premium de PRODUÇÃO...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  console.log("🔐 Login em moocafisio.com.br...");
  await page.goto("https://www.moocafisio.com.br/login");
  await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
  await page.fill('input[type="password"]', "Yukari30@");
  await page.click('button[type="submit"], [data-testid="auth-submit-button"]');
  await page.waitForURL("**/agenda");

  console.log("🔍 Localizando pacientes Dr. Robot...");
  await page.goto("https://www.moocafisio.com.br/patients");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Pegar os IDs reais dos pacientes criados
  const patients = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-patient-id], button, a"))
      .filter((el) => el.innerText.includes("Dr. Robot"))
      .map((el) => {
        const id =
          el.getAttribute("data-patient-id") ||
          el.getAttribute("data-id") ||
          (el.href ? el.href.split("/").pop() : null);
        return { id, name: el.innerText.split("\n")[0].trim() };
      })
      .filter((p) => p.id && p.id.length > 20);
  });

  // Remover duplicados
  const uniquePatients = Array.from(new Map(patients.map((p) => [p.id, p])).values()).slice(0, 10);
  console.log(`Encontrados ${uniquePatients.length} pacientes únicos.`);

  for (const p of uniquePatients) {
    console.log(`📄 Gerando Relatório Premium Real para: ${p.name}`);
    // Navegar para a página de evolução onde o novo botão está
    await page.goto(`https://www.moocafisio.com.br/patients/${p.id}/evolution`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000); // Aguardar o Hub de IA carregar os dados

    try {
      // O botão azul "Relatório Premium (IA)" que implementamos
      const btn = page.locator('button:has-text("Relatório Premium")');
      await btn.waitFor({ state: "visible", timeout: 15000 });

      const [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);

      const downloadPath = path.join(
        TEST_DIR,
        `RELATORIO_PREMIUM_OFICIAL_${p.name.replace(/ /g, "_")}.pdf`,
      );
      await download.saveAs(downloadPath);
      console.log(`✅ SUCESSO: ${downloadPath}`);
    } catch (e) {
      console.log(`❌ Erro ao baixar para ${p.name}: O botão não apareceu ou falhou.`);
    }
  }

  await browser.close();
  console.log("\n✨ Todos os relatórios corrigidos foram salvos na pasta /TESTES-APAGAR.");
})();
