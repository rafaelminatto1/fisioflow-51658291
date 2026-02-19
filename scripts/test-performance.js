/**
 * Script de teste de performance para a página de evolução do paciente
 * Executa testes automatizados e coleta métricas
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:5174';
const PERFORMANCE_RESULTS = [];

// Configurações de rede para simular diferentes condições
const NETWORK_PROFILES = {
  'Fast 3G': {
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    latency: 40
  },
  'Slow 3G': {
    downloadThroughput: 500 * 1024 / 8,
    uploadThroughput: 500 * 1024 / 8,
    latency: 400
  },
  'WiFi': {
    downloadThroughput: 30 * 1024 * 1024 / 8,
    uploadThroughput: 15 * 1024 * 1024 / 8,
    latency: 2
  }
};

async function testPerformance(networkProfile = 'WiFi') {
  console.log(`\n🚀 Iniciando teste de performance com ${networkProfile}...\n`);
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Configurar condições de rede
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      ...NETWORK_PROFILES[networkProfile]
    });

    // Coletar métricas de performance
    const metrics = {
      networkProfile,
      timestamp: new Date().toISOString(),
      consoleMessages: [],
      performanceMetrics: {},
      coreWebVitals: {}
    };

    // Capturar mensagens do console
    page.on('console', msg => {
      const text = msg.text();
      metrics.consoleMessages.push({
        type: msg.type(),
        text: text
      });
      
      // Exibir mensagens importantes
      if (text.includes('Performance') || text.includes('Core Web Vitals') || 
          text.includes('⚠️') || text.includes('✅')) {
        console.log(`[Console ${msg.type()}]:`, text);
      }
    });

    // Navegar para a página inicial
    console.log('📍 Navegando para a página inicial...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2' });
    
    // Aguardar um pouco para ver se há login necessário
    await page.waitForTimeout(2000);

    // Verificar se precisa fazer login
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('🔐 Página de login detectada. Por favor, faça login manualmente.');
      console.log('⏳ Aguardando 30 segundos para login manual...');
      await page.waitForTimeout(30000);
    }

    // Tentar encontrar um link para página de evolução
    console.log('🔍 Procurando página de evolução do paciente...');
    
    // Aguardar navegação ou encontrar link
    await page.waitForTimeout(2000);
    
    // Tentar encontrar um agendamento ou paciente
    const evolutionLink = await page.$('a[href*="/patient-evolution"]');
    
    if (evolutionLink) {
      console.log('✅ Link de evolução encontrado, navegando...');
      
      // Marcar início da navegação
      const navigationStart = Date.now();
      
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        evolutionLink.click()
      ]);
      
      const navigationTime = Date.now() - navigationStart;
      metrics.performanceMetrics.navigationTime = navigationTime;
      
      console.log(`⏱️  Tempo de navegação: ${navigationTime}ms`);
      
      // Aguardar carregamento completo
      await page.waitForTimeout(3000);
      
      // Coletar Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {};
          
          // Tentar obter métricas do PerformanceObserver
          if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                vitals[entry.name] = entry.value;
              }
            });
            
            try {
              observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
            } catch (e) {
              console.log('PerformanceObserver error:', e);
            }
          }
          
          // Obter métricas de performance
          const perfData = performance.getEntriesByType('navigation')[0];
          if (perfData) {
            vitals.domContentLoaded = perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;
            vitals.loadComplete = perfData.loadEventEnd - perfData.loadEventStart;
            vitals.domInteractive = perfData.domInteractive;
          }
          
          setTimeout(() => resolve(vitals), 2000);
        });
      });
      
      metrics.coreWebVitals = webVitals;
      
      console.log('\n📊 Core Web Vitals:');
      Object.entries(webVitals).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}ms`);
      });
      
      // Testar troca de abas
      console.log('\n🔄 Testando troca de abas...');
      const tabs = await page.$$('[role="tab"]');
      
      if (tabs.length > 0) {
        for (let i = 0; i < Math.min(tabs.length, 5); i++) {
          const tabSwitchStart = Date.now();
          await tabs[i].click();
          await page.waitForTimeout(1000);
          const tabSwitchTime = Date.now() - tabSwitchStart;
          console.log(`   Aba ${i + 1}: ${tabSwitchTime}ms`);
        }
      }
      
      // Verificar skeleton loaders
      console.log('\n🎨 Verificando skeleton loaders...');
      const skeletons = await page.$$('[role="status"]');
      console.log(`   Skeleton loaders encontrados: ${skeletons.length}`);
      
    } else {
      console.log('⚠️  Nenhum link de evolução encontrado na página atual.');
      console.log('💡 Navegue manualmente para uma página de evolução do paciente.');
      console.log('⏳ Aguardando 60 segundos para navegação manual...');
      await page.waitForTimeout(60000);
    }

    // Coletar métricas finais
    const finalMetrics = await page.metrics();
    metrics.performanceMetrics = { ...metrics.performanceMetrics, ...finalMetrics };
    
    console.log('\n📈 Métricas de Performance:');
    console.log(`   JSHeapUsedSize: ${(finalMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Nodes: ${finalMetrics.Nodes}`);
    console.log(`   LayoutCount: ${finalMetrics.LayoutCount}`);
    console.log(`   RecalcStyleCount: ${finalMetrics.RecalcStyleCount}`);
    
    PERFORMANCE_RESULTS.push(metrics);
    
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await browser.close();
  }
}

async function runAllTests() {
  console.log('🎯 Iniciando bateria de testes de performance\n');
  console.log('=' .repeat(60));
  
  // Testar com WiFi (rápido)
  await testPerformance('WiFi');
  
  // Testar com Fast 3G
  await testPerformance('Fast 3G');
  
  // Testar com Slow 3G
  await testPerformance('Slow 3G');
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Todos os testes concluídos!\n');
  
  // Salvar resultados
  const fs = await import('fs');
  fs.writeFileSync(
    'performance-test-results.json',
    JSON.stringify(PERFORMANCE_RESULTS, null, 2)
  );
  
  console.log('💾 Resultados salvos em: performance-test-results.json');
}

// Executar testes
runAllTests().catch(console.error);
