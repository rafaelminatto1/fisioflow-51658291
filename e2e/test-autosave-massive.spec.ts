import { test, expect } from "@playwright/test";

test.describe("Validação de Autosave via Agenda (SQL Data)", () => {
  test.setTimeout(180000); // 3 minutos

  test("Deve manter o texto ao voltar da agenda para evolução", async ({ page }) => {
    console.log("Fazendo login...");
    await page.goto("https://www.moocafisio.com.br/auth");
    await page.fill('input[type="email"]', "rafael.minatto@yahoo.com.br");
    await page.fill('input[type="password"]', process.env.E2E_PASSWORD || "");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/agenda", { timeout: 15000 });
    console.log("Login OK");

    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000); // Aguarda eventos da agenda carregarem

    // Pega o primeiro agendamento Drizzle
    const patientItem = page.locator(".fc-event").first();
    await patientItem.waitFor({ state: "attached", timeout: 10000 });
    await patientItem.click({ force: true });

    console.log("Clicando Iniciar Atendimento...");
    const btnIniciar = page.locator("button:has-text('Iniciar Atendimento')").first();
    await btnIniciar.waitFor({ state: "visible", timeout: 10000 });
    await btnIniciar.click();

    console.log("Aguardando carregamento da evolução...");
    await page.waitForSelector(".tiptap", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for Yjs/collaboration initialization
    
    console.log("Digitando texto de teste...");
    const randomText = `Texto de Teste Autosave - ${Date.now()}`;
    const editorBox = page.locator(".tiptap").first();
    await editorBox.fill(""); // Clear first
    await editorBox.type(randomText);

    console.log("Aguardando 4 segundos para o autosave debounced...");
    await page.waitForTimeout(4000);

    console.log("Voltando para a agenda...");
    await page.goto("https://www.moocafisio.com.br/agenda");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    console.log("Abrindo novamente o paciente...");
    const patientItem2 = page.locator(".fc-event").first();
    await patientItem2.waitFor({ state: "attached", timeout: 10000 });
    await patientItem2.click({ force: true });

    console.log("Clicando Iniciar Atendimento (2ª vez)...");
    const btnIniciar2 = page.locator("button:has-text('Iniciar Atendimento')").first();
    await btnIniciar2.waitFor({ state: "visible", timeout: 10000 });
    await btnIniciar2.click();

    console.log("Aguardando evolução carregar para verificação...");
    await page.waitForSelector(".tiptap", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for Yjs

    const editorContent = await page.locator(".tiptap").first().innerText();
    console.log("Conteúdo encontrado:", editorContent);

    expect(editorContent).toContain(randomText);
    console.log("Autosave VALIDADO com SUCESSO!");
  });
});
