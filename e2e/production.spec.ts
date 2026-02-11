import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://fisioflow-migration.web.app';

test.describe('Production Site Tests', () => {
  test('should load the homepage', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);

    // Verifica se a página carregou com sucesso
    expect(response?.status()).toBe(200);

    // Verifica o título da página
    await expect(page).toHaveTitle(/FisioFlow/);

    // Verifica se o conteúdo principal está presente
    const content = await page.content();
    expect(content).toContain('FisioFlow');
  });

  test('should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];

    // Captura erros do console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(PRODUCTION_URL);

    // Aguarda um pouco para capturar erros de runtime
    await page.waitForTimeout(3000);

    // Se houver erros, exibe no console
    if (errors.length > 0) {
      console.error('Console errors found:', errors);
    }

    // Verifica se não há erros críticos (pode haver warnings não críticos)
    const criticalErrors = errors.filter(e =>
      e.includes('Uncaught') ||
      e.includes('TypeError') ||
      e.includes('ReferenceError') ||
      e.includes('Failed to fetch')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should have correct meta tags', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Verifica meta tags de cache
    const cacheControl = await page.getAttribute('meta[http-equiv="Cache-Control"]', 'content');
    expect(cacheControl).toBe('no-cache, no-store, must-revalidate');

    // Verifica viewport
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toContain('width=device-width');
  });

  test('should load main CSS and JS bundles', async ({ page }) => {
    const responses: { url: string; status: number }[] = [];

    // Monitora requisições de recursos
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.css')) {
        responses.push({
          url,
          status: response.status()
        });
      }
    });

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Verifica se os recursos principais carregaram
    const failedResources = responses.filter(r => r.status >= 400);

    if (failedResources.length > 0) {
      console.error('Failed resources:', failedResources);
    }

    expect(failedResources).toHaveLength(0);
  });

  test('should show login form or redirect to auth', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Aguarda a página carregar completamente
    await page.waitForTimeout(2000);

    // Tenta detectar se há um formulário de login ou redirecionamento
    const url = page.url();

    // Pode estar na home ou redirecionada para /auth
    expect(
      url === PRODUCTION_URL ||
      url.includes('/auth') ||
      url.includes('/login')
    ).toBeTruthy();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Aguarda carregar
    await page.waitForTimeout(1000);

    // Verifica se há elementos de navegação presentes
    const body = await page.content();
    const hasNavigation =
      body.includes('nav') ||
      body.includes('header') ||
      body.includes('menu') ||
      body.includes('navigation');

    expect(hasNavigation).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Simula viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(PRODUCTION_URL);

    // Verifica se a página carrega em mobile
    await page.waitForTimeout(2000);

    const content = await page.content();
    expect(content).toContain('FisioFlow');

    // Verifica viewport meta tag para mobile
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toContain('user-scalable=no');
  });
});

test.describe('Performance Tests', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Considera aceitável até 10 segundos
    expect(loadTime).toBeLessThan(10000);

    console.log(`Page loaded in ${loadTime}ms`);
  });

  test('should have reasonable bundle sizes', async ({ page }) => {
    const jsSizes: number[] = [];

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('.js') && !url.includes('node_modules')) {
        const headers = await response.allHeaders();
        const size = parseInt(headers['content-length'] || '0');
        if (size > 0) {
          jsSizes.push(size);
        }
      }
    });

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Verifica se não há bundles muito grandes (>5MB)
    const hugeBundles = jsSizes.filter(size => size > 5 * 1024 * 1024);

    if (hugeBundles.length > 0) {
      console.warn('Large bundles found:', hugeBundles);
    }

    // É aceitável ter alguns bundles grandes, mas não todos
    expect(hugeBundles.length).toBeLessThan(jsSizes.length);
  });
});
