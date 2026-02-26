import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true, slowMo: 0 });
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
    if (logEntry.message.includes('[DEBUG]') || logEntry.type === 'error') {
      console.log(`[${logEntry.type.toUpperCase()}]`, logEntry.message);
    }
  });
  
  // Capturar requisições/respostas do Supabase
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase') && (url.includes('appointment') || url.includes('patient'))) {
      const status = response.status();
      let body = null;
      try {
        body = await response.text();
      } catch (e) {}
      
      const data = {
        url: url.split('?')[0], // Remover query params
        status,
        method: response.request().method(),
        body: body ? JSON.parse(body) : null,
        timestamp: Date.now()
      };
      
      networkLogs.push(data);
      
      if (status !== 200 || (data.body && Array.isArray(data.body) && data.body.length === 0)) {
        console.log(`[NETWORK] ${status} ${data.method} ${url.split('/').pop()}`);
        if (data.body) {
          console.log('   Response:', JSON.stringify(data.body).substring(0, 200));
        }
      }
    }
  });
  
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    
    // Usar um appointmentId que vimos nos logs anteriores
    const appointmentId = process.env.APPOINTMENT_ID || 'bafc8096-eba2-446c-952c-fe73b05c7933';
    
    console.log(`Navegando diretamente para: ${baseUrl}/patient-evolution/${appointmentId}`);
    await page.goto(`${baseUrl}/patient-evolution/${appointmentId}`);
    
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`URL atual: ${currentUrl}`);
    
    await page.screenshot({ path: 'screenshots/direct-evolution.avif', fullPage: true });
    
    // Verificar conteúdo da página
    const pageContent = await page.content();
    const hasError = pageContent.includes('Agendamento não encontrado') || 
                     pageContent.includes('Ops! Algo deu errado') ||
                     pageContent.includes('ID do agendamento não fornecido');
    
    const hasLoading = pageContent.includes('Carregando dados do paciente');
    const hasPatientName = await page.locator('h1, h2, [class*="patient"], [class*="name"]').count() > 0;
    
    console.log('\nEstado da página:');
    console.log(`  - Tem erro? ${hasError}`);
    console.log(`  - Ainda carregando? ${hasLoading}`);
    console.log(`  - Tem nome do paciente? ${hasPatientName}`);
    
    // Filtrar logs relevantes
    const debugLogs = logs.filter(log => 
      log.message.includes('[DEBUG]') ||
      log.message.includes('useAppointmentData') ||
      log.message.includes('appointment') ||
      log.type === 'error'
    );
    
    console.log(`\nLogs [DEBUG] encontrados: ${debugLogs.length}`);
    debugLogs.forEach(log => {
      console.log(`  [${log.type}] ${log.message.substring(0, 150)}`);
    });
    
    console.log(`\nRequisições de rede: ${networkLogs.length}`);
    networkLogs.forEach(log => {
      console.log(`  ${log.status} ${log.method} -> ${log.url.split('/').pop()}`);
      if (log.body && Array.isArray(log.body) && log.body.length === 0) {
        console.log('    ⚠️ Array vazio retornado!');
      } else if (log.body && !Array.isArray(log.body) && !log.body.id) {
        console.log('    ⚠️ Objeto sem ID retornado!');
      }
    });
    
    // Salvar dados
    const debugData = {
      timestamp: new Date().toISOString(),
      url: currentUrl,
      appointmentId,
      hasError,
      hasLoading,
      hasPatientName,
      debugLogs,
      networkLogs,
      allLogs: logs.filter(l => l.type === 'error' || l.type === 'warning' || l.message.includes('[DEBUG]'))
    };
    
    writeFileSync('screenshots/direct-evolution-data.json', JSON.stringify(debugData, null, 2));
    console.log('\n✅ Dados salvos em screenshots/direct-evolution-data.json');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await page.screenshot({ path: 'screenshots/direct-evolution-error.avif', fullPage: true });
  } finally {
    await browser.close();
  }
})();
