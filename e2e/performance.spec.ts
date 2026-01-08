import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('deve carregar página inicial em menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
    console.log(`✓ Página carregou em ${loadTime}ms`);
  });

  test('deve ter bundle JavaScript otimizado', async ({ page }) => {
    const resources: Array<{ url: string; size: number; type: string }> = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('javascript') || url.endsWith('.js')) {
        try {
          const body = await response.body();
          resources.push({
            url,
            size: body.length,
            type: 'js'
          });
        } catch {
          // Ignorar erros de leitura
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    const totalSizeKB = totalSize / 1024;
    const totalSizeMB = totalSizeKB / 1024;

    console.log(`\n📦 Análise de Bundle:`);
    console.log(`Total JS: ${totalSizeMB.toFixed(2)} MB (${resources.length} arquivos)`);

    resources
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .forEach((r, i) => {
        const sizeKB = (r.size / 1024).toFixed(2);
        const fileName = r.url.split('/').pop() || r.url;
        console.log(`${i + 1}. ${fileName}: ${sizeKB} KB`);
      });

    // Bundle inicial deve ser < 2MB (com lazy loading)
    expect(totalSizeMB).toBeLessThan(2);
  });

  test('deve ter bom First Contentful Paint', async ({ page }) => {
    await page.goto('/');

    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
            observer.disconnect();
          }
        });
        observer.observe({ entryTypes: ['paint'] });

        // Timeout de segurança
        setTimeout(() => resolve(0), 5000);
      });
    });

    console.log(`\n🎨 First Contentful Paint: ${fcp.toFixed(0)}ms`);

    // FCP deve ser < 1.5s (1500ms)
    expect(fcp).toBeLessThan(1500);
  });

  test('deve ter Cumulative Layout Shift baixo', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Aguardar um pouco para capturar shifts
    await page.waitForTimeout(2000);

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as unknown as { hadRecentInput: boolean }).hadRecentInput) continue;
            clsValue += (entry as unknown as { value: number }).value;
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 1500);
      });
    });

    console.log(`\n📏 Cumulative Layout Shift: ${cls.toFixed(4)}`);

    // CLS deve ser < 0.1
    expect(cls).toBeLessThan(0.1);
  });

  test('deve usar cache eficientemente', async ({ page }) => {
    // Primeira visita
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const firstLoadResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });

    // Segunda visita (com cache)
    await page.reload();
    await page.waitForLoadState('networkidle');

    const secondLoadResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });

    const cachedResources = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .map((r) => r as PerformanceResourceTiming)
        .filter((r) => r.transferSize === 0).length;
    });

    console.log(`\n💾 Cache Analysis:`);
    console.log(`Primeira carga: ${firstLoadResources} recursos`);
    console.log(`Segunda carga: ${secondLoadResources} recursos`);
    console.log(`Recursos em cache: ${cachedResources}`);

    // Pelo menos 50% dos recursos devem vir do cache
    const cacheRatio = cachedResources / secondLoadResources;
    expect(cacheRatio).toBeGreaterThan(0.5);
  });

  test('deve ter bom Time to Interactive', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Aguardar página estar completamente interativa
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('button', { state: 'visible' });

    // Testar interatividade clicando em elemento
    const button = page.locator('button').first();
    await button.click({ timeout: 1000 });

    const tti = Date.now() - startTime;

    console.log(`\n⚡ Time to Interactive: ${tti}ms`);

    // TTI deve ser < 2.5s (2500ms)
    expect(tti).toBeLessThan(2500);
  });

  test('deve ter poucas requisições HTTP', async ({ page }) => {
    let requestCount = 0;

    page.on('request', () => requestCount++);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`\n🌐 Total de requisições HTTP: ${requestCount}`);

    // Deve fazer menos de 50 requisições na carga inicial
    expect(requestCount).toBeLessThan(50);
  });

  test('deve comprimir recursos', async ({ page }) => {
    const resources: Array<{ url: string; compressed: boolean }> = [];

    page.on('response', async (response) => {
      const encoding = response.headers()['content-encoding'];
      const url = response.url();

      if (url.includes('.js') || url.includes('.css')) {
        resources.push({
          url: url.split('/').pop() || url,
          compressed: !!(encoding && (encoding.includes('gzip') || encoding.includes('br')))
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const compressedCount = resources.filter(r => r.compressed).length;
    const compressionRatio = compressedCount / resources.length;

    console.log(`\n📦 Compressão:`);
    console.log(`Recursos comprimidos: ${compressedCount}/${resources.length}`);
    console.log(`Taxa de compressão: ${(compressionRatio * 100).toFixed(1)}%`);

    // Pelo menos 80% dos recursos devem estar comprimidos
    expect(compressionRatio).toBeGreaterThan(0.8);
  });

  test('não deve ter memory leaks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Navegar entre páginas múltiplas vezes
    for (let i = 0; i < 5; i++) {
      await page.click('a[href="/schedule"]');
      await page.waitForLoadState('networkidle');
      await page.click('a[href="/patients"]');
      await page.waitForLoadState('networkidle');
      await page.click('a[href="/"]');
      await page.waitForLoadState('networkidle');
    }

    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = ((finalMemory - initialMemory) / initialMemory) * 100;

      console.log(`\n🧠 Memory Analysis:`);
      console.log(`Inicial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Aumento: ${memoryIncrease.toFixed(1)}%`);

      // Memória não deve aumentar mais de 50% após navegações
      expect(memoryIncrease).toBeLessThan(50);
    }
  });
});
