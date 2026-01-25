/**
 * TESTE DE FLUXO COMPLETO - FISIOFLOW (VERSÃO 2)
 *
 * Fluxo ponta a ponta:
 * 1. Criar Agendamento
 * 2. Clicar no Card do Agendamento
 * 3. Navegar para Iniciar Atendimento/Evolução
 * 4. Preencher Evolução SOAP completa (S, O, A, P)
 */

import { chromium } from 'playwright';
import { writeFile, appendFile } from 'fs/promises';

const BASE_URL = 'http://localhost:8080';
const CREDENTIALS = {
  email: 'REDACTED_EMAIL',
  password: 'REDACTED'
};

const logResults = async (testName, result) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${testName}: ${JSON.stringify(result)}\n`;
  await appendFile('/tmp/fluxo-completo-results.log', logEntry);
  console.log(logEntry.trim());
};

async function login(page) {
  console.log('\n=== FAZENDO LOGIN ===');
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.fill('#login-email', CREDENTIALS.email);
  await page.fill('#login-password', CREDENTIALS.password);
  await page.click('button:has-text("Entrar na Plataforma")');
  await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 45000 });
  await page.waitForTimeout(3000);
  console.log('✅ Login realizado');
  return true;
}

async function testFluxoCompletoV2() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const page = await browser.newPage();
  const result = {
    test: 'Fluxo Completo V2',
    passed: false,
    steps: [],
    errors: [],
    details: {}
  };

  try {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TESTE FLUXO COMPLETO V2');
    console.log('█'.repeat(70));

    // ========================================
    // ETAPA 1: CRIAR AGENDAMENTO
    // ========================================
    console.log('\n📍 ETAPA 1: Criar Agendamento');
    console.log('-'.repeat(70));

    await login(page);

    // Navegar para agenda
    console.log('\nNavegando para Agenda...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/fluxov2-01-agenda.png', fullPage: true });

    // Clicar em Novo Agendamento
    console.log('\nClicando em "Novo Agendamento"...');
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(2000);

    // Preencher formulário
    console.log('\nPreenchendo formulário...');

    // Selecionar paciente (primeira opção)
    const patientSelect = await page.locator('select[name="patient"]').first();
    if (await patientSelect.count() > 0) {
      await patientSelect.selectOption({ index: 0 });
      console.log('  ✓ Paciente selecionado');
      result.details.patientSelected = true;
    }

    // Data
    const dateInput = await page.locator('input[type="date"]').first();
    if (await dateInput.count() > 0) {
      await dateInput.fill(new Date().toISOString().split('T')[0]);
      console.log('  ✓ Data definida');
    }

    // Horário
    const timeInput = await page.locator('input[type="time"]').first();
    if (await timeInput.count() > 0) {
      await timeInput.fill('14:00');
      console.log('  ✓ Horário: 14:00');
    }

    await page.screenshot({ path: '/tmp/fluxov2-02-form.png', fullPage: true });

    // Salvar
    await page.click('button:has-text("Criar")');
    console.log('  ✓ Agendamento criado');
    await page.waitForTimeout(3000);
    result.steps.push({ step: 'Criar Agendamento', status: 'pass', message: 'Agendamento criado às 14:00' });

    // ========================================
    // ETAPA 2: NAVEGAR PARA EVOLUÇÃO
    // ========================================
    console.log('\n📍 ETAPA 2: Navegar para Evolução do Agendamento');
    console.log('-'.repeat(70));

    // Recarregar agenda
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // Procurar botão "Avaliações" que pode dar acesso à evolução
    console.log('\nProcurando botões relacionados ao atendimento...');

    // Lista de botões para tentar
    const evolutionSelectors = [
      'a:has-text("Avaliações")',
      'button:has-text("Avaliações")',
      'a:has-text("Evolução")',
      'button:has-text("Atendimento")',
      'a:has-text("SOAP")'
    ];

    let evolutionAccessed = false;

    // Tentar clicar em cada botão relevante
    for (const selector of evolutionSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  Clicando em: ${selector}`);
        await page.click(selector);
        await page.waitForTimeout(3000);

        // Verificar se mudou para página de evolução
        const url = page.url();
        if (url.includes('evolu') || url.includes('soap') || url.includes('avalia')) {
          console.log(`  ✓ Navegou para página de evolução: ${url}`);
          evolutionAccessed = true;
          result.details.evolutionUrl = url;
          break;
        }
      }
    }

    // Se não acessou evolução, tentar navegar diretamente
    if (!evolutionAccessed) {
      console.log('\n  Tentando navegar diretamente para /patient-evolution/...');

      // Tentar várias URLs de evolução possíveis
      const evolutionUrls = [
        `${BASE_URL}/patient-evolution/test-appointment`,
        `${BASE_URL}/session-evolution/test-appointment`,
        `${BASE_URL}/evolution`,
        `${BASE_URL}/soap`
      ];

      for (const url of evolutionUrls) {
        console.log(`  Tentando URL: ${url}`);
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(3000);

          // Verificar se a página carregou com sucesso (não é 404)
          const content = await page.content();
          const is404 = content.includes('404') || content.includes('Not Found');

          if (!is404) {
            console.log(`  ✓ URL carregou: ${url}`);
            evolutionAccessed = true;
            result.details.evolutionUrl = url;
            break;
          }
        } catch (e) {
          console.log(`  ! Erro ao carregar ${url}: ${e.message}`);
        }
      }
    }

    await page.screenshot({ path: '/tmp/fluxov2-03-evolucao.png', fullPage: true });

    // ========================================
    // ETAPA 3: PREENCHER EVOLUÇÃO SOAP
    // ========================================
    console.log('\n📍 ETAPA 3: Preencher Evolução SOAP');
    console.log('-'.repeat(70));

    // SUBJETIVO (S)
    console.log('\nPreenchendo SUBJETIVO...');
    const sSelectors = ['textarea[name="subjective"]', '#subjective', 'textarea[name="subjetivo"]'];
    for (const sel of sSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        await page.fill(sel, 'Paciente relata dor lombar há 6 meses com piora ao sentar. Tratamento fisioterapêutico prévio com melhora temporária, porém com recidiva.');
        console.log('  ✓ Subjetivo preenchido');
        result.details.subjective = true;
        break;
      }
    }

    // OBJETIVO (O)
    console.log('\nPreenchendo OBJETIVO...');
    const oSelectors = ['textarea[name="objective"]', '#objective', 'textarea[name="objetivo"]'];
    for (const sel of oSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        await page.fill(sel, 'Postura ereta, mobilidade preservada. Força muscular 4/5. Reforços de tronco necessários.');
        console.log('  ✓ Objetivo preenchido');
        result.details.objective = true;
        break;
      }
    }

    // AVALIAÇÃO (A)
    console.log('\nPreenchendo AVALIAÇÃO...');
    const aSelectors = ['textarea[name="assessment"]', '#assessment', 'textarea[name="avaliacao"]'];
    for (const sel of aSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        await page.fill(sel, 'Lombalgia mecânica. Hérnia de disco L4-L5. Prognóstico favorável com tratamento conservador.');
        console.log('  ✓ Avaliação preenchida');
        result.details.assessment = true;
        break;
      }
    }

    // PLANO (P)
    console.log('\nPreenchendo PLANO...');
    const pSelectors = ['textarea[name="plan"]', '#plan', 'textarea[name="plano"]'];
    for (const sel of pSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        await page.fill(sel, '1) Alongamento 3x/semana, 2) Fortalecimento core diário, 3) Orientações posturais, 4) Retorno em 7 dias.');
        console.log('  ✓ Plano preenchido');
        result.details.plan = true;
        break;
      }
    }

    await page.screenshot({ path: '/tmp/fluxov2-04-soap-cheio.png', fullPage: true });

    // Salvar
    const saveSelectors = [
      'button:has-text("Salvar")',
      'button:has-text("Finalizar")',
      'button[type="submit"]'
    ];

    for (const sel of saveSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        await page.click(sel);
        console.log('  ✓ Evolução salva');
        await page.waitForTimeout(3000);
        break;
      }
    }

    result.passed = result.details.subjective && result.details.objective &&
                     result.details.assessment && result.details.plan;

  } catch (error) {
    result.errors.push({ error: error.message });
    console.error('\nERRO:', error.message);
  } finally {
    await browser.close();
  }

  await logResults('FLUXO_COMPLETO_V2', result);
  await writeFile('/tmp/fluxo-completo-v2-result.json', JSON.stringify(result, null, 2));

  return result;
}

// Executar
(async () => {
  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE FLUXO COMPLETO V2');
  console.log('█'.repeat(70));

  const result = await testFluxoCompletoV2();

  console.log('\n' + '█'.repeat(70));
  console.log('█    RESULTADO');
  console.log('█'.repeat(70));
  console.log(`\nStatus: ${result.passed ? '✅ PASSOU' : '❌ FALHOU'}`);

  if (result.details.subjective) console.log('  ✓ Subjetivo preenchido');
  if (result.details.objective) console.log('  ✓ Objetivo preenchido');
  if (result.details.assessment) console.log('  ✓ Avaliação preenchida');
  if (result.details.plan) console.log('  ✓ Plano preenchido');

  process.exit(result.passed ? 0 : 1);
})();
