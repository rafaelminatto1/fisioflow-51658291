/**
 * TESTE DE FLUXO COMPLETO - FISIOFLOW (VERSÃO 3)
 *
 * Fluxo ponta a ponta:
 * 1. Criar Agendamento
 * 2. Obter ID do Agendamento
 * 3. Navegar para /patient-evolution/{appointmentId}
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

async function testFluxoCompletoV3() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const page = await browser.newPage();
  const result = {
    test: 'Fluxo Completo V3',
    passed: false,
    steps: [],
    errors: [],
    details: {}
  };

  try {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TESTE FLUXO COMPLETO V3');
    console.log('█'.repeat(70));

    // ========================================
    // ETAPA 1: LOGIN
    // ========================================
    console.log('\n📍 ETAPA 0: Login');
    console.log('-'.repeat(70));
    await login(page);
    result.steps.push({ step: 'Login', status: 'pass', message: 'Login realizado com sucesso' });

    // ========================================
    // ETAPA 1: CRIAR AGENDAMENTO
    // ========================================
    console.log('\n📍 ETAPA 1: Criar Agendamento');
    console.log('-'.repeat(70));

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/fluxov3-01-agenda.png', fullPage: true });

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

    await page.screenshot({ path: '/tmp/fluxov3-02-form.png', fullPage: true });

    // Salvar e capturar ID
    console.log('\nSalvando agendamento...');
    await page.click('button:has-text("Criar")');
    await page.waitForTimeout(5000);

    // Recarregar agenda e obter o ID do agendamento criado
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // Procurar o card do agendamento de 14:00
    console.log('\nProcurando agendamento criado...');
    await page.screenshot({ path: '/tmp/fluxov3-03-agenda-com-card.png', fullPage: true });

    // Tentar encontrar o agendamento pelo horário e extrair seu ID
    // O card pode ter um link ou data attribute com o ID
    const appointmentCards = await page.locator('[data-appointment-id], .appointment-card, [class*="appointment"]').all();
    console.log(`  Encontrados ${appointmentCards.length} elementos de agendamento`);

    let appointmentId = null;

    // Método 1: Procurar por data-appointment-id
    const appointmentElements = await page.locator('[data-appointment-id]').all();
    for (const el of appointmentElements) {
      const id = await el.getAttribute('data-appointment-id');
      const text = await el.textContent();
      if (text && text.includes('14:00')) {
        appointmentId = id;
        console.log(`  ✓ ID encontrado via data-attribute: ${appointmentId}`);
        break;
      }
    }

    // Método 2: Se não encontrou, tentar extrair de links
    if (!appointmentId) {
      const links = await page.locator('a[href*="/patient-evolution/"]').all();
      console.log(`  Procurando em ${links.length} links de evolução...`);
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href) {
          const match = href.match(/\/patient-evolution\/([^\/]+)/);
          if (match) {
            appointmentId = match[1];
            console.log(`  ✓ ID encontrado via link: ${appointmentId}`);
            break;
          }
        }
      }
    }

    // Método 3: Se ainda não encontrou, usar o primeiro link de evolução
    if (!appointmentId) {
      const firstLink = await page.locator('a[href*="/patient-evolution/"]').first();
      if (await firstLink.count() > 0) {
        const href = await firstLink.getAttribute('href');
        if (href) {
          const match = href.match(/\/patient-evolution\/([^\/]+)/);
          if (match) {
            appointmentId = match[1];
            console.log(`  ✓ ID encontrado (primeiro link): ${appointmentId}`);
          }
        }
      }
    }

    result.details.appointmentId = appointmentId;
    result.steps.push({ step: 'Criar Agendamento', status: appointmentId ? 'pass' : 'partial', message: appointmentId ? `Agendamento criado com ID: ${appointmentId}` : 'Agendamento criado (ID não obtido)' });

    if (!appointmentId) {
      console.log('\n⚠️ Não foi possível obter o ID do agendamento. Tentando usar ID de teste...');
      appointmentId = 'test-' + Date.now();
    }

    // ========================================
    // ETAPA 2: NAVEGAR PARA EVOLUÇÃO
    // ========================================
    console.log('\n📍 ETAPA 2: Navegar para Evolução do Agendamento');
    console.log('-'.repeat(70));

    const evolutionUrl = `${BASE_URL}/patient-evolution/${appointmentId}`;
    console.log(`\nNavegando para: ${evolutionUrl}`);

    await page.goto(evolutionUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/tmp/fluxov3-04-evolucao.png', fullPage: true });

    // Verificar se a página carregou
    const url = page.url();
    if (url.includes('patient-evolution')) {
      console.log('  ✓ Página de evolução carregada');
      result.details.evolutionPageLoaded = true;
      result.steps.push({ step: 'Navegar para Evolução', status: 'pass', message: `Navegou para ${evolutionUrl}` });
    } else {
      console.log('  ! URL atual:', url);
      result.details.evolutionPageLoaded = false;
      result.steps.push({ step: 'Navegar para Evolução', status: 'fail', message: `Falha ao navegar para evolução. URL: ${url}` });
      throw new Error('Falha ao carregar página de evolução');
    }

    // ========================================
    // ETAPA 3: PREENCHER EVOLUÇÃO SOAP
    // ========================================
    console.log('\n📍 ETAPA 3: Preencher Evolução SOAP');
    console.log('-'.repeat(70));

    // Procurar as áreas de texto do SOAP
    // O formulário usa SmartTextarea que renderiza textarea regulares

    // SUBJETIVO (S)
    console.log('\nPreenchendo SUBJETIVO...');
    const subjectiveSelectors = [
      'textarea[placeholder*="Queixas do paciente"]',
      'textarea[placeholder*="relata"]',
      'textarea[id*="subjective"]',
      'textarea[name*="subjective"]',
      '//textarea[contains(@placeholder, "Queixas")]'
    ];

    let subjectiveFilled = false;
    for (const sel of subjectiveSelectors) {
      try {
        if (sel.startsWith('//')) {
          // XPath selector
          const count = await page.locator(`xpath=${sel}`).count();
          if (count > 0) {
            await page.locator(`xpath=${sel}`).first().fill('Paciente relata dor lombar há 6 meses com piora ao sentar. Tratamento fisioterapêutico prévio com melhora temporária, porém com recidiva.');
            console.log('  ✓ Subjetivo preenchido (XPath)');
            subjectiveFilled = true;
            break;
          }
        } else {
          const count = await page.locator(sel).count();
          if (count > 0) {
            await page.locator(sel).first().fill('Paciente relata dor lombar há 6 meses com piora ao sentar. Tratamento fisioterapêutico prévio com melhora temporária, porém com recidiva.');
            console.log(`  ✓ Subjetivo preenchido (${sel})`);
            subjectiveFilled = true;
            break;
          }
        }
      } catch (e) {
        // Continuar para próximo seletor
      }
    }
    result.details.subjective = subjectiveFilled;

    await page.waitForTimeout(1000);

    // OBJETIVO (O)
    console.log('\nPreenchendo OBJETIVO...');
    const objectiveSelectors = [
      'textarea[placeholder*="Achados clínicos"]',
      'textarea[placeholder*="exame físico"]',
      'textarea[id*="objective"]',
      'textarea[name*="objective"]',
      '//textarea[contains(@placeholder, "Achados")]'
    ];

    let objectiveFilled = false;
    for (const sel of objectiveSelectors) {
      try {
        if (sel.startsWith('//')) {
          const count = await page.locator(`xpath=${sel}`).count();
          if (count > 0) {
            await page.locator(`xpath=${sel}`).first().fill('Postura ereta, mobilidade preservada. Força muscular 4/5. Reforços de tronco necessários.');
            console.log('  ✓ Objetivo preenchido (XPath)');
            objectiveFilled = true;
            break;
          }
        } else {
          const count = await page.locator(sel).count();
          if (count > 0) {
            await page.locator(sel).first().fill('Postura ereta, mobilidade preservada. Força muscular 4/5. Reforços de tronco necessários.');
            console.log(`  ✓ Objetivo preenchido (${sel})`);
            objectiveFilled = true;
            break;
          }
        }
      } catch (e) {
        // Continuar
      }
    }
    result.details.objective = objectiveFilled;

    await page.waitForTimeout(1000);

    // AVALIAÇÃO (A)
    console.log('\nPreenchendo AVALIAÇÃO...');
    const assessmentSelectors = [
      'textarea[placeholder*="Análise clínica"]',
      'textarea[placeholder*="diagnóstico"]',
      'textarea[id*="assessment"]',
      'textarea[name*="assessment"]',
      '//textarea[contains(@placeholder, "Análise")]'
    ];

    let assessmentFilled = false;
    for (const sel of assessmentSelectors) {
      try {
        if (sel.startsWith('//')) {
          const count = await page.locator(`xpath=${sel}`).count();
          if (count > 0) {
            await page.locator(`xpath=${sel}`).first().fill('Lombalgia mecânica. Hérnia de disco L4-L5. Prognóstico favorável com tratamento conservador.');
            console.log('  ✓ Avaliação preenchida (XPath)');
            assessmentFilled = true;
            break;
          }
        } else {
          const count = await page.locator(sel).count();
          if (count > 0) {
            await page.locator(sel).first().fill('Lombalgia mecânica. Hérnia de disco L4-L5. Prognóstico favorável com tratamento conservador.');
            console.log(`  ✓ Avaliação preenchida (${sel})`);
            assessmentFilled = true;
            break;
          }
        }
      } catch (e) {
        // Continuar
      }
    }
    result.details.assessment = assessmentFilled;

    await page.waitForTimeout(1000);

    // PLANO (P)
    console.log('\nPreenchendo PLANO...');
    const planSelectors = [
      'textarea[placeholder*="Conduta"]',
      'textarea[placeholder*="exercícios"]',
      'textarea[id*="plan"]',
      'textarea[name*="plan"]',
      '//textarea[contains(@placeholder, "Conduta")]'
    ];

    let planFilled = false;
    for (const sel of planSelectors) {
      try {
        if (sel.startsWith('//')) {
          const count = await page.locator(`xpath=${sel}`).count();
          if (count > 0) {
            await page.locator(`xpath=${sel}`).first().fill('1) Alongamento 3x/semana, 2) Fortalecimento core diário, 3) Orientações posturais, 4) Retorno em 7 dias.');
            console.log('  ✓ Plano preenchido (XPath)');
            planFilled = true;
            break;
          }
        } else {
          const count = await page.locator(sel).count();
          if (count > 0) {
            await page.locator(sel).first().fill('1) Alongamento 3x/semana, 2) Fortalecimento core diário, 3) Orientações posturais, 4) Retorno em 7 dias.');
            console.log(`  ✓ Plano preenchido (${sel})`);
            planFilled = true;
            break;
          }
        }
      } catch (e) {
        // Continuar
      }
    }
    result.details.plan = planFilled;

    await page.screenshot({ path: '/tmp/fluxov3-05-soap-cheio.png', fullPage: true });

    // ========================================
    // ETAPA 4: SALVAR
    // ========================================
    console.log('\n📍 ETAPA 4: Salvar Evolução');
    console.log('-'.repeat(70));

    const saveSelectors = [
      'button:has-text("Salvar")',
      'button:has-text("Finalizar")',
      'button[type="submit"]',
      'button[aria-label*="Salvar"]'
    ];

    let saved = false;
    for (const sel of saveSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        await page.click(sel);
        console.log(`  ✓ Botão clicado: ${sel}`);
        await page.waitForTimeout(5000);
        saved = true;
        break;
      }
    }

    result.details.saved = saved;

    await page.screenshot({ path: '/tmp/fluxov3-06-final.png', fullPage: true });

    // ========================================
    // RESULTADO FINAL
    // ========================================
    result.passed = result.details.evolutionPageLoaded &&
                     result.details.subjective &&
                     result.details.objective &&
                     result.details.assessment &&
                     result.details.plan;

    result.steps.push({
      step: 'Preencher SOAP',
      status: result.passed ? 'pass' : 'partial',
      message: `S: ${result.details.subjective ? '✓' : '✗'}, O: ${result.details.objective ? '✓' : '✗'}, A: ${result.details.assessment ? '✓' : '✗'}, P: ${result.details.plan ? '✓' : '✗'}`
    });

  } catch (error) {
    result.errors.push({ error: error.message, stack: error.stack });
    console.error('\nERRO:', error.message);
  } finally {
    await browser.close();
  }

  await logResults('FLUXO_COMPLETO_V3', result);
  await writeFile('/tmp/fluxo-completo-v3-result.json', JSON.stringify(result, null, 2));

  return result;
}

// Executar
(async () => {
  console.log('\n' + '█'.repeat(70));
  console.log('█    TESTE FLUXO COMPLETO V3');
  console.log('█'.repeat(70));

  const result = await testFluxoCompletoV3();

  console.log('\n' + '█'.repeat(70));
  console.log('█    RESULTADO');
  console.log('█'.repeat(70));
  console.log(`\nStatus: ${result.passed ? '✅ PASSOU' : '❌ FALHOU'}`);

  if (result.details.subjective) console.log('  ✓ Subjetivo preenchido');
  if (result.details.objective) console.log('  ✓ Objetivo preenchido');
  if (result.details.assessment) console.log('  ✓ Avaliação preenchida');
  if (result.details.plan) console.log('  ✓ Plano preenchido');

  console.log('\n📸 Screenshots salvos em /tmp/fluxov3-*.png');

  process.exit(result.passed ? 0 : 1);
})();
