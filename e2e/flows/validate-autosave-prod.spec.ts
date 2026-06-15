import { test, expect } from "@playwright/test";

const loginEmail = process.env.E2E_EMAIL || "";
const loginPassword = process.env.E2E_PASSWORD || "";
const baseURL = "https://www.moocafisio.com.br";

test.describe("Validação E2E em Produção - Autosave e Nível de Dor (EVA)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Deve criar um agendamento temporário, testar a persistência do autosave + EVA e depois limpar", async ({
    page,
  }) => {
    test.setTimeout(120000); // Aumentar o timeout geral para 120 segundos devido à navegação múltipla em produção
    console.log("[Test] Iniciando fluxo completo de validação do autosave em produção...");

    // Registrar ouvintes de console e erro do navegador para diagnosticar problemas em produção
    page.on("console", (msg) => {
      const type = msg.type();
      const txt = msg.text();
      if (txt.includes("Download the React DevTools")) return;

      // Capturar argumentos serializados de forma legivel
      Promise.all(
        msg.args().map(async (arg) => {
          try {
            const val = await arg.jsonValue();
            return typeof val === "object" && val !== null ? JSON.stringify(val) : String(val);
          } catch {
            return arg.toString();
          }
        }),
      ).then((args) => {
        console.log(`[Browser Console ${type}]`, ...args);
      });
    });
    page.on("pageerror", (err) => {
      console.error(`[Browser PageError]`, err.message);
    });
    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("/api/") ||
        url.includes("/auth/") ||
        url.includes("supabase") ||
        url.includes("neon")
      ) {
        console.log(`[Browser Request] ${req.method()} -> ${url}`);
      }
    });
    page.on("response", (res) => {
      const url = res.url();
      if (
        url.includes("/api/") ||
        url.includes("/auth/") ||
        url.includes("supabase") ||
        url.includes("neon")
      ) {
        console.log(`[Browser Response] ${res.status()} <- ${url}`);
      }
    });

    // 1. Acessar a página de login
    console.log("[Test] Acessando tela de login...");
    await page.goto(`${baseURL}/auth/login`);
    await page.waitForSelector('input[type="email"]');

    // 2. Preencher credenciais e logar
    console.log("[Test] Efetuando login...");
    await page.fill('input[type="email"]', loginEmail);
    await page.fill('input[type="password"]', loginPassword);
    await page.click('button:has-text("Acessar Minha Conta"), button[type="submit"]');

    // 3. Aguardar redirecionamento para a Agenda
    console.log("[Test] Aguardando redirecionamento para a Agenda...");
    await page.waitForURL("**/agenda", { timeout: 30000 });
    console.log("[Test] Login bem-sucedido! Página atual:", page.url());

    // Aguardar o carregamento de rede e elementos estáticos da página
    console.log("[Test] Aguardando hidratação e estabilização de rede da página...");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Fechar modais de boas-vindas / onboarding e backdrops
    console.log("[Test] Limpando eventuais modais de tour/boas-vindas...");
    await page.evaluate(() => {
      const overlays = document.querySelectorAll('.fixed.inset-0, [role="dialog"], .radix-overlay');
      overlays.forEach((el) => {
        if (el.textContent?.includes("Bem-vindo") || el.classList.contains("bg-black/80")) {
          el.remove();
        }
      });
      document.body.style.pointerEvents = "auto";
      document.body.style.overflow = "auto";
    });
    await page.waitForTimeout(1000);

    // 3.5. Cadastrar o Paciente de Teste Temporário em Produção para garantir que ele exista
    const testPatientName = "Rafael Teste Autosave";
    console.log(
      "[Test] Acessando tela de pacientes para garantir existência do paciente de teste...",
    );
    await page.goto(`${baseURL}/patients`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Buscar se o paciente de teste já existe para evitar duplicações
    console.log(`[Test] Buscando paciente '${testPatientName}'...`);
    const searchPatientInput = page
      .locator('input[placeholder*="Buscar"], input[placeholder*="Pesquisar"]')
      .first();
    if (await searchPatientInput.isVisible().catch(() => false)) {
      await searchPatientInput.fill(testPatientName);
      await page.waitForTimeout(1500);
    }

    const patientExists = await page
      .locator(`text=${testPatientName}`)
      .first()
      .isVisible()
      .catch(() => false);
    if (!patientExists) {
      console.log(`[Test] Paciente '${testPatientName}' não encontrado. Cadastrando novo...`);
      const newPatientBtn = page
        .locator(
          'button:has-text("Novo"), button:has-text("Adicionar"), button:has-text("Cadastrar")',
        )
        .first();
      await newPatientBtn.waitFor({ state: "visible", timeout: 10000 });
      await newPatientBtn.click();

      console.log("[Test] Aguardando modal de cadastro de paciente abrir...");
      const nameInput = page
        .locator('input[name="full_name"], input[id="name"], input[placeholder*="Nome"]')
        .first();
      await nameInput.waitFor({ state: "visible", timeout: 10000 });
      await nameInput.fill(testPatientName);

      const emailInput = page
        .locator('input[name="email"], input[id="email"], input[placeholder*="E-mail"]')
        .first();
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill("rafael.teste@autosave.com");
      }

      console.log("[Test] Clicando em Cadastrar Paciente...");
      const savePatientBtn = page
        .locator(
          'button:has-text("Cadastrar Paciente"), button:has-text("Cadastrar"), button:has-text("Salvar")',
        )
        .first();
      await savePatientBtn.waitFor({ state: "visible", timeout: 8000 });
      await savePatientBtn.click({ force: true });

      console.log(`[Test] Paciente '${testPatientName}' cadastrado com sucesso!`);
      await page.waitForTimeout(3000);
    } else {
      console.log(`[Test] Paciente '${testPatientName}' já existe. Prosseguindo...`);
    }

    // Retornar para a agenda
    console.log("[Test] Retornando para a Agenda...");
    await page.goto(`${baseURL}/agenda`);
    await page.waitForURL("**/agenda", { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    // 4. Criar Agendamento Temporário
    console.log("[Test] Criando agendamento temporário para o teste...");
    // Conjunto resiliente de seletores para o botão de novo agendamento
    const newAppointmentBtn = page
      .locator(
        [
          'button[aria-label="Novo agendamento"]',
          'button[aria-label="Novo Agendamento"]',
          'button:has-text("Novo Agendamento")',
          'button:has-text("Novo")',
          'button:has-text("Agendar")',
          "button:has(.lucide-plus)",
        ].join(", "),
      )
      .first();

    try {
      console.log("[Test] Aguardando botão de Novo Agendamento ficar visível...");
      await newAppointmentBtn.waitFor({ state: "visible", timeout: 15000 });
      await newAppointmentBtn.click();
      console.log("[Test] Botão de novo agendamento clicado com sucesso.");
    } catch {
      console.log(
        "[Test] Botão físico não ficou visível ou não pôde ser clicado. Tentando atalho de teclado...",
      );
      try {
        await page.focus("body");
        await page.keyboard.press("n");
        console.log("[Test] Pressionado atalho 'n' no teclado para abrir o modal.");
        await page.waitForTimeout(2000);
      } catch (keyErr) {
        console.log("[Test] Falha ao pressionar atalho de teclado:", keyErr);
      }
    }

    console.log(`[Test] Selecionando o paciente '${testPatientName}' no formulário...`);
    // 1. Clica no botão do combobox para abrir o dropdown usando o data-testid preciso
    const comboboxBtn = page
      .locator(
        '[role="dialog"] button[data-testid="patient-select"], [role="dialog"] button[role="combobox"], button[data-testid="patient-select"]',
      )
      .first();
    await comboboxBtn.waitFor({ state: "visible", timeout: 10000 });
    await comboboxBtn.click();
    await page.waitForTimeout(500);

    // 2. Preenche o input de busca com o nome do paciente usando o data-testid preciso
    const searchInput = page
      .locator(
        'input[data-testid="patient-search"], [role="dialog"] input[placeholder*="Digite o nome"]',
      )
      .first();
    await searchInput.waitFor({ state: "visible", timeout: 5000 });
    await searchInput.fill(testPatientName);
    await page.waitForTimeout(2000); // Aguarda o autocomplete/Fuse.js filtrar os pacientes

    // 3. Seleciona a opção correspondente de forma híbrida e ultra-resiliente (Mouse + Teclado)
    console.log("[Test] Clicando na opção do paciente...");

    // Seletor escopado ao modal dialog e apenas para elementos visíveis para evitar elementos fantasmas de fundo
    const patientOption = page
      .locator(
        [
          `[role="dialog"] [role="option"]:has-text("${testPatientName}"):visible`,
          `[role="dialog"] [cmdk-item]:has-text("${testPatientName}"):visible`,
          `[role="dialog"] [role="option"]:has-text("Rafael Teste"):visible`,
          `[role="dialog"] [role="option"]:visible`,
          `[role="dialog"] [cmdk-item]:visible`,
        ].join(", "),
      )
      .first();

    await patientOption.waitFor({ state: "visible", timeout: 8000 });

    // Tenta clique real primeiro. Limitamos a 4000ms para evitar travamento eterno de actionability do Playwright
    await patientOption.click({ timeout: 4000 }).catch(async () => {
      console.log("[Test] Clique normal falhou ou deu timeout. Tentando clique forçado...");
      await patientOption.click({ force: true, timeout: 3000 }).catch((e) => {
        console.log("[Test] Clique forçado também falhou:", e.message);
      });
    });
    await page.waitForTimeout(1000);

    // Contingência via Teclado: se o input ainda estiver visível, o clique falhou.
    // Usaremos as teclas de seta + Enter nativas do cmdk.
    if (await searchInput.isVisible()) {
      console.log(
        "[Test] O clique no paciente falhou ou não surtiu efeito. Iniciando contingência via teclado (ArrowDown + Enter)...",
      );
      await searchInput.focus();
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);
    }

    // Confirmar se o paciente foi selecionado (o botão Alterar deve aparecer no modo inline)
    const alterarBtn = page.locator('button:has-text("Alterar")').first();
    try {
      await alterarBtn.waitFor({ state: "visible", timeout: 5000 });
      console.log("[Test] Paciente selecionado com sucesso (botão Alterar visível).");
    } catch {
      console.log(
        "[Test] Botão Alterar não apareceu. Verificando se o modal de Cadastro Rápido foi aberto...",
      );
      const cadastroRapidoModal = page
        .locator(
          '[role="dialog"]:has-text("Cadastro Rápido"), [role="dialog"]:has-text("Cadastro Rápido de Paciente")',
        )
        .first();

      if (await cadastroRapidoModal.isVisible().catch(() => false)) {
        console.log(
          "[Test] Modal de Cadastro Rápido detectado! Prosseguindo com preenchimento e criação...",
        );

        // Preencher um e-mail temporário único para evitar colisões
        const quickEmailInput = cadastroRapidoModal
          .locator('input[placeholder*="exemplo@email.com"], input[name="email"]')
          .first();
        if (await quickEmailInput.isVisible().catch(() => false)) {
          await quickEmailInput.fill(`rafael.quick.${Date.now()}@autosave.com`);
        }

        const cadastrarEUsarBtn = cadastroRapidoModal
          .locator('button:has-text("Cadastrar e Usar")')
          .first();
        await cadastrarEUsarBtn.waitFor({ state: "visible", timeout: 5000 });
        await cadastrarEUsarBtn.click({ force: true });
        console.log(
          "[Test] Botão 'Cadastrar e Usar' clicado. Aguardando fechamento do modal rápido...",
        );

        await expect(cadastroRapidoModal).toBeHidden({ timeout: 12000 });
        await page.waitForTimeout(2000);
      } else {
        console.log(
          "[Test] Modal de Cadastro Rápido não detectado. Tentando um último Enter direto no input...",
        );
        await searchInput.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1500);

        if (await searchInput.isVisible()) {
          throw new Error(
            "Falha catastrófica: não foi possível selecionar o paciente usando Mouse ou Teclado.",
          );
        }
      }
    }

    // 4. Selecionar o Horário como "09:00" para aparecer no calendário visível diurno
    console.log("[Test] Selecionando o horário '09:00' para o agendamento...");

    // Localizador super preciso para o botão de horário dentro do modal
    const timeCombobox = page
      .locator(
        [
          '[role="dialog"] button:has-text("Horário")',
          '[role="dialog"] button:has(span:has-text("Horário"))',
          '[role="dialog"] button:has-text(":")',
          '[role="dialog"] [id*="time"]',
        ].join(", "),
      )
      .first();

    await timeCombobox.waitFor({ state: "visible", timeout: 10000 });
    await timeCombobox.click({ force: true });

    // Aguarda o dropdown Radix abrir de verdade no DOM
    const dropdown = page
      .locator('[role="listbox"], [data-radix-select-viewport], .select-content')
      .first();
    await dropdown.waitFor({ state: "visible", timeout: 8000 });
    await page.waitForTimeout(500);

    // Localiza e clica na opção do horário "09:00" de forma escopada dentro do dropdown
    const timeOption = dropdown
      .locator(
        [
          '[role="option"]:has-text("09:00")',
          '[role="option"]:has-text("09:")',
          '[role="option"]:has-text("09")',
          '[role="option"]',
        ].join(", "),
      )
      .first();

    await timeOption.waitFor({ state: "visible", timeout: 8000 });
    await timeOption.click({ force: true });
    await page.waitForTimeout(1000);

    console.log("[Test] Clicando no botão para salvar o agendamento...");
    const submitBtn = page
      .locator(
        '[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Criar Agendamento"), button:has-text("Criar Agendamento")',
      )
      .first();
    await submitBtn.waitFor({ state: "visible", timeout: 8000 });
    await submitBtn.click({ force: true });

    console.log("[Test] Aguardando sumiço de loaders, modais e backdrops...");
    // Aguarda sumir qualquer dialog, backdrop ou modal de agendamento de forma robusta
    const modal = page.locator('[role="dialog"]').first();

    // Tenta esperar o modal fechar normalmente. Se não fechar em 8 segundos, checamos se abriu o alerta de capacidade excedida.
    let modalHidden = false;
    try {
      await expect(modal).toBeHidden({ timeout: 8000 });
      modalHidden = true;
      console.log("[Test] Modal de agendamento fechou com sucesso.");
    } catch {
      console.log(
        "[Test] O modal de agendamento ainda está aberto. Verificando se abriu diálogo de Capacidade Excedida...",
      );
      const capacityDialogBtn = page
        .locator(
          'button:has-text("Agendar Mesmo Assim"), button:has-text("Confirmar atendimento extra")',
        )
        .first();

      if (await capacityDialogBtn.isVisible().catch(() => false)) {
        console.log(
          "[Test] Diálogo de Capacidade Excedida detectado! Clicando em 'Agendar Mesmo Assim' para confirmar atendimento extra...",
        );
        await capacityDialogBtn.click({ force: true });

        // Aguarda fechar o diálogo de capacidade excedida e o modal de agendamento original
        await expect(capacityDialogBtn).toBeHidden({ timeout: 10000 });
        await expect(modal).toBeHidden({ timeout: 12000 });
        modalHidden = true;
        console.log("[Test] Agendamento extra confirmado e modal fechado com sucesso!");
      }
    }

    if (!modalHidden) {
      console.log(
        "[Test] O modal não fechou no tempo esperado! Buscando possíveis erros de validação ou rede...",
      );
      const diagnosticInfo = await page.evaluate(() => {
        // Buscar elementos inválidos no formulário
        const invalidElements = Array.from(
          document.querySelectorAll('[aria-invalid="true"], .border-red-500, .border-destructive'),
        );
        const invalidData = invalidElements.map((el) => {
          const name =
            el.getAttribute("name") ||
            el.getAttribute("id") ||
            el.getAttribute("placeholder") ||
            el.tagName;
          let errorMsg = "";
          const parent = el.parentElement;
          if (parent) {
            const errEl = parent.querySelector('.text-red-500, .text-destructive, [id*="-error"]');
            if (errEl) errorMsg = errEl.textContent?.trim() || "";
          }
          return { name, errorMsg };
        });

        // Buscar todos os textos com cor de erro ou red-500 no modal, excluindo o botão de Sair/Cancelar
        const suspectedErrors = Array.from(
          document.querySelectorAll(
            '[class*="text-red"], .text-red-500, .text-red-600, .text-destructive, [id*="error"]',
          ),
        )
          .map((el) => el.textContent?.trim())
          .filter((t) => t && t !== "Sair" && t !== "Cancelar");

        return { invalidData, suspectedErrors };
      });

      console.log(
        "[Test] ELEMENTOS COM VALIDAÇÃO INVÁLIDA:",
        JSON.stringify(diagnosticInfo.invalidData, null, 2),
      );
      console.log(
        "[Test] OUTROS TEXTOS DE ERRO ENCONTRADOS:",
        JSON.stringify(diagnosticInfo.suspectedErrors, null, 2),
      );

      // Tirar screenshot para diagnóstico e salvar no diretório do Playwright
      await page.screenshot({ path: "test-results/validation-errors.png" }).catch(() => {});
      throw new Error(
        `Falha ao submeter o formulário de agendamento. Detalhes inválidos: ${JSON.stringify(diagnosticInfo)}`,
      );
    }

    // Forçar recarga da Agenda pós-criação para garantir sincronização impecável com o banco Neon DB
    console.log("[Test] Recarregando a página de Agenda para puxar e atualizar o calendário...");
    await page.goto(`${baseURL}/agenda`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(4000); // tempo seguro de renderização do calendário

    // 5. Localizar o agendamento que acabamos de criar
    console.log("[Test] Buscando o agendamento de forma resiliente na tela...");

    // Localizador resiliente global na página para buscar o card do agendamento temporário
    const appointmentCard = page
      .locator(
        [
          `.sx__event:has-text("${testPatientName}")`,
          `.sx__time-grid-event:has-text("${testPatientName}")`,
          `[class*="event"]:has-text("${testPatientName}")`,
          `.appointment-card:has-text("${testPatientName}")`,
          `[data-appointment-id]:has-text("${testPatientName}")`,
          `.rbc-event:has-text("${testPatientName}")`,
        ].join(", "),
      )
      .first();

    let cardFound = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[Test] Tentativa ${attempt} de localizar o card na tela...`);
      try {
        await appointmentCard.waitFor({ state: "visible", timeout: 8000 });
        cardFound = true;
        console.log("[Test] Card de agendamento localizado com sucesso!");
        break;
      } catch {
        if (attempt < 3) {
          console.log(
            `[Test] Card não encontrado na tentativa ${attempt}. Recarregando a Agenda...`,
          );
          await page.goto(`${baseURL}/agenda`);
          await page.waitForLoadState("domcontentloaded");
          await page.waitForTimeout(4000);
        }
      }
    }

    if (!cardFound) {
      console.log(
        "[Test] Falha ao localizar o card após as tentativas de recarga. Salvando screenshot de diagnóstico...",
      );
      await page
        .screenshot({ path: "test-results/diagnostic-calendar-missing.png" })
        .catch(() => {});
      throw new Error(
        `Não foi possível localizar o card de agendamento do paciente ${testPatientName} após 3 tentativas de recarga.`,
      );
    }

    console.log("[Test] Abrindo detalhes do agendamento...");
    await appointmentCard.click({ force: true });
    await page.waitForTimeout(1500);

    // 6. Clicar em Iniciar Atendimento
    console.log("[Test] Clicando em Iniciar Atendimento...");
    const startButton = page
      .locator(
        'button:has-text("Iniciar atendimento"), button:has-text("Iniciar Atendimento"), button:has-text("Iniciar Avaliação"), button:has-text("Abrir Evolução")',
      )
      .first();
    await startButton.waitFor({ state: "visible", timeout: 10000 });
    await startButton.click();

    // 7. Aguardar redirecionamento para página de evolução
    console.log("[Test] Aguardando redirecionamento para página de evolução...");
    await page.waitForURL(/\/patient-evolution\//, { timeout: 30000 });
    console.log("[Test] Página de evolução carregada com sucesso:", page.url());

    // Aguardar sumiço de qualquer loader
    await expect(page.locator(".lucide-loader-2, .animate-spin"))
      .toBeHidden({ timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(3000); // tempo de hidratação do Neon e rascunhos

    // Coleta inicial de métricas de performance da página de evolução
    console.log("[Test] Coletando métricas de performance de carregamento da página...");
    const perfMetrics = await page
      .evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType("paint");
        const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? 0;
        return {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          fcp: Math.round(fcp),
        };
      })
      .catch(() => null);

    if (perfMetrics) {
      console.log(
        `[Performance Metrics] TTFB: ${perfMetrics.ttfb}ms | FCP: ${perfMetrics.fcp}ms | DOMContentLoaded: ${perfMetrics.domContentLoaded}ms | LoadComplete: ${perfMetrics.loadComplete}ms`,
      );
    }

    // 8. Interagir com o editor de Observações Clínicas
    console.log("[Test] Localizando o editor ProseMirror de Observações Clínicas...");
    const editor = page.locator(".ProseMirror").first();
    await editor.waitFor({ state: "visible", timeout: 15000 });
    await editor.click();

    // Limpar conteúdo anterior e preencher com texto único
    console.log("[Test] Digitando evolução de teste...");
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    const uniqueText = `Evolucao E2E automatizada por Antigravity - Ref: ${Date.now()}`;
    await editor.fill(uniqueText);
    await page.waitForTimeout(500);

    // 9. Selecionar o nível de dor EVA 5
    console.log("[Test] Selecionando a dor EVA como 5...");
    const eva5Button = page.locator('button[aria-label^="Nível 5 —"]').first();
    await eva5Button.waitFor({ state: "visible", timeout: 5000 });
    await eva5Button.click();
    console.log("[Test] Nível de dor EVA 5 selecionado.");

    // Tirar screenshot para registrar o preenchimento
    await page.screenshot({ path: "test-results/evolution-filled.png" }).catch(() => {});

    // Aguardar o autosave disparar e salvar no Neon DB (usando 12 segundos para tolerância máxima de rede em produção)
    console.log(
      "[Test] Aguardando 12 segundos para acionar o autosave, o debounce e a persistência em produção...",
    );
    await page.waitForTimeout(12000);

    // 10. Voltar para a Agenda
    console.log("[Test] Navegando de volta para a Agenda...");
    const backButton = page
      .locator('button[aria-label="Voltar"], button:has(.lucide-arrow-left), a[href*="agenda"]')
      .first();
    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click();
    } else {
      await page.goto(`${baseURL}/agenda`);
    }

    // Aguardar estar na agenda
    await page.waitForURL("**/agenda", { timeout: 20000 });
    console.log("[Test] De volta na agenda!");
    await page.waitForTimeout(2000);

    // 11. Reabrir o mesmo agendamento para validar a persistência dos dados
    console.log("[Test] Reabrindo o agendamento temporário...");
    await appointmentCard.waitFor({ state: "visible", timeout: 15000 });
    await appointmentCard.click();
    await page.waitForTimeout(1000);

    await startButton.waitFor({ state: "visible", timeout: 10000 });
    await startButton.click();

    // Aguardar carregamento da página de evolução
    await page.waitForURL(/\/patient-evolution\//, { timeout: 30000 });
    await expect(page.locator(".lucide-loader-2, .animate-spin"))
      .toBeHidden({ timeout: 25000 })
      .catch(() => {});
    await page.waitForTimeout(4000); // aguarda sincronismo

    // 12. Asserções finais: Validar que o texto e a nota EVA foram de fato persistidos
    console.log("[Test] Executando asserções clínicas...");
    const loadedText = await editor.textContent();
    console.log(`[Test] Texto carregado no editor: "${loadedText}"`);
    expect(loadedText).toContain(uniqueText);

    const currentPainLevel = page.locator("span.text-3xl.font-bold.leading-none").first();
    const loadedPainLevel = await currentPainLevel.textContent();
    console.log(`[Test] Nota EVA carregada na tela: "${loadedPainLevel}"`);
    expect(loadedPainLevel).toBe("5");

    // Tirar screenshot para provar a persistência com sucesso
    await page.screenshot({ path: "test-results/evolution-persisted-ok.png" }).catch(() => {});
    console.log(
      "[Test] VALIDAÇÃO CONCLUÍDA COM 100% DE SUCESSO! A persistência do autosave e EVA está impecável.",
    );

    // 13. Limpeza do Agendamento Temporário em Produção (deixar ambiente limpo)
    console.log("[Test] Iniciando limpeza do agendamento temporário...");
    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click();
    } else {
      await page.goto(`${baseURL}/agenda`);
    }
    await page.waitForURL("**/agenda", { timeout: 20000 });
    await page.waitForTimeout(2000);

    console.log("[Test] Abrindo modal do agendamento para exclusão...");
    await appointmentCard.waitFor({ state: "visible", timeout: 15000 });
    await appointmentCard.click();
    await page.waitForTimeout(1000);

    console.log("[Test] Clicando em Excluir/Cancelar agendamento...");
    const deleteButton = page
      .locator('button:has-text("Excluir"), button:has-text("Cancelar")')
      .first();
    await deleteButton.click();
    await page.waitForTimeout(500);

    const confirmButton = page
      .locator('button:has-text("Confirmar"), button:has-text("Sim")')
      .first();
    await confirmButton.click();
    console.log("[Test] Agendamento excluído. Aguardando a remoção ser refletida no calendário...");

    // Assegurar que o card sumiu completamente para evitar violação de FK no Neon DB
    await expect(appointmentCard).toBeHidden({ timeout: 12000 });
    console.log("[Test] Agendamento excluído com sucesso! Ambiente limpo.");
    await page.waitForTimeout(2000);

    // 14. Limpeza adicional: Excluir o paciente temporário de teste
    console.log("[Test] Removendo paciente temporário de teste...");
    await page.goto(`${baseURL}/patients`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => {});

    const finalSearchPatientInput = page
      .locator('input[placeholder*="Buscar"], input[placeholder*="Pesquisar"]')
      .first();
    if (await finalSearchPatientInput.isVisible().catch(() => false)) {
      await finalSearchPatientInput.fill(testPatientName);
      await page.waitForTimeout(1500);
    }

    // Loop de contingência e limpeza absoluta de todas as instâncias do paciente criadas em produção
    console.log(
      "[Test] Iniciando remoção de todas as duplicatas do paciente temporário em produção...",
    );
    let removedCount = 0;
    while (true) {
      const deletePatientBtn = page
        .locator('button:has-text("Excluir"), [aria-label*="Excluir"]')
        .first();
      if (await deletePatientBtn.isVisible().catch(() => false)) {
        await deletePatientBtn.click();
        await page.waitForTimeout(500);
        const confirmPatientDeleteBtn = page
          .locator('button:has-text("Confirmar"), button:has-text("Sim")')
          .first();
        await confirmPatientDeleteBtn.click();
        removedCount++;
        console.log(`[Test] Instância #${removedCount} do paciente temporário excluída.`);
        await page.waitForTimeout(2500); // tempo para o Neon processar a exclusão e atualizar a tabela
      } else {
        break;
      }
    }
    console.log(
      `[Test] Remoção concluída. Total de instâncias limpas do banco de produção: ${removedCount}.`,
    );
  });
});
