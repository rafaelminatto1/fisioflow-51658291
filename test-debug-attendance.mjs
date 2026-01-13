import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  
  const logs = [];
  const networkLogs = [];
  
  // Capturar logs do console
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      message: msg.text(),
      timestamp: Date.now()
    };
    logs.push(logEntry);
    console.log(`[${logEntry.type.toUpperCase()}]`, logEntry.message);
  });
  
  // Capturar erros
  page.on('pageerror', error => {
    logs.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
    console.error('[PAGE ERROR]', error.message);
  });
  
  // Capturar requisições de rede
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') || url.includes('7242') || url.includes('appointment') || url.includes('patient')) {
      networkLogs.push({
        url,
        method: request.method(),
        timestamp: Date.now()
      });
    }
  });
  
  // Capturar respostas
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('7242') || url.includes('appointment') || url.includes('patient')) {
      const status = response.status();
      let body = null;
      try {
        body = await response.text();
      } catch (e) {
        // Ignorar erros ao ler body
      }
      
      const existingLog = networkLogs.find(log => log.url === url && !log.status);
      if (existingLog) {
        existingLog.status = status;
        existingLog.body = body?.substring(0, 500); // Limitar tamanho
      } else {
        networkLogs.push({
          url,
          method: response.request().method(),
          status,
          body: body?.substring(0, 500),
          timestamp: Date.now()
        });
      }
    }
  });
  
  try {
    const baseUrl = 'http://localhost:8082';
    
    console.log('1. Navegando para login...');
    await page.goto(`${baseUrl}/auth/login`);
    await page.waitForTimeout(2000);
    
    console.log('2. Fazendo login...');
    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('3. Login completo!');
    
    console.log('4. Navegando para agenda...');
    await page.goto(`${baseUrl}/schedule`);
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'screenshots/debug-agenda.png', fullPage: true });
    console.log('5. Agenda carregada, procurando agendamentos...');
    
    // Procurar botão "Iniciar atendimento" de várias formas
    const selectors = [
      'button:has-text("Iniciar atendimento")',
      'button:has-text("Iniciar")',
      '[data-appointment-id]',
      '.appointment-card',
      'button[aria-label*="Iniciar"]'
    ];
    
    let found = false;
    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      console.log(`   Tentando "${selector}": ${elements.length} elementos`);
      
      if (elements.length > 0) {
        const first = elements[0];
        const text = await first.textContent();
        const isVisible = await first.isVisible();
        
        console.log(`   Elemento encontrado: "${text}", visível: ${isVisible}`);
        
        if (isVisible && (text?.includes('Iniciar') || selector.includes('appointment'))) {
          if (!text?.includes('Iniciar')) {
            // É um card, clicar para abrir modal
            console.log('   Clicando no card...');
            await first.click();
            await page.waitForTimeout(2000);
            
            // Procurar botão no modal
            const modalButton = page.locator('button:has-text("Iniciar")').first();
            if (await modalButton.isVisible({ timeout: 2000 })) {
              console.log('   Botão encontrado no modal!');
              await modalButton.click();
              found = true;
              break;
            }
          } else {
            // É o botão direto
            console.log('   Clicando no botão...');
            await first.click();
            found = true;
            break;
          }
        }
      }
    }
    
    if (!found) {
      console.error('❌ Botão não encontrado!');
      await page.screenshot({ path: 'screenshots/debug-not-found.png', fullPage: true });
    } else {
      console.log('6. Botão clicado! Aguardando navegação...');
      await page.waitForTimeout(5000);
      
      const currentUrl = page.url();
      console.log(`7. URL atual: ${currentUrl}`);
      
      await page.screenshot({ path: 'screenshots/debug-after-click.png', fullPage: true });
      
      // Aguardar mais para carregar
      await page.waitForTimeout(5000);
      
      const pageContent = await page.content();
      const hasError = pageContent.includes('Agendamento não encontrado') || 
                       pageContent.includes('Ops! Algo deu errado') ||
                       pageContent.includes('ID do agendamento não fornecido');
      
      const hasLoading = pageContent.includes('Carregando dados do paciente');
      
      console.log(`8. Estado da página:`);
      console.log(`   - Tem erro? ${hasError}`);
      console.log(`   - Ainda carregando? ${hasLoading}`);
      console.log(`   - URL: ${currentUrl}`);
      
      await page.screenshot({ path: 'screenshots/debug-final.png', fullPage: true });
      
      // Filtrar logs relevantes
      const relevantLogs = logs.filter(log => 
        log.type === 'error' || 
        log.type === 'warning' || 
        log.message.includes('[DEBUG]') ||
        log.message.includes('appointment') ||
        log.message.includes('patient') ||
        log.message.includes('useAppointmentData')
      );
      
      const relevantNetwork = networkLogs.filter(log => 
        log.url.includes('appointment') || 
        log.url.includes('patient') ||
        log.url.includes('7242')
      );
      
      const debugData = {
        timestamp: new Date().toISOString(),
        url: currentUrl,
        hasError,
        hasLoading,
        logs: relevantLogs,
        networkLogs: relevantNetwork,
        allLogs: logs,
        allNetworkLogs: networkLogs
      };
      
      writeFileSync('screenshots/debug-complete-data.json', JSON.stringify(debugData, null, 2));
      console.log('9. Dados salvos em screenshots/debug-complete-data.json');
      
      if (hasError) {
        console.error('❌ ERRO: Página mostra erro!');
      } else if (currentUrl.includes('/patient-evolution/')) {
        console.log('✅ Navegou para página de evolução!');
      } else {
        console.warn('⚠️ Não navegou para página de evolução');
      }
    }
    
    // Manter aberto por 10 segundos para inspeção
    console.log('Aguardando 10 segundos antes de fechar...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await page.screenshot({ path: 'screenshots/debug-error.png', fullPage: true });
    
    const errorData = {
      error: error.message,
      stack: error.stack,
      logs,
      networkLogs,
      url: page.url()
    };
    writeFileSync('screenshots/debug-error-data.json', JSON.stringify(errorData, null, 2));
  } finally {
    await browser.close();
  }
})();
