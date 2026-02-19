/**
 * 🎯 Monitor de Performance para Console do Navegador
 * 
 * COMO USAR:
 * 1. Abra o DevTools (F12)
 * 2. Vá para a aba Console
 * 3. Copie e cole este código completo
 * 4. Pressione Enter
 * 5. Navegue pela aplicação e veja as métricas em tempo real
 */

(function() {
  console.clear();
  console.log('%c🎯 Monitor de Performance FisioFlow', 'font-size: 20px; font-weight: bold; color: #4CAF50;');
  console.log('%c═══════════════════════════════════════════════════════', 'color: #4CAF50;');
  console.log('');

  // Armazenar métricas
  const metrics = {
    renders: new Map(),
    queries: [],
    navigation: [],
    interactions: []
  };

  // 1. Monitor de Core Web Vitals
  console.log('%c📊 Core Web Vitals Monitor', 'font-size: 16px; font-weight: bold; color: #2196F3;');
  
  if ('PerformanceObserver' in window) {
    // LCP - Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        
        const status = lcp < 2500 ? '✅' : lcp < 4000 ? '⚠️' : '❌';
        console.log(`${status} LCP: ${lcp.toFixed(0)}ms ${lcp < 2500 ? '(Excelente!)' : lcp < 4000 ? '(Bom)' : '(Precisa melhorar)'}`);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.log('⚠️ LCP observer não disponível');
    }

    // FID - First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = entry.processingStart - entry.startTime;
          const status = fid < 100 ? '✅' : fid < 300 ? '⚠️' : '❌';
          console.log(`${status} FID: ${fid.toFixed(0)}ms ${fid < 100 ? '(Excelente!)' : fid < 300 ? '(Bom)' : '(Precisa melhorar)'}`);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.log('⚠️ FID observer não disponível');
    }

    // CLS - Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        const status = clsValue < 0.1 ? '✅' : clsValue < 0.25 ? '⚠️' : '❌';
        console.log(`${status} CLS: ${clsValue.toFixed(3)} ${clsValue < 0.1 ? '(Excelente!)' : clsValue < 0.25 ? '(Bom)' : '(Precisa melhorar)'}`);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.log('⚠️ CLS observer não disponível');
    }
  }

  // 2. Monitor de Navegação
  console.log('');
  console.log('%c🚀 Navigation Timing', 'font-size: 16px; font-weight: bold; color: #FF9800;');
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        console.log(`⏱️  DNS Lookup: ${(perfData.domainLookupEnd - perfData.domainLookupStart).toFixed(0)}ms`);
        console.log(`⏱️  TCP Connection: ${(perfData.connectEnd - perfData.connectStart).toFixed(0)}ms`);
        console.log(`⏱️  Request Time: ${(perfData.responseStart - perfData.requestStart).toFixed(0)}ms`);
        console.log(`⏱️  Response Time: ${(perfData.responseEnd - perfData.responseStart).toFixed(0)}ms`);
        console.log(`⏱️  DOM Processing: ${(perfData.domComplete - perfData.domLoading).toFixed(0)}ms`);
        console.log(`⏱️  Load Complete: ${(perfData.loadEventEnd - perfData.loadEventStart).toFixed(0)}ms`);
        
        const totalTime = perfData.loadEventEnd - perfData.fetchStart;
        const status = totalTime < 2000 ? '✅' : totalTime < 4000 ? '⚠️' : '❌';
        console.log(`${status} Total Load Time: ${totalTime.toFixed(0)}ms`);
      }
    }, 0);
  });

  // 3. Monitor de Recursos
  console.log('');
  console.log('%c📦 Resource Loading', 'font-size: 16px; font-weight: bold; color: #9C27B0;');
  
  const resourceObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
        const size = entry.transferSize || 0;
        const duration = entry.duration;
        
        if (size > 100000) { // > 100KB
          const sizeKB = (size / 1024).toFixed(0);
          const status = size < 300000 ? '✅' : size < 500000 ? '⚠️' : '❌';
          console.log(`${status} ${entry.name.split('/').pop()} - ${sizeKB}KB (${duration.toFixed(0)}ms)`);
        }
      }
    });
  });
  resourceObserver.observe({ entryTypes: ['resource'] });

  // 4. Monitor de Cliques (Tab Switching)
  console.log('');
  console.log('%c🔄 Tab Switching Monitor', 'font-size: 16px; font-weight: bold; color: #00BCD4;');
  
  let lastTabSwitch = 0;
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[role="tab"]');
    if (target) {
      const now = performance.now();
      const tabName = target.textContent.trim();
      
      if (lastTabSwitch > 0) {
        const timeSinceLastSwitch = now - lastTabSwitch;
        console.log(`🔄 Switched to: "${tabName}" (${timeSinceLastSwitch.toFixed(0)}ms since last switch)`);
      } else {
        console.log(`🔄 First tab: "${tabName}"`);
      }
      
      lastTabSwitch = now;
      
      // Medir tempo de renderização da aba
      requestAnimationFrame(() => {
        const renderTime = performance.now() - now;
        const status = renderTime < 100 ? '✅' : renderTime < 300 ? '⚠️' : '❌';
        console.log(`${status} Tab render time: ${renderTime.toFixed(0)}ms`);
      });
    }
  });

  // 5. Monitor de Input (Editor SOAP)
  console.log('');
  console.log('%c⌨️  Input Responsiveness Monitor', 'font-size: 16px; font-weight: bold; color: #E91E63;');
  
  let inputStartTime = 0;
  let inputCount = 0;
  
  document.addEventListener('input', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
      inputCount++;
      
      if (inputStartTime === 0) {
        inputStartTime = performance.now();
      }
      
      const now = performance.now();
      const latency = now - inputStartTime;
      
      if (inputCount % 10 === 0) { // Log a cada 10 inputs
        const status = latency < 50 ? '✅' : latency < 100 ? '⚠️' : '❌';
        console.log(`${status} Input latency: ${latency.toFixed(0)}ms (${inputCount} inputs)`);
      }
      
      inputStartTime = now;
    }
  });

  // 6. Monitor de Memória (se disponível)
  if (performance.memory) {
    console.log('');
    console.log('%c💾 Memory Usage', 'font-size: 16px; font-weight: bold; color: #795548;');
    
    setInterval(() => {
      const used = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const total = (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limit = (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      
      const percentage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(1);
      const status = percentage < 50 ? '✅' : percentage < 75 ? '⚠️' : '❌';
      
      console.log(`${status} Memory: ${used}MB / ${total}MB (${percentage}% of ${limit}MB limit)`);
    }, 10000); // A cada 10 segundos
  }

  // 7. Monitor de Skeleton Loaders
  console.log('');
  console.log('%c🎨 Skeleton Loader Detection', 'font-size: 16px; font-weight: bold; color: #607D8B;');
  
  const skeletonObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.getAttribute('role') === 'status') {
          console.log('🎨 Skeleton loader appeared');
          
          // Detectar quando o skeleton desaparece
          const observer = new MutationObserver((mutations) => {
            if (!document.contains(node)) {
              console.log('✅ Skeleton loader removed (content loaded)');
              observer.disconnect();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }
      });
    });
  });
  skeletonObserver.observe(document.body, { childList: true, subtree: true });

  // 8. Resumo de Performance
  console.log('');
  console.log('%c📈 Performance Summary', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
  console.log('Monitorando em tempo real...');
  console.log('');
  console.log('%cDicas:', 'font-weight: bold;');
  console.log('• Navegue pela aplicação normalmente');
  console.log('• Troque entre as abas para ver métricas de tab switching');
  console.log('• Digite no editor SOAP para ver input latency');
  console.log('• Recarregue a página para ver métricas de carregamento');
  console.log('• Use Slow 3G no Network tab para testar em rede lenta');
  console.log('');
  console.log('%c═══════════════════════════════════════════════════════', 'color: #4CAF50;');

  // Função para gerar relatório
  window.getPerformanceReport = function() {
    console.log('');
    console.log('%c📊 RELATÓRIO DE PERFORMANCE', 'font-size: 18px; font-weight: bold; color: #4CAF50; background: #E8F5E9; padding: 10px;');
    console.log('');
    
    // Core Web Vitals
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      const totalTime = perfData.loadEventEnd - perfData.fetchStart;
      console.log('%cCore Web Vitals:', 'font-weight: bold; font-size: 14px;');
      console.log(`  Total Load Time: ${totalTime.toFixed(0)}ms`);
      console.log(`  DOM Interactive: ${perfData.domInteractive.toFixed(0)}ms`);
      console.log(`  DOM Complete: ${perfData.domComplete.toFixed(0)}ms`);
    }
    
    // Memória
    if (performance.memory) {
      console.log('');
      console.log('%cMemória:', 'font-weight: bold; font-size: 14px;');
      console.log(`  Usado: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Total: ${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Limite: ${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Recursos
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    const totalJSSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    
    console.log('');
    console.log('%cRecursos JavaScript:', 'font-weight: bold; font-size: 14px;');
    console.log(`  Total de arquivos JS: ${jsResources.length}`);
    console.log(`  Tamanho total: ${(totalJSSize / 1024).toFixed(0)}KB`);
    console.log(`  Maior arquivo: ${Math.max(...jsResources.map(r => r.transferSize || 0)) / 1024}KB`);
    
    console.log('');
    console.log('%c═══════════════════════════════════════════════════════', 'color: #4CAF50;');
  };

  console.log('');
  console.log('%c💡 Dica: Digite getPerformanceReport() para ver um relatório completo', 'color: #FF9800; font-style: italic;');
  console.log('');

})();
