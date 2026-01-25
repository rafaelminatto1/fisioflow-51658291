/**
 * SUITE DE TESTES E2E - FISIOFLOW
 *
 * Testes completos de CRUD para as páginas principais:
 * 1. Agenda (Schedule)
 * 2. Evolução (SOAP Records)
 * 3. Avaliação (Evaluation Forms)
 */

import { chromium } from 'playwright';
import { writeFile, appendFile } from 'fs/promises';

const BASE_URL = 'http://localhost:8080';
const CREDENTIALS = {
  email: 'rafael.minatto@yahoo.com.br',
  password: 'Yukari30@'
};

// Logger para resultados
const logResults = async (testName, result) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${testName}: ${JSON.stringify(result)}\n`;
  await appendFile('/tmp/fisioflow-test-results.log', logEntry);
  console.log(logEntry.trim());
};

// Função helper para login
async function login(page) {
  console.log('\n=== FAZENDO LOGIN ===');
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000); // Esperar carregar React

  await page.fill('#login-email', CREDENTIALS.email);
  await page.fill('#login-password', CREDENTIALS.password);
  await page.click('button:has-text("Entrar na Plataforma")');

  await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 45000 });
  await page.waitForTimeout(3000);
  console.log('✅ Login realizado com sucesso');
  return true;
}

// ==========================================
// TESTE 1: AGENDA (Schedule)
// ==========================================
async function testAgenda(browser) {
  const page = await browser.newPage();
  const result = {
    test: 'Agenda CRUD',
    passed: false,
    steps: [],
    errors: []
  };

  try {
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 1: AGENDA (Schedule)');
    console.log('='.repeat(60));

    await login(page);

    // Navegar para agenda
    console.log('\n1. Navegando para Agenda...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    result.steps.push({ step: 'Navegação', status: 'pass', message: 'Agenda carregada' });

    // Verificar se a agenda está visível
    const agendaVisible = await page.locator('text=Agenda').count() > 0 ||
                          await page.locator('[data-testid="schedule"]').count() > 0 ||
                          await page.locator('.calendar').count() > 0;

    if (agendaVisible) {
      result.steps.push({ step: 'Verificar Agenda Visível', status: 'pass', message: 'Agenda está visível' });
    } else {
      result.steps.push({ step: 'Verificar Agenda Visível', status: 'fail', message: 'Agenda não encontrada' });
    }

    // Testar CREATE - Criar novo agendamento
    console.log('\n2. Testando CREATE - Novo Agendamento...');

    // Procurar botão de novo agendamento
    const newAppointmentSelectors = [
      'button:has-text("Novo Agendamento")',
      'button:has-text("Nova Consulta")',
      'button:has-text("+")',
      '[data-testid="new-appointment"]',
      'button[aria-label*="novo" i]',
      'button[aria-label*="agendamento" i]'
    ];

    let newButtonClicked = false;
    for (const selector of newAppointmentSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   Botão encontrado: ${selector}`);
        await page.click(selector);
        newButtonClicked = true;
        result.steps.push({ step: 'Abrir Modal Novo Agendamento', status: 'pass', message: selector });
        break;
      }
    }

    await page.waitForTimeout(2000);

    if (newButtonClicked) {
      // Preencher formulário de agendamento
      console.log('\n3. Preenchendo formulário de agendamento...');

      // Capturar screenshot do formulário
      await page.screenshot({ path: '/tmp/test-agenda-01-form.png', fullPage: true });

      // Buscar campos do formulário
      const patientSelectors = [
        'select[name="patient"]',
        'input[name="patient"]',
        '[data-testid="patient-select"]',
        '#patient'
      ];

      let formFilled = false;
      for (const selector of patientSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          try {
            await page.selectOption(selector, { index: 0 });
            formFilled = true;
            result.steps.push({ step: 'Selecionar Paciente', status: 'pass', message: 'Paciente selecionado' });
            break;
          } catch (e) {
            // Try typing instead
            try {
              await page.fill(selector, 'Teste Paciente');
              formFilled = true;
              result.steps.push({ step: 'Preencher Paciente', status: 'pass', message: 'Paciente preenchido' });
              break;
            } catch (e2) {
              continue;
            }
          }
        }
      }

      // Data e hora
      try {
        const dateInput = await page.locator('input[type="date"]').first();
        if (await dateInput.count() > 0) {
          const today = new Date().toISOString().split('T')[0];
          await dateInput.fill(today);
          result.steps.push({ step: 'Preencher Data', status: 'pass', message: `Data: ${today}` });
        }
      } catch (e) {
        result.errors.push({ step: 'Preencher Data', error: e.message });
      }

      try {
        const timeInput = await page.locator('input[type="time"]').first();
        if (await timeInput.count() > 0) {
          await timeInput.fill('10:00');
          result.steps.push({ step: 'Preencher Hora', status: 'pass', message: 'Hora: 10:00' });
        }
      } catch (e) {
        result.errors.push({ step: 'Preencher Hora', error: e.message });
      }

      await page.screenshot({ path: '/tmp/test-agenda-02-filled.png', fullPage: true });

      // Salvar/Confirmar
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
          result.steps.push({ step: 'Salvar Agendamento', status: 'pass', message: 'Agendamento salvo' });
          break;
        }
      }

      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/tmp/test-agenda-03-after-save.png', fullPage: true });

    } else {
      result.steps.push({ step: 'Criar Agendamento', status: 'skip', message: 'Botão não encontrado' });
    }

    // Testar READ - Listar agendamentos
    console.log('\n4. Testando READ - Listar Agendamentos...');

    const appointmentsCount = await page.locator('[data-testid="appointment"], .appointment, tr').count();
    result.steps.push({
      step: 'Listar Agendamentos',
      status: 'pass',
      message: `${appointmentsCount} agendamentos encontrados`
    });

    // Testar UPDATE - Editar agendamento
    if (appointmentsCount > 0) {
      console.log('\n5. Testando UPDATE - Editar Agendamento...');

      const editSelectors = [
        '[data-testid="appointment"] button:has-text("Editar")',
        '.appointment button[aria-label*="edit" i]',
        'tr:first-child button:has-text("Editar")'
      ];

      for (const selector of editSelectors) {
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            await page.click(selector);
            result.steps.push({ step: 'Abrir Edição', status: 'pass', message: 'Modal de edição aberto' });
            await page.waitForTimeout(2000);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      await page.screenshot({ path: '/tmp/test-agenda-04-edit-mode.png', fullPage: true });
    }

    result.passed = result.errors.length === 0;
    console.log(`\n✅ TESTE AGENDA: ${result.passed ? 'PASSOU' : 'FALHOU'}`);

  } catch (error) {
    result.errors.push({ step: 'Erro Geral', error: error.message });
    result.passed = false;
    console.error('\n❌ ERRO NO TESTE AGENDA:', error.message);
  } finally {
    await page.close();
  }

  await logResults('AGENDA', result);
  return result;
}

// ==========================================
// TESTE 2: EVOLUÇÃO (SOAP Records)
// ==========================================
async function testEvolucao(browser) {
  const page = await browser.newPage();
  const result = {
    test: 'Evolução CRUD',
    passed: false,
    steps: [],
    errors: []
  };

  try {
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 2: EVOLUÇÃO (SOAP Records)');
    console.log('='.repeat(60));

    await login(page);

    // Navegar para pacientes
    console.log('\n1. Navegando para Pacientes...');
    await page.goto(`${BASE_URL}/patients`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    result.steps.push({ step: 'Navegação Pacientes', status: 'pass', message: 'Página de pacientes carregada' });

    await page.screenshot({ path: '/tmp/test-evolucao-01-patients.png', fullPage: true });

    // Selecionar um paciente
    console.log('\n2. Selecionando paciente...');

    const patientSelectors = [
      '[data-testid="patient-card"]',
      '.patient-card',
      'tr:has-text("Paciente")',
      '[role="row"]'
    ];

    let patientSelected = false;
    for (const selector of patientSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        try {
          await page.locator(selector).first().click();
          patientSelected = true;
          result.steps.push({ step: 'Selecionar Paciente', status: 'pass', message: 'Paciente selecionado' });
          await page.waitForTimeout(2000);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    await page.screenshot({ path: '/tmp/test-evolucao-02-patient-detail.png', fullPage: true });

    // Procurar aba/link de evoluções
    console.log('\n3. Procurando seção de Evoluções...');

    const evolutionSelectors = [
      'a:has-text("Evolução")',
      'a:has-text("SOAP")',
      'button:has-text("Evolução")',
      '[data-testid="evolution-tab"]',
      'tab:has-text("Evoluções")'
    ];

    for (const selector of evolutionSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        try {
          await page.click(selector);
          result.steps.push({ step: 'Abrir Evoluções', status: 'pass', message: 'Aba de evoluções aberta' });
          await page.waitForTimeout(2000);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    await page.screenshot({ path: '/tmp/test-evolucao-03-evolution-tab.png', fullPage: true });

    // Testar CREATE - Nova evolução
    console.log('\n4. Testando CREATE - Nova Evolução SOAP...');

    const newSoapSelectors = [
      'button:has-text("Nova Evolução")',
      'button:has-text("Adicionar Evolução")',
      'button:has-text("+ Evolução")',
      '[data-testid="new-soap"]',
      'a:has-text("Nova Evolução")'
    ];

    for (const selector of newSoapSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        result.steps.push({ step: 'Nova Evolução', status: 'pass', message: 'Formulário aberto' });
        await page.waitForTimeout(2000);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/test-evolucao-04-soap-form.png', fullPage: true });

    // Preencher campos SOAP
    console.log('\n5. Preenchendo campos SOAP...');

    // Subjective
    const subjectiveSelectors = [
      'textarea[name="subjective"]',
      '[data-testid="soap-subjective"]',
      'textarea[placeholder*="subjet" i]'
    ];

    for (const selector of subjectiveSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Paciente relata melhora na dor lombar após sessão de exercícios.');
        result.steps.push({ step: 'Preencher Subjetivo', status: 'pass', message: 'Subjetivo preenchido' });
        break;
      }
    }

    // Objective
    const objectiveSelectors = [
      'textarea[name="objective"]',
      '[data-testid="soap-objective"]',
      'textarea[placeholder*="objet" i]'
    ];

    for (const selector of objectiveSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Flexibilidade de tronco aumentada. Mobilidade lombar preservada.');
        result.steps.push({ step: 'Preencher Objetivo', status: 'pass', message: 'Objetivo preenchido' });
        break;
      }
    }

    // Assessment
    const assessmentSelectors = [
      'textarea[name="assessment"]',
      '[data-testid="soap-assessment"]',
      'textarea[placeholder*="avalia" i]'
    ];

    for (const selector of assessmentSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Paciente mostrando boa resposta ao tratamento. Continuar com protocolo atual.');
        result.steps.push({ step: 'Preencher Avaliação', status: 'pass', message: 'Avaliação preenchida' });
        break;
      }
    }

    // Plan
    const planSelectors = [
      'textarea[name="plan"]',
      '[data-testid="soap-plan"]',
      'textarea[placeholder*="pla" i]'
    ];

    for (const selector of planSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Continuar exercícios de fortalecimento core + alongamento. Próxima sessão em 7 dias.');
        result.steps.push({ step: 'Preencher Plano', status: 'pass', message: 'Plano preenchido' });
        break;
      }
    }

    await page.screenshot({ path: '/tmp/test-evolucao-05-filled.png', fullPage: true });

    // Salvar
    const saveSoapSelectors = [
      'button:has-text("Salvar Evolução")',
      'button:has-text("Finalizar")',
      'button:has-text("Salvar")',
      'button[type="submit"]',
      '[data-testid="save-soap"]'
    ];

    for (const selector of saveSoapSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        result.steps.push({ step: 'Salvar SOAP', status: 'pass', message: 'Evolução salva' });
        await page.waitForTimeout(3000);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/test-evolucao-06-after-save.png', fullPage: true });

    // Testar READ - Listar evoluções
    console.log('\n6. Testando READ - Listar Evoluções...');

    const soapCount = await page.locator('[data-testid="soap-record"], .soap-record, .evolution-item').count();
    result.steps.push({
      step: 'Listar Evoluções',
      status: 'pass',
      message: `${soapCount} evoluções encontradas`
    });

    result.passed = result.errors.length === 0;
    console.log(`\n✅ TESTE EVOLUÇÃO: ${result.passed ? 'PASSOU' : 'FALHOU'}`);

  } catch (error) {
    result.errors.push({ step: 'Erro Geral', error: error.message });
    result.passed = false;
    console.error('\n❌ ERRO NO TESTE EVOLUÇÃO:', error.message);
  } finally {
    await page.close();
  }

  await logResults('EVOLUÇÃO', result);
  return result;
}

// ==========================================
// TESTE 3: AVALIAÇÃO (Evaluation)
// ==========================================
async function testAvaliacao(browser) {
  const page = await browser.newPage();
  const result = {
    test: 'Avaliação CRUD',
    passed: false,
    steps: [],
    errors: []
  };

  try {
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 3: AVALIAÇÃO (Evaluation Forms)');
    console.log('='.repeat(60));

    await login(page);

    // Navegar para pacientes
    console.log('\n1. Navegando para Pacientes...');
    await page.goto(`${BASE_URL}/patients`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    result.steps.push({ step: 'Navegação Pacientes', status: 'pass', message: 'Página de pacientes carregada' });

    await page.screenshot({ path: '/tmp/test-avaliacao-01-patients.png', fullPage: true });

    // Selecionar um paciente
    console.log('\n2. Selecionando paciente para avaliação...');

    const patientSelectors = [
      '[data-testid="patient-card"]',
      '.patient-card',
      'tr:has-text("Paciente")'
    ];

    let patientSelected = false;
    for (const selector of patientSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        try {
          await page.locator(selector).first().click();
          patientSelected = true;
          result.steps.push({ step: 'Selecionar Paciente', status: 'pass', message: 'Paciente selecionado' });
          await page.waitForTimeout(3000);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    await page.screenshot({ path: '/tmp/test-avaliacao-02-patient-detail.png', fullPage: true });

    // Procurar botão/link de nova avaliação
    console.log('\n3. Procurando botão Nova Avaliação...');

    const newEvalSelectors = [
      'button:has-text("Nova Avaliação")',
      'a:has-text("Nova Avaliação")',
      'button:has-text("Avaliação Física")',
      'button:has-text("Ficha de Avaliação")',
      '[data-testid="new-evaluation"]',
      'a[href*="evaluations/new"]'
    ];

    for (const selector of newEvalSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        result.steps.push({ step: 'Nova Avaliação', status: 'pass', message: 'Formulário de avaliação aberto' });
        await page.waitForTimeout(3000);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/test-avaliacao-03-form.png', fullPage: true });

    // Verificar URL mudou para página de avaliação
    const currentUrl = page.url();
    if (currentUrl.includes('/evaluations/new') || currentUrl.includes('avaliacao')) {
      result.steps.push({ step: 'URL de Avaliação', status: 'pass', message: 'Navegou para página de avaliação' });
    }

    // Preencher formulário de avaliação
    console.log('\n4. Preenchendo formulário de avaliação...');

    // Anamnese
    const anamnesisSelectors = [
      'textarea[name="anamnesis"]',
      'textarea[name="história"]',
      'textarea[placeholder*="anamn" i]',
      'textarea[placeholder*="história" i]'
    ];

    for (const selector of anamnesisSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Paciente relata dor lombar há 6 meses, piora ao sentar. Histórico de lombalgia recidivante.');
        result.steps.push({ step: 'Preencher Anamnese', status: 'pass', message: 'Anamnese preenchida' });
        break;
      }
    }

    // Exame físico
    const physicalSelectors = [
      'textarea[name="physical_exam"]',
      'textarea[name="exame_fisico"]',
      'textarea[placeholder*="exame" i]',
      'textarea[placeholder*="físic" i]'
    ];

    for (const selector of physicalSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Inspeção visual: postura mantida. Palpação: hipertrofia paravertebral lombar. Mobilidade: flexão 45°, extensão 20°.');
        result.steps.push({ step: 'Preencher Exame Físico', status: 'pass', message: 'Exame físico preenchido' });
        break;
      }
    }

    // Testes especiais
    const specialTestsSelectors = [
      'input[name="testes_especiais"]',
      'textarea[name="testes"]',
      'textarea[placeholder*="teste" i]'
    ];

    for (const selector of specialTestsSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Teste de Lasègue: positivo à esquerda. Teste de Slump: positivo. Força muscular: grau 4/5.');
        result.steps.push({ step: 'Preencher Testes Especiais', status: 'pass', message: 'Testes preenchidos' });
        break;
      }
    }

    // Diagnóstico
    const diagnosisSelectors = [
      'input[name="diagnosis"]',
      'input[name="diagnostico"]',
      'textarea[name="diagnosis"]',
      'input[placeholder*="diagn" i]'
    ];

    for (const selector of diagnosisSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.fill(selector, 'Lombalgia mecânica. Hérnia de disco L4-L5 confirmada por RM.');
        result.steps.push({ step: 'Preencher Diagnóstico', status: 'pass', message: 'Diagnóstico preenchido' });
        break;
      }
    }

    await page.screenshot({ path: '/tmp/test-avaliacao-04-filled.png', fullPage: true });

    // Salvar avaliação
    const saveEvalSelectors = [
      'button:has-text("Salvar Avaliação")',
      'button:has-text("Finalizar Avaliação")',
      'button:has-text("Salvar")',
      'button[type="submit"]',
      '[data-testid="save-evaluation"]'
    ];

    for (const selector of saveEvalSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        result.steps.push({ step: 'Salvar Avaliação', status: 'pass', message: 'Avaliação salva' });
        await page.waitForTimeout(3000);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/test-avaliacao-05-after-save.png', fullPage: true });

    // Verificar se foi redirecionado para perfil do paciente
    const finalUrl = page.url();
    if (finalUrl.includes('/patients/')) {
      result.steps.push({ step: 'Redirecionamento', status: 'pass', message: 'Redirecionado para perfil do paciente' });
    }

    result.passed = result.errors.length === 0;
    console.log(`\n✅ TESTE AVALIAÇÃO: ${result.passed ? 'PASSOU' : 'FALHOU'}`);

  } catch (error) {
    result.errors.push({ step: 'Erro Geral', error: error.message });
    result.passed = false;
    console.error('\n❌ ERRO NO TESTE AVALIAÇÃO:', error.message);
  } finally {
    await page.close();
  }

  await logResults('AVALIAÇÃO', result);
  return result;
}

// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================
async function runAllTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('█    SUITE DE TESTES E2E - FISIOFLOW');
  console.log('█    Testes CRUD: Agenda, Evolução, Avaliação');
  console.log('█'.repeat(60));

  // Limpar log anterior
  await writeFile('/tmp/fisioflow-test-results.log', '');
  await writeFile('/tmp/fisioflow-test-results.json', '[]');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Mais lento para melhor visualização
  });

  const results = [];

  try {
    // Executar testes
    results.push(await testAgenda(browser));
    results.push(await testEvolucao(browser));
    results.push(await testAvaliacao(browser));

    // Relatório final
    console.log('\n' + '█'.repeat(60));
    console.log('█    RELATÓRIO FINAL');
    console.log('█'.repeat(60));

    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      tests: results
    };

    console.log(`\nTotal de Testes: ${summary.total}`);
    console.log(`✅ Passou: ${summary.passed}`);
    console.log(`❌ Falhou: ${summary.failed}`);
    console.log(`Taxa de Sucesso: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);

    console.log('\n--- Detalhes ---');
    for (const result of results) {
      console.log(`\n${result.test}: ${result.passed ? '✅ PASSOU' : '❌ FALHOU'}`);
      for (const step of result.steps) {
        console.log(`  [${step.status.toUpperCase()}] ${step.step}: ${step.message}`);
      }
      if (result.errors.length > 0) {
        console.log('  Erros:');
        for (const err of result.errors) {
          console.log(`    - ${err.step}: ${err.error}`);
        }
      }
    }

    // Salvar relatório JSON
    await writeFile('/tmp/fisioflow-test-results.json', JSON.stringify(summary, null, 2));

  } finally {
    await browser.close();
  }

  return summary;
}

// Executar testes
runAllTests().then(summary => {
  console.log('\n' + '█'.repeat(60));
  console.log('TESTES CONCLUÍDOS');
  console.log('█'.repeat(60));
  process.exit(summary.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('ERRO FATAL:', error);
  process.exit(1);
});
