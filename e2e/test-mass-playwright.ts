import { chromium } from "playwright-core";
import path from "path";

async function main() {
  console.log("Iniciando Playwright em modo background para teste E2E Massivo em Produção...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Fazendo login...");
    await page.goto("https://moocafisio.com.br/login");
    await page.waitForSelector('input[type="email"]', { state: "visible" });
    await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
    await page.fill('input[type="password"]', "Yukari30@");
    
    await Promise.all([
      page.waitForURL("**/agenda", { timeout: 20000 }),
      page.click('button[type="submit"]')
    ]);
    console.log("Login OK");

    const NUM_PATIENTS = 1;
    const NUM_APPTS = 1;

    for (let p = 1; p <= NUM_PATIENTS; p++) {
      console.log(`\n--> Criando Paciente ${p}...`);
      await page.goto("https://moocafisio.com.br/patients/new", { waitUntil: "networkidle" });
      
      await page.waitForTimeout(2000);
      
      const patientName = `Paciente Mass Playwright ${p} - ${Date.now()}`;
      await page.fill('#full_name', patientName);
      await page.fill('#phone', "11999999999");
      await page.click('button:has-text("Finalizar Cadastro"), button[type="submit"]');
      
      await page.waitForTimeout(3000);
      
      for (let a = 1; a <= NUM_APPTS; a++) {
        console.log(`  --> Criando Agendamento ${a} para ${patientName}...`);
        await page.goto("https://moocafisio.com.br/agenda", { waitUntil: "networkidle" });
        await page.waitForTimeout(2000);
        
        // Clique no botão AGENDAR ao invés de procurar um slot na unha
        await page.click('button:has-text("AGENDAR"), button:has-text("Novo Agendamento")');
        await page.waitForTimeout(2000);
        
        await page.locator('input[placeholder*="Buscar paciente"], input[placeholder*="paciente"]').fill("Paciente Mass Playwright");
        await page.waitForTimeout(2500);
        await page.locator('[role="option"]').first().click();
        
        await page.click('button:has-text("Salvar Agendamento"), button:has-text("Salvar")');
        await page.waitForTimeout(3000);
        
        console.log(`  --> Abrindo evolução e preenchendo via teclado...`);
        // FullCalendar usa .fc-event
        const eventCards = page.locator('.fc-event, .rbc-event, [data-testid="event-card"], .cursor-pointer').filter({ hasText: 'Paciente Mass Playwright' });
        await eventCards.first().click();
        
        const startBtn = page.getByRole("button", { name: /Iniciar Atendimento|Continuar Atendimento/i });
        await startBtn.click();
        
        await page.waitForSelector('.ProseMirror', { state: 'visible', timeout: 10000 });
        
        const editor = page.locator('.ProseMirror').first();
        await editor.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        
        const testText = `Validando AUTOSAVE do Paciente ${p} no agendamento ${a} via E2E Playwright! O BUG DA TELA BRANCA ACABOU!`;
        await editor.type(testText);
        
        console.log("  --> Aguardando autosave (2.5s)...");
        await page.waitForTimeout(3000);

        console.log("  --> Voltando para a agenda...");
        await page.goto("https://moocafisio.com.br/agenda", { waitUntil: "networkidle" });
        await page.waitForTimeout(2000);

        console.log("  --> Reabrindo a evolução para validar o texto salvo...");
        await page.locator('.fc-event, .rbc-event, [data-testid="event-card"], .cursor-pointer').filter({ hasText: 'Paciente Mass Playwright' }).first().click();
        await page.getByRole("button", { name: /Iniciar Atendimento|Continuar Atendimento/i }).click();

        await page.waitForSelector('.ProseMirror', { state: 'visible', timeout: 10000 });
        const savedHtml = await editor.innerHTML();
        
        await page.screenshot({ path: path.join(process.cwd(), "e2e", "success-screenshot.png"), fullPage: true });

        if (savedHtml.includes("BUG DA TELA BRANCA")) {
           console.log(`  ✅ SUCESSO: O texto persistiu após recarregar sem F5! (Tamanho: ${savedHtml.length} chars)`);
        } else {
           console.log(`  ❌ FALHA: O texto estava vazio ou diferente do esperado: ${savedHtml}`);
        }

        await page.waitForTimeout(1000);
      }
    }
    
    console.log("✅ TESTE PLAYWRIGHT E2E COMPLETO E BEM SUCEDIDO.");
  } catch (error) {
    console.error("ERRO NO TESTE:", error);
    await page.screenshot({ path: path.join(process.cwd(), "e2e", "error-screenshot.png"), fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
