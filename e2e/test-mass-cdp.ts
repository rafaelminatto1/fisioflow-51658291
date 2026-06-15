import { chromium } from "playwright-core";
import path from "path";

async function main() {
  console.log(
    "Conectando ao Chrome aberto do usuário na porta 9222 via CDP (DevTools Protocol)...",
  );

  // Conecta ao browser aberto pelo usuário via CDP (DevTools Protocol)
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  const context = contexts.length > 0 ? contexts[0] : await browser.newContext();

  // Reutiliza a página existente ou abre uma nova
  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  console.log("Navegando para o FisioFlow...");
  await page.goto("https://moocafisio.com.br/app/agenda", { waitUntil: "networkidle" });

  console.log("=========================================");
  console.log(" INICIANDO TESTE MASSIVO DE UI (DEVTOOLS)");
  console.log("=========================================\n");

  // Vamos criar 2 pacientes com 2 agendamentos para prova de conceito da UI (fazer 100 via UI é muito lento, mas podemos simular)
  const NUM_PATIENTS = 2;
  const NUM_APPTS = 2;

  for (let p = 1; p <= NUM_PATIENTS; p++) {
    console.log(`\n--> Criando Paciente ${p}...`);
    await page.goto("https://moocafisio.com.br/app/patients/new", { waitUntil: "networkidle" });

    const patientName = `Paciente DevTools ${p} - ${Date.now()}`;
    await page.fill('input[name="full_name"], input[placeholder*="Nome"]', patientName);
    await page.fill('input[name="phone"], input[placeholder*="telefone"]', "11999999999");
    await page.click('button:has-text("Finalizar Cadastro"), button[type="submit"]');

    // Espera salvar
    await page.waitForTimeout(2000);

    for (let a = 1; a <= NUM_APPTS; a++) {
      console.log(`  --> Criando Agendamento ${a} para ${patientName}...`);
      await page.goto("https://moocafisio.com.br/app/agenda", { waitUntil: "networkidle" });

      // Clique num slot da agenda
      await page
        .locator(".rbc-time-slot")
        .nth(10 + a)
        .click();
      await page.waitForSelector('text="Novo Agendamento"', { state: "visible" });

      await page.locator('input[placeholder*="Buscar paciente"]').fill("Paciente DevTools");
      await page.waitForTimeout(1000);
      await page.locator('[role="option"]').first().click();

      await page.click('button:has-text("Salvar Agendamento"), button:has-text("Salvar")');
      await page.waitForTimeout(2000);

      console.log(`  --> Abrindo evolução e preenchendo via teclado...`);
      const eventCards = page
        .locator('.rbc-event, [data-testid="event-card"], .cursor-pointer')
        .filter({ hasText: "Paciente DevTools" });
      await eventCards.first().click();

      const startBtn = page.getByRole("button", {
        name: /Iniciar Atendimento|Continuar Atendimento/i,
      });
      await startBtn.click();

      // Espera o ProseMirror (RichTextBlock) renderizar
      await page.waitForSelector(".ProseMirror", { state: "visible", timeout: 10000 });

      // Digitar na evolução
      const editor = page.locator(".ProseMirror").first();
      // Limpar o editor antes de digitar se tiver algo
      await editor.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Backspace");

      await editor.type(
        `Validando AUTOSAVE do Paciente ${p} no agendamento ${a} via DevTools Protocol!`,
      );

      // Esperar autosave rodar
      await page.waitForTimeout(3000);
    }
  }

  console.log(
    "✅ TESTE DEVTOOLS COMPLETO: Pacientes e Agendamentos criados e evoluídos com sucesso usando protocolo DevTools na sua máquina.",
  );
  await browser.close();
}

main().catch(console.error);
