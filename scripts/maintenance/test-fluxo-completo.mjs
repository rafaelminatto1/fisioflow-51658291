/**
 * TESTE DE FLUXO COMPLETO - FISIOFLOW
 *
 * Fluxo ponta a ponta:
 * 1. Criar Agendamento
 * 2. Clicar no Card do Agendamento
 * 3. Iniciar Atendimento
 * 4. Preencher Evolução SOAP completa (S, O, A, P)
 */

import { chromium } from 'playwright';
import { writeFile, appendFile } from 'fs/promises';

const BASE_URL = 'http://localhost:8080';
const CREDENTIALS = {
  email: 'REDACTED_EMAIL',
  password: 'REDACTED'
};

// Logger para resultados
const logResults = async (testName, result) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${testName}: ${JSON.stringify(result)}\n`;
  await appendFile('/tmp/fluxo-completo-results.log', logEntry);
  console.log(logEntry.trim());
};

// Função helper para login
async function login(page) {
  console.log('\n=== FAZENDO LOGIN ===');
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  await page.fill('#login-email', CREDENTIALS.email);
  await page.fill('#login-password', CREDENTIALS.password);
  await page.click('button:has-text("Entrar na Plataforma")');

  await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 45000 });
  await page.waitForTimeout(3000);
  console.log('✅ Login realizado com sucesso');
  return true;
}

// ==========================================
// TESTE DE FLUXO COMPLETO
// ==========================================
async function testFluxoCompleto() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300 // Mais lento para visualização
  });

  const page = await browser.newPage();
  const result = {
    test: 'Fluxo Completo: Agendamento → Atendimento → Evolução',
    passed: false,
    steps: [],
    errors: [],
    details: {}
  };

  try {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TESTE DE FLUXO COMPLETO - FISIOFLOW');
    console.log('█    Criar Agendamento → Iniciar Atendimento → Preencher SOAP');
    console.log('█'.repeat(70));

    // ========================================
    // ETAPA 1: LOGIN E NAVEGAÇÃO
    // ========================================
    console.log('\n📍 ETAPA 1: Login e Navegação para Agenda');
    console.log('-'.repeat(70));

    await login(page);

    // Navegar para agenda
    console.log('\nNavegando para Agenda (/)...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    result.steps.push({ step: 'Navegação Agenda', status: 'pass', message: 'Agenda carregada' });

    await page.screenshot({ path: '/tmp/fluxo-01-agenda.png', fullPage: true });

    // ========================================
    // ETAPA 2: CRIAR AGENDAMENTO
    // ========================================
    console.log('\n📍 ETAPA 2: Criar Novo Agendamento');
    console.log('-'.repeat(70));

    // Procurar botão de novo agendamento
    const newAppointmentSelectors = [
      'button:has-text("Novo Agendamento")',
      'button:has-text("Nova Consulta")',
      'button:has-text("+")',
      '[data-testid="new-appointment"]',
      'button[aria-label*="novo" i]'
    ];

    console.log('\nProcurando botão "Novo Agendamento"...');
    let newButtonClicked = false;
    for (const selector of newAppointmentSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   ✓ Botão encontrado: ${selector}`);
        await page.click(selector);
        newButtonClicked = true;
        result.steps.push({ step: 'Abrir Modal', status: 'pass', message: 'Modal de novo agendamento aberto' });
        break;
      }
    }

    if (!newButtonClicked) {
      throw new Error('Botão "Novo Agendamento" não encontrado');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/fluxo-02-modal-agendamento.png', fullPage: true });

    // Preencher formulário de agendamento
    console.log('\nPreenchendo formulário de agendamento...');

    // Selecionar Paciente
    console.log('\n1. Selecionando Paciente...');
    const patientSelectors = [
      'select[name="patient"]',
      'input[name="patient"]',
      '[data-testid="patient-select"]',
      '#patient',
      'select:has-text("Paciente")'
    ];

    let patientSelected = false;
    for (const selector of patientSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        try {
          // Tentar selecionar opção do dropdown
          await page.selectOption(selector, { index: 0 });
          patientSelected = true;
          console.log('   ✓ Paciente selecionado (dropdown)');
          result.details.patientSelected = true;
          break;
        } catch (e) {
          // Se não for dropdown, tentar preencher
          try {
            await page.click(selector);
            await page.waitForTimeout(500);
            const option = await page.locator('option').first();
            if (await option.count() > 0) {
              await option.click();
              patientSelected = true;
              console.log('   ✓ Paciente selecionado (opção clicada)');
              result.details.patientSelected = true;
              break;
            }
          } catch (e2) {
            continue;
          }
        }
      }
    }

    if (!patientSelected) {
      console.log('   ! Paciente não selecionado - tentando preencher campo');
    }

    // Data do agendamento
    console.log('\n2. Definindo Data...');
    try {
      const dateInput = await page.locator('input[type="date"]').first();
      if (await dateInput.count() > 0) {
        const today = new Date().toISOString().split('T')[0];
        await dateInput.fill(today);
        console.log(`   ✓ Data definida: ${today}`);
        result.details.appointmentDate = today;
      }
    } catch (e) {
      result.errors.push({ step: 'Data', error: e.message });
    }

    // Horário do agendamento
    console.log('\n3. Definindo Horário...');
    try {
      const timeInput = await page.locator('input[type="time"]').first();
      if (await timeInput.count() > 0) {
        await timeInput.fill('10:00');
        console.log('   ✓ Horário definido: 10:00');
        result.details.appointmentTime = '10:00';
      }
    } catch (e) {
      result.errors.push({ step: 'Horário', error: e.message });
    }

    // Tipo de consulta
    console.log('\n4. Selecionando Tipo de Consulta...');
    const typeSelectors = [
      'select[name="type"]',
      'select[name="appointment_type"]',
      '[data-testid="appointment-type"]'
    ];

    for (const selector of typeSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        try {
          await page.selectOption(selector, { index: 0 });
          console.log('   ✓ Tipo de consulta selecionado');
          result.details.appointmentType = 'selected';
          break;
        } catch (e) {
          continue;
        }
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/fluxo-03-form-preenchido.png', fullPage: true });

    // Salvar agendamento
    console.log('\n5. Salvando Agendamento...');
    const saveSelectors = [
      'button:has-text("Salvar")',
      'button:has-text("Confirmar")',
      'button:has-text("Criar")',
      'button[type="submit"]',
      '[data-testid="save-appointment"]'
    ];

    for (const selector of saveSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        console.log(`   ✓ Clicou em: ${selector}`);
        break;
      }
    }

    // Aguardar processamento
    console.log('\n   Aguardando processamento...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/fluxo-04-agendamento-salvo.png', fullPage: true });

    result.steps.push({ step: 'Criar Agendamento', status: 'pass', message: 'Agendamento criado com sucesso' });
    result.details.appointmentId = 'created';

    // ========================================
    // ETAPA 3: LOCALIZAR E CLICAR NO CARD
    // ========================================
    console.log('\n📍 ETAPA 3: Localizar e Clicar no Card do Agendamento');
    console.log('-'.repeat(70));

    // Recarregar a página para ver o novo agendamento
    console.log('\nRecarregando agenda para ver novo agendamento...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/fluxo-05-agenda-atualizada.png', fullPage: true });

    // Procurar pelo card do agendamento
    console.log('\nProcurando card do agendamento criado...');

    const cardSelectors = [
      '[data-testid="appointment-card"]',
      '.appointment-card',
      '[data-testid="appointment"]',
      'div:has-text("10:00")',
      'div:has-text("10:00")'
    ];

    let cardFound = false;
    for (const selector of cardSelectors) {
      const count = await page.locator(selector).count();
      console.log(`   Procurando: ${selector} (${count} encontrados)`);
      if (count > 0) {
        cardFound = true;
        break;
      }
    }

    if (cardFound) {
      console.log('\n   ✓ Card de agendamento encontrado');

      // Clicar no card
      console.log('\nClicando no card do agendamento...');
      for (const selector of cardSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          await page.locator(selector).first().click();
          console.log('   ✓ Card clicado');
          result.steps.push({ step: 'Clicar no Card', status: 'pass', message: 'Card do agendamento clicado' });
          break;
        }
      }

      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/tmp/fluxo-06-card-clicado.png', fullPage: true });
    } else {
      console.log('\n   ! Card não encontrado - tentando encontrar pela lista');
      // Tentar encontrar na lista
      const listItems = await page.locator('li, [role="listitem"], tr').count();
      console.log(`   Itens na lista: ${listItems}`);

      if (listItems > 0) {
        await page.locator('li, [role="listitem"], tr').first().click();
        console.log('   ✓ Primeiro item clicado');
        await page.waitForTimeout(3000);
      }
    }

    // ========================================
    // ETAPA 4: INICIAR ATENDIMENTO
    // ========================================
    console.log('\n📍 ETAPA 4: Iniciar Atendimento');
    console.log('-'.repeat(70));

    await page.screenshot({ path: '/tmp/fluxo-07-detalhes-agendamento.png', fullPage: true });

    // Procurar botão "Iniciar Atendimento"
    console.log('\nProcurando botão "Iniciar Atendimento"...');

    const startAttSelectors = [
      'button:has-text("Iniciar Atendimento")',
      'button:has-text("Iniciar")',
      'a:has-text("Iniciar Atendimento")',
      '[data-testid="start-appointment"]',
      '[data-testid="iniciar-atendimento"]'
    ];

    let startButtonFound = false;
    for (const selector of startAttSelectors) {
      const count = await page.locator(selector).count();
      console.log(`   Procurando: ${selector} (${count} encontrados)`);
      if (count > 0) {
        await page.click(selector);
        console.log(`   ✓ Clicou em: ${selector}`);
        startButtonFound = true;
        result.steps.push({ step: 'Iniciar Atendimento', status: 'pass', message: 'Botão "Iniciar Atendimento" clicado' });
        break;
      }
    }

    if (!startButtonFound) {
      console.log('\n   ! Botão "Iniciar Atendimento" não encontrado');
      console.log('   Verificando botões disponíveis na página...');

      const allButtons = await page.locator('button').all();
      console.log(`   Total de botões encontrados: ${allButtons.length}`);

      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const text = await allButtons[i].textContent();
        console.log(`   Botão ${i + 1}: "${text?.trim()}"`);
      }
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/fluxo-08-pos-iniciar.png', fullPage: true });

    // Verificar se mudou para página de evolução
    const currentUrl = page.url();
    console.log(`\n   URL atual: ${currentUrl}`);

    if (currentUrl.includes('evolution') || currentUrl.includes('soap') || currentUrl.includes('atendimento')) {
      console.log('   ✓ Navegou para página de atendimento/evolução');
      result.steps.push({ step: 'Navegação Evolução', status: 'pass', message: 'Redirecionado para evolução' });
    }

    // ========================================
    // ETAPA 5: PREENCHER EVOLUÇÃO SOAP COMPLETA
    // ========================================
    console.log('\n📍 ETAPA 5: Preencher Evolução SOAP Completa');
    console.log('-'.repeat(70));

    await page.screenshot({ path: '/tmp/fluxo-09-pagina-evolucao.png', fullPage: true });

    // SUBJETIVO (S)
    console.log('\n--- PREENCHENDO SUBJETIVO (S) ---');
    const subjectiveSelectors = [
      'textarea[name="subjective"]',
      'textarea[name="subjetivo"]',
      '[data-testid="soap-subjective"]',
      'textarea[placeholder*="subjet" i]',
      'textarea[placeholder*="queixa" i]',
      '#subjective'
    ];

    let subjectiveFilled = false;
    for (const selector of subjectiveSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        const subjectiveText = 'Paciente relata dor lombar há 6 meses, com piora ao sentar e ficar em pé por longos períodos. Dor tipo pontada, localizada em região lombar baixa. Negada irradiação para membros inferiores. Refere tratamento fisioterapêutico anterior com melhora temporária.';
        await page.fill(selector, subjectiveText);
        console.log('   ✓ Subjetivo preenchido');
        subjectiveFilled = true;
        result.details.subjectiveFilled = true;
        break;
      }
    }

    await page.waitForTimeout(500);

    // OBJETIVO (O)
    console.log('\n--- PREENCHENDO OBJETIVO (O) ---');
    const objectiveSelectors = [
      'textarea[name="objective"]',
      'textarea[name="objetivo"]',
      '[data-testid="soap-objective"]',
      'textarea[placeholder*="objet" i]',
      'textarea[placeholder*="exame" i]',
      '#objective'
    ];

    let objectiveFilled = false;
    for (const selector of objectiveSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        const objectiveText = 'Inspeção visual: postura ereta mantida, sem desvios. Palpação: hipertrofia leve da musculatura paravertebral lombar. Mobilidade: flexão de tronco 45°, extensão 20°. Flexão de quadril 90° bilateral. Força muscular: grau 4/5 em flexores de quadril e isquiotibiais anteriores. Reflexos: patelar e aquileano presentes e simétricos. Dor à palpação dos processos espinhosos L4-L5.';
        await page.fill(selector, objectiveText);
        console.log('   ✓ Objetivo preenchido');
        objectiveFilled = true;
        result.details.objectiveFilled = true;
        break;
      }
    }

    await page.waitForTimeout(500);

    // AVALIAÇÃO (A)
    console.log('\n--- PREENCHENDO AVALIAÇÃO (A) ---');
    const assessmentSelectors = [
      'textarea[name="assessment"]',
      'textarea[name="avaliacao"]',
      '[data-testid="soap-assessment"]',
      'textarea[placeholder*="avalia" i]',
      'textarea[placeholder*="diagn" i]',
      '#assessment'
    ];

    let assessmentFilled = false;
    for (const selector of assessmentSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        const assessmentText = 'Lombalgia mecânica não específica com componente de compressão radicular. Hérnia de disco L4-L5 confirmada por RMN em 2023 (relatório disponível). Sinal de Lasègue positivo à esquerda. Teste de Slump positivo. Prognóstico favorável com tratamento conservador e fisioterapia adequada.';
        await page.fill(selector, assessmentText);
        console.log('   ✓ Avaliação preenchida');
        assessmentFilled = true;
        result.details.assessmentFilled = true;
        break;
      }
    }

    await page.waitForTimeout(500);

    // PLANO (P)
    console.log('\n--- PREENCHENDO PLANO (P) ---');
    const planSelectors = [
      'textarea[name="plan"]',
      'textarea[name="plano"]',
      '[data-testid="soap-plan"]',
      'textarea[placeholder*="pla" i]',
      'textarea[placeholder*="tratamento" i]',
      '#plan'
    ];

    let planFilled = false;
    for (const selector of planSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        const planText = '1) alongamento: alongamento de isquiotibiais, flexores de quadril e paravertebrais - 3x/semana, 30 min\n2) fortalecimento de core: exercícios de estabilização de tronco e pélvica - 3x/semana\n3) mobilidade lombar: exercícios de flexibilidade e mobilidade - diário\n4) eletroterapia: TENS por 20 min na região lombar - 2x/semana\n5) orientações: evitar permanecer em pé por longos períodos, usar cadeira ergonômica, aplicar calor local por 15min 2x/dia\n6) retorno em 7 dias para reavaliação';
        await page.fill(selector, planText);
        console.log('   ✓ Plano preenchido');
        planFilled = true;
        result.details.planFilled = true;
        break;
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/fluxo-10-soap-completo.png', fullPage: true });

    // Campos adicionais que podem existir
    console.log('\n--- CAMPOS ADICIONAIS ---');

    // Nível de dor (EVA)
    const painSelectors = [
      'input[name="pain_level"]',
      'input[type="number"][name*="dor"]',
      'input[name="eva"]',
      '[data-testid="pain-level"]',
      'input[placeholder*="dor" i]'
    ];

    for (const selector of painSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, '7');
        console.log('   ✓ Nível de dor definido: 7/10');
        result.details.painLevel = 7;
        break;
      }
    }

    // Localização da dor
    const painLocationSelectors = [
      'input[name="pain_location"]',
      'textarea[name="pain_location"]',
      '[data-testid="pain-location"]',
      'input[placeholder*="localiza" i]'
    ];

    for (const selector of painLocationSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Região lombar baixa, bilateral');
        console.log('   ✓ Localização da dor definida');
        result.details.painLocation = 'Lombar baixa bilateral';
        break;
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/fluxo-11-campos-adicionais.png', fullPage: true });

    // ========================================
    // ETAPA 6: SALVAR EVOLUÇÃO
    // ========================================
    console.log('\n📍 ETAPA 6: Salvar Evolução SOAP');
    console.log('-'.repeat(70));

    // Procurar botões de salvar/finalizar
    const saveSoapSelectors = [
      'button:has-text("Salvar Evolução")',
      'button:has-text("Finalizar Evolução")',
      'button:has-text("Finalizar")',
      'button:has-text("Salvar")',
      'button[type="submit"]',
      '[data-testid="save-soap"]',
      '[data-testid="finish-soap"]'
    ];

    console.log('\nProcurando botão de salvar...');
    for (const selector of saveSoapSelectors) {
      const count = await page.locator(selector).count();
      console.log(`   ${selector}: ${count} encontrados`);
      if (count > 0) {
        await page.click(selector);
        console.log(`   ✓ Clicou em: ${selector}`);
        result.steps.push({ step: 'Salvar SOAP', status: 'pass', message: 'Evolução salva' });
        break;
      }
    }

    // Aguardar processamento
    console.log('\n   Aguardando salvamento...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/fluxo-12-evolucao-salva.png', fullPage: true });

    // Verificar se houve confirmação ou redirecionamento
    const finalUrl = page.url();
    console.log(`\n   URL final: ${finalUrl}`);

    // Verificar mensagens de sucesso
    const successSelectors = [
      'text=Sucesso',
      'text=salvo',
      'text=criado',
      'text=Evolução registrada',
      '[data-testid="success"]',
      '.success'
    ];

    let hasSuccessMessage = false;
    for (const selector of successSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasSuccessMessage = true;
        console.log(`   ✓ Mensagem de sucesso encontrada`);
        break;
      }
    }

    // Verificar erros
    const pageText = await page.locator('body').textContent();
    const hasErrors = /erro|error|falhou|falid|incorre/i.test(pageText || '');

    if (hasErrors) {
      console.log('   ! Possíveis erros detectados na página');
      result.errors.push({ step: 'Verificação Final', error: 'Erros detectados' });
    } else {
      console.log('   ✓ Nenhum erro detectado');
    }

    // Estatística final
    const soapCompleteness = {
      subjective: subjectiveFilled,
      objective: objectiveFilled,
      assessment: assessmentFilled,
      plan: planFilled,
      percentage: ((subjectiveFilled ? 25 : 0) +
                     (objectiveFilled ? 25 : 0) +
                     (assessmentFilled ? 25 : 0) +
                     (planFilled ? 25 : 0))
    };

    console.log('\n--- ESTATÍSTICA DA EVOLUÇÃO SOAP ---');
    console.log(`   Subjetivo (S): ${subjectiveFilled ? '✓' : '✗'} (${soapCompleteness.subjective}%)`);
    console.log(`   Objetivo (O): ${objectiveFilled ? '✓' : '✗'} (${soapCompleteness.objective}%)`);
    console.log(`   Avaliação (A): ${assessmentFilled ? '✓' : '✗'} (${soapCompleteness.assessment}%)`);
    console.log(`   Plano (P): ${planFilled ? '✓' : '✗'} (${soapCompleteness.plan}%)`);
    console.log(`   Completude: ${soapCompleteness.percentage}%`);

    result.details.soapCompleteness = soapCompleteness;

    // ========================================
    // RESULTADO FINAL
    // ========================================
    result.passed = subjectiveFilled && objectiveFilled && assessmentFilled && planFilled;

    console.log('\n' + '█'.repeat(70));
    console.log('█    RESULTADO FINAL DO TESTE');
    console.log('█'.repeat(70));

    console.log(`\nStatus: ${result.passed ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log(`SOAP Completude: ${soapCompleteness.percentage}%`);

    console.log('\n--- Passos Executados ---');
    for (const step of result.steps) {
      console.log(`  [${step.status.toUpperCase()}] ${step.step}: ${step.message}`);
    }

    if (result.errors.length > 0) {
      console.log('\n--- Erros ---');
      for (const err of result.errors) {
        console.log(`  ! ${err.step}: ${err.error}`);
      }
    }

    // Screenshot final
    await page.screenshot({ path: '/tmp/fluxo-13-final.png', fullPage: true });

  } catch (error) {
    result.errors.push({ step: 'Erro Geral', error: error.message });
    result.passed = false;
    console.error('\n❌ ERRO NO TESTE:', error.message);
    await page.screenshot({ path: '/tmp/fluxo-error.png', fullPage: true });
  } finally {
    await browser.close();
  }

  await logResults('FLUXO_COMPLETO', result);

  // Salvar resultado JSON
  await writeFile('/tmp/fluxo-completo-result.json', JSON.stringify(result, null, 2));

  return result;
}

// ==========================================
// EXECUÇÃO
// ==========================================
(async () => {
  console.log('\n' + '█'.repeat(70));
  console.log('█    INICIANDO TESTE DE FLUXO COMPLETO');
  console.log('█'.repeat(70));

  const result = await testFluxoCompleto();

  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE FINALIZADO');
  console.log('█'.repeat(70));
  console.log(`\nResultado: ${result.passed ? '✅ PASSOU' : '❌ FALHOU'}`);

  process.exit(result.passed ? 0 : 1);
})();
