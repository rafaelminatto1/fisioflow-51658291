import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

test('debug iniciar atendimento - captura logs completos', async ({ page }) => {
  const logs: Array<{ type: string; message: string; timestamp: number }> = [];
  const networkLogs: Array<{ url: string; method: string; status?: number; error?: string }> = [];
  
  // Capturar todos os logs do console
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      message: msg.text(),
      timestamp: Date.now()
    };
    logs.push(logEntry);
    console.log(`[CONSOLE ${logEntry.type.toUpperCase()}]`, logEntry.message);
  });

  // Capturar erros de página
  page.on('pageerror', error => {
    const logEntry = {
      type: 'pageerror',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };
    logs.push(logEntry);
    console.error('[PAGE ERROR]', error.message);
  });

  // Capturar requisições de rede
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') || url.includes('7242')) {
      networkLogs.push({
        url,
        method: request.method(),
        timestamp: Date.now()
      });
    }
  });

  // Capturar respostas de rede
  page.on('response', response => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('7242')) {
      const existingLog = networkLogs.find(log => log.url === url && !log.status);
      if (existingLog) {
        existingLog.status = response.status();
      } else {
        networkLogs.push({
          url,
          method: response.request().method(),
          status: response.status(),
          timestamp: Date.now()
        });
      }
    }
  });

  try {
    // Ir para a página de login (usar porta 8082)
    const baseUrl = 'http://localhost:8082';
    console.log('1. Navegando para login...');
    await page.goto(`${baseUrl}/auth/login`);
    await page.waitForTimeout(1000);

    // Fazer login (usar credenciais do teste existente ou variáveis de ambiente)
    const email = process.env.TEST_EMAIL || 'rafael.minatto@yahoo.com.br';
    const password = process.env.TEST_PASSWORD || 'Yukari30@';
    
    console.log('2. Fazendo login...');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Esperar login completar
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('3. Login completo, navegando para agenda...');

    // Ir para agenda
    await page.goto(`${baseUrl}/schedule`);
    await page.waitForTimeout(3000);
    
    // Screenshot da agenda
    await page.screenshot({ path: 'screenshots/debug-agenda.png', fullPage: true });
    console.log('4. Agenda carregada, procurando agendamentos...');

    // Procurar agendamentos de várias formas
    const appointmentSelectors = [
      '[data-appointment-id]',
      '[data-testid*="appointment"]',
      '.appointment-card',
      'button:has-text("Iniciar")',
      'button:has-text("atendimento")',
      '[role="button"]:has-text("Iniciar")'
    ];

    let appointmentFound = false;
    let appointmentElement = null;

    for (const selector of appointmentSelectors) {
      const elements = await page.locator(selector).all();
      console.log(`   Tentando seletor "${selector}": ${elements.length} elementos encontrados`);
      
      if (elements.length > 0) {
        // Se encontrou botão direto, usar ele
        if (selector.includes('button') || selector.includes('Iniciar')) {
          appointmentElement = elements[0];
          appointmentFound = true;
          console.log(`   ✓ Botão encontrado com seletor: ${selector}`);
          break;
        }
        // Se encontrou card, clicar nele primeiro
        appointmentElement = elements[0];
        appointmentFound = true;
        console.log(`   ✓ Card de agendamento encontrado com seletor: ${selector}`);
        break;
      }
    }

    if (!appointmentFound) {
      // Tentar encontrar qualquer elemento clicável que contenha "iniciar" ou "atendimento"
      const allButtons = await page.locator('button, [role="button"], a').all();
      console.log(`   Total de botões/elementos clicáveis: ${allButtons.length}`);
      
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text && (text.toLowerCase().includes('iniciar') || text.toLowerCase().includes('atendimento'))) {
          appointmentElement = btn;
          appointmentFound = true;
          console.log(`   ✓ Botão encontrado pelo texto: "${text}"`);
          break;
        }
      }
    }

    if (!appointmentFound) {
      console.error('❌ Nenhum agendamento ou botão encontrado!');
      await page.screenshot({ path: 'screenshots/debug-no-appointment.png', fullPage: true });
      
      // Salvar logs
      const debugData = {
        logs,
        networkLogs,
        url: page.url(),
        html: await page.content()
      };
      writeFileSync('screenshots/debug-data.json', JSON.stringify(debugData, null, 2));
      
      throw new Error('Nenhum agendamento encontrado para testar');
    }

    // Se encontrou um card, clicar nele primeiro para abrir o modal
    if (appointmentElement && !(await appointmentElement.textContent())?.toLowerCase().includes('iniciar')) {
      console.log('5. Clicando no card do agendamento...');
      await appointmentElement.click();
      await page.waitForTimeout(2000);
      
      // Procurar botão "Iniciar atendimento" no modal
      const startButton = page.locator('button:has-text("Iniciar"), button:has-text("atendimento")').first();
      const isVisible = await startButton.isVisible({ timeout: 3000 });
      
      if (isVisible) {
        appointmentElement = startButton;
        console.log('   ✓ Botão "Iniciar atendimento" encontrado no modal');
      }
    }

    // Clicar no botão "Iniciar atendimento"
    console.log('6. Clicando em "Iniciar atendimento"...');
    await appointmentElement!.click();
    
    // Aguardar navegação
    await page.waitForTimeout(3000);
    
    // Verificar se navegou para a página de evolução
    const currentUrl = page.url();
    console.log(`7. URL atual após clique: ${currentUrl}`);
    
    const isEvolutionPage = currentUrl.includes('/patient-evolution/');
    console.log(`   É página de evolução? ${isEvolutionPage}`);

    // Screenshot após clicar
    await page.screenshot({ path: 'screenshots/debug-apos-click.png', fullPage: true });

    // Aguardar mais um pouco para carregar dados
    await page.waitForTimeout(5000);

    // Verificar se a página carregou corretamente
    const pageContent = await page.content();
    const hasError = pageContent.includes('Agendamento não encontrado') || 
                     pageContent.includes('Ops! Algo deu errado') ||
                     pageContent.includes('ID do agendamento não fornecido');
    
    const hasLoading = pageContent.includes('Carregando dados do paciente');
    const hasPatientName = await page.locator('h1, h2, [class*="patient"], [class*="name"]').count() > 0;

    console.log('8. Verificando estado da página:');
    console.log(`   - Tem erro? ${hasError}`);
    console.log(`   - Ainda carregando? ${hasLoading}`);
    console.log(`   - Tem nome do paciente? ${hasPatientName}`);

    // Capturar logs do console que começam com [DEBUG]
    const debugLogs = logs.filter(log => log.message.includes('[DEBUG]'));
    console.log(`   - Logs [DEBUG] encontrados: ${debugLogs.length}`);

    // Screenshot final
    await page.screenshot({ path: 'screenshots/debug-final.png', fullPage: true });

    // Salvar todos os logs para análise
    const debugData = {
      timestamp: new Date().toISOString(),
      url: currentUrl,
      isEvolutionPage,
      hasError,
      hasLoading,
      hasPatientName,
      logs: logs.filter(log => 
        log.type === 'error' || 
        log.type === 'warning' || 
        log.message.includes('[DEBUG]') ||
        log.message.includes('appointment') ||
        log.message.includes('patient')
      ),
      networkLogs: networkLogs.filter(log => 
        log.url.includes('appointment') || 
        log.url.includes('patient') ||
        log.url.includes('7242')
      ),
      consoleLogs: await page.evaluate(() => {
        // Capturar logs do console do navegador
        return (window as any).consoleLogs || [];
      })
    };

    writeFileSync('screenshots/debug-complete-data.json', JSON.stringify(debugData, null, 2));
    console.log('9. Dados de debug salvos em screenshots/debug-complete-data.json');

    // Verificar se funcionou
    if (hasError) {
      console.error('❌ ERRO: Página mostra mensagem de erro!');
      throw new Error('Página de evolução não carregou corretamente - mostra erro');
    }

    if (!isEvolutionPage) {
      console.error('❌ ERRO: Não navegou para página de evolução!');
      throw new Error(`URL incorreta: ${currentUrl}`);
    }

    if (hasLoading) {
      console.warn('⚠️ AVISO: Página ainda está carregando após 5 segundos');
    }

    console.log('✅ Teste concluído! Verifique os screenshots e logs para mais detalhes.');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    await page.screenshot({ path: 'screenshots/debug-error.png', fullPage: true });
    
    // Salvar logs mesmo em caso de erro
    const errorData = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      logs,
      networkLogs,
      url: page.url()
    };
    writeFileSync('screenshots/debug-error-data.json', JSON.stringify(errorData, null, 2));
    
    throw error;
  }
});
