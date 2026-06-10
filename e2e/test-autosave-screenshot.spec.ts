import { test, expect } from "@playwright/test";

test("Take screenshot of New Patient Page", async ({ page }) => {
  test.setTimeout(120000); // 2 minutos máximo

  // 1. Fazer Login
  console.log("Fazendo login...");
  await page.goto("https://moocafisio.com.br/login");
  await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
  await page.fill('input[type="password"]', "Yukari30@");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/agenda", { timeout: 15000 });
  console.log("Login OK");

  // 2. Ir para criação de paciente
  console.log("Navegando para patients/new...");
  await page.goto("https://moocafisio.com.br/patients/new");
  await page.waitForLoadState("networkidle");
  
  await page.fill('input[name="full_name"], input[placeholder*="Nome"]', "Paciente Autosave Teste Screenshot");
  await page.fill('input[name="phone"], input[placeholder*="telefone"]', "11999999999");
  
  const saveBtn = page.locator('button:has-text("Finalizar Cadastro"), button[type="submit"]').first();
  await saveBtn.click();
  
  // Wait a bit to see the result
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: 'new-patient-error.png', fullPage: true });
  console.log("Screenshot salvo como new-patient-error.png");
});
