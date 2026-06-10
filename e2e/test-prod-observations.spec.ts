import { test, expect } from "@playwright/test";
import path from "path";

test("Validate Clinical Observations field in Production end-to-end", async ({ page }) => {
  test.setTimeout(120000);

  console.log("Fazendo login...");
  await page.goto("https://moocafisio.com.br/login");
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
  await page.fill('input[type="password"]', "Yukari30@");
  
  await Promise.all([
    page.waitForURL("**/agenda", { timeout: 15000 }),
    page.click('button[type="submit"]')
  ]);
  console.log("Login OK");

  // Criar um novo paciente
  console.log("Navegando para patients/new...");
  await page.goto("https://moocafisio.com.br/app/patients/new", { waitUntil: "networkidle" });
  
  await page.fill('input[name="full_name"], input[placeholder*="Nome"]', "Autosave Paciente " + Date.now());
  await page.fill('input[name="phone"], input[placeholder*="telefone"]', "11999999999");
  
  await page.click('button:has-text("Finalizar Cadastro"), button[type="submit"]');
  console.log("Paciente criado.");
  await page.waitForTimeout(3000); // Aguarda salvar

  // Ir para agenda
  await page.goto("https://moocafisio.com.br/app/agenda", { waitUntil: "networkidle" });
  console.log("Na agenda. Vamos criar um agendamento.");

  // Clica num espaço vazio na agenda para abrir o modal de novo agendamento
  // Como estamos no react-big-calendar, podemos clicar numa rbc-time-slot.
  await page.locator('.rbc-time-slot').nth(20).click();
  console.log("Clicou no horário.");

  // Esperar o modal de novo agendamento
  await page.waitForSelector('text="Novo Agendamento"', { state: "visible" });
  
  // Selecionar o paciente recém criado
  // Nota: o combobox pode ser complexo. 
  await page.locator('input[placeholder*="Buscar paciente"]').fill("Autosave Paciente");
  await page.waitForTimeout(2000);
  await page.locator('[role="option"]').first().click();

  await page.click('button:has-text("Salvar Agendamento"), button:has-text("Salvar")');
  console.log("Agendamento criado.");
  await page.waitForTimeout(3000);

  // Agora procura o evento na agenda
  const eventCard = page.locator('.rbc-event, [data-testid="event-card"], .cursor-pointer').filter({ hasText: 'Autosave Paciente' }).first();
  await eventCard.click();
  console.log("Clicou no agendamento na agenda.");

  const startButton = page.getByRole("button", { name: /Iniciar Atendimento|Continuar Atendimento/i });
  await startButton.click();
  console.log("Clicou 'Iniciar Atendimento'.");
  
  // Esperar carregar o painel da Evolução
  await page.waitForSelector('textarea[placeholder*="Orientações gerais"], textarea[placeholder*="Descreva o que o paciente"]', { state: 'visible', timeout: 15000 });
  console.log("Textarea de evolução carregado.");

  // Escrever texto
  const obsTextarea = page.locator('textarea[placeholder*="Orientações gerais"], textarea[placeholder*="Descreva o que o paciente"]').first();
  await obsTextarea.fill("Validando observação clínica em produção com MAGIC TEXTAREA - " + new Date().toISOString());
  console.log("Preencheu o texto.");

  // Forçar autosave aguardando 2.5 segundos
  await page.waitForTimeout(2500);

  // Voltar para a Agenda
  await page.goto("https://moocafisio.com.br/app/agenda", { waitUntil: "networkidle" });
  console.log("Voltou para agenda.");
  await page.waitForTimeout(2000);

  // Clicar novamente no atendimento
  await page.locator('.rbc-event, [data-testid="event-card"], .cursor-pointer').filter({ hasText: 'Autosave Paciente' }).first().click();
  const continueButton = page.getByRole("button", { name: /Iniciar Atendimento|Continuar Atendimento/i });
  await continueButton.click();
  console.log("Reabriu a evolução.");

  // Verificar o texto
  await page.waitForSelector('textarea[placeholder*="Orientações gerais"], textarea[placeholder*="Descreva o que o paciente"]', { state: 'visible', timeout: 15000 });
  const valueAfterReload = await obsTextarea.inputValue();
  console.log(`Valor recarregado: "${valueAfterReload}"`);

  if (valueAfterReload.includes("MAGIC TEXTAREA")) {
    console.log("SUCCESS: As observações persistiram sem F5! A refatoração do MagicTextarea funcionou!");
  } else {
    console.log("FAILURE: O texto não foi carregado.");
  }

  await page.screenshot({ path: path.join(process.cwd(), "e2e", "prod-observations-result2.png"), fullPage: true });
});
