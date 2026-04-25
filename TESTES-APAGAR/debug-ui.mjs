import { chromium } from "playwright";
import path from "path";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("https://www.moocafisio.com.br/login");
  await page.fill('input[type="email"]', "REDACTED_EMAIL");
  await page.fill('input[type="password"]', "REDACTED");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/agenda");

  await page.goto("https://www.moocafisio.com.br/patients");
  await page.waitForLoadState("networkidle");
  await page.click("text=Dr. Robot - Paciente Alpha");
  await page.waitForTimeout(3000);

  // Ver se tem evolução
  await page.goto(page.url() + "/evolution");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(5000);

  await page.screenshot({ path: "TESTES-APAGAR/debug_evolution_page.png", fullPage: true });
  console.log("Screenshot de debug salvo em TESTES-APAGAR/debug_evolution_page.png");

  const content = await page.evaluate(() => document.body.innerText);
  console.log(
    "Botões encontrados:",
    await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map((b) => b.innerText),
    ),
  );

  await browser.close();
})();
