import { test, expect } from "@playwright/test";

test.describe("Validação de Autosave - Todos os Campos", () => {
  test.setTimeout(180000);

  test("Deve manter todos os campos ao voltar da agenda", async ({ page }) => {
    console.log("Fazendo login...");
    await page.goto("https://www.moocafisio.com.br/auth");
    await page.fill('input[type="email"]', process.env.E2E_EMAIL || "");
    await page.fill('input[type="password"]', process.env.E2E_PASSWORD || "");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/agenda", { timeout: 15000 });
    console.log("Login OK");

    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Seleciona um agendamento na agenda
    const patientItem = page.locator(".fc-event").first();
    await patientItem.waitFor({ state: "attached", timeout: 10000 });
    await patientItem.click({ force: true });

    console.log("Clicando Iniciar Atendimento...");
    const btnIniciar = page.locator("button:has-text('Iniciar Atendimento')").first();
    await btnIniciar.waitFor({ state: "visible", timeout: 10000 });
    await btnIniciar.click();

    console.log("Aguardando carregamento da evolução...");
    await page.waitForSelector(".tiptap", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(2000); // Aguarda Yjs
    
    console.log("Preenchendo campos...");
    const randomSuffix = Date.now().toString().slice(-4);
    const textObs = `Obs clinica ${randomSuffix}`;
    const textProc = `Procedimento executado ${randomSuffix}`;
    const textSubj = `Queixa do paciente ${randomSuffix}`;

    // 1. Preencher Observações (RichTextEditor)
    const editorObs = page.locator(".tiptap").first();
    await editorObs.press("Control+a");
    await editorObs.press("Backspace");
    await editorObs.type(textObs);

    // 2. Preencher Queixa Principal
    const inputQueixa = page.locator("textarea[placeholder*='Queixa principal']").first();
    if (await inputQueixa.isVisible()) {
      await inputQueixa.fill(textSubj);
    }

    // 3. Modificar Dor (Slider ou Input) - O slider pode ser tricky, vamos ver se tem input numérico
    // Assumimos que o texto será validado depois. Vamos focar nos editores principais primeiro.
    
    // O 2º RichTextEditor geralmente é o Procedimento/Objetivo
    const editors = page.locator(".tiptap");
    if (await editors.count() > 1) {
      const editorProc = editors.nth(1);
      await editorProc.press("Control+a");
      await editorProc.press("Backspace");
      await editorProc.type(textProc);
    }

    console.log("Aguardando autosave debounced...");
    await page.waitForTimeout(4000); // 4 segundos debounced

    console.log("Voltando para a agenda...");
    await page.goto("https://www.moocafisio.com.br/agenda");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    console.log("Abrindo paciente novamente...");
    const patientItem2 = page.locator(".fc-event").first();
    await patientItem2.waitFor({ state: "attached", timeout: 10000 });
    await patientItem2.click({ force: true });

    console.log("Clicando Iniciar Atendimento novamente...");
    const btnIniciar2 = page.locator("button:has-text('Iniciar Atendimento')").first();
    await btnIniciar2.waitFor({ state: "visible", timeout: 10000 });
    await btnIniciar2.click();

    console.log("Aguardando recarregamento...");
    await page.waitForSelector(".tiptap", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(2000); // Aguarda Yjs puxar os dados de volta

    console.log("Validando campos salvos...");
    
    // Checa o primeiro editor
    const contentObs = await editors.first().innerText();
    expect(contentObs).toContain(textObs);
    console.log(`✅ Observações validadas: ${contentObs}`);

    // Checa a queixa
    if (await inputQueixa.isVisible()) {
      const contentSubj = await inputQueixa.inputValue();
      expect(contentSubj).toContain(textSubj);
      console.log(`✅ Queixa validada: ${contentSubj}`);
    }

    // Checa o segundo editor
    if (await editors.count() > 1) {
      const contentProc = await editors.nth(1).innerText();
      expect(contentProc).toContain(textProc);
      console.log(`✅ Procedimentos validados: ${contentProc}`);
    }

    console.log("Teste de autosave em múltiplos campos finalizado com SUCESSO!");
  });
});
