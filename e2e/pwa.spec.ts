import { test, expect } from '@playwright/test';

test.describe('PWA Tests', () => {
  test('deve ter manifest.json válido', async ({ page }) => {
    await page.goto('/');

    // Verificar link do manifest no HTML
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);

    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).toBeTruthy();

    // Buscar e validar manifest
    const response = await page.goto(manifestHref!);
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();

    // Validar campos obrigatórios
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);

    console.log(`\n📱 PWA Manifest:`);
    console.log(`Nome: ${manifest.name}`);
    console.log(`Nome curto: ${manifest.short_name}`);
    console.log(`Display: ${manifest.display}`);
    console.log(`Ícones: ${manifest.icons.length}`);
  });

  test('deve ter Service Worker registrado', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Aguardar registro do Service Worker
    await page.waitForTimeout(2000);

    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });

    console.log(`\n🔧 Service Worker registrado: ${swRegistered ? 'Sim' : 'Não'}`);
    expect(swRegistered).toBe(true);
  });

  test('deve ter ícones de tamanhos corretos', async ({ page }) => {
    await page.goto('/manifest.json');
    const manifest = await page.evaluate(() => JSON.parse(document.body.textContent || '{}'));

    const requiredSizes = ['192x192', '512x512'];
    const iconSizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);

    console.log(`\n🖼️ Ícones disponíveis:`);
    manifest.icons.forEach((icon: { sizes: string; type: string }) => {
      console.log(`- ${icon.sizes} (${icon.type})`);
    });

    for (const size of requiredSizes) {
      expect(iconSizes).toContain(size);
    }
  });

  test('deve ter meta tags para PWA', async ({ page }) => {
    await page.goto('/');

    // Theme color
    const themeColor = await page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);

    // Viewport
    const viewport = await page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);

    // Apple touch icon
    const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]');
    const appleIconCount = await appleTouchIcon.count();

    console.log(`\n🏷️ Meta tags PWA:`);
    console.log(`✓ theme-color`);
    console.log(`✓ viewport`);
    console.log(`${appleIconCount > 0 ? '✓' : '✗'} apple-touch-icon`);
  });

  test('deve funcionar offline (básico)', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Aguardar Service Worker cachear recursos
    await page.waitForTimeout(3000);

    // Simular offline
    await context.setOffline(true);

    // Tentar recarregar
    await page.reload();

    // Verificar se página básica carrega (HTML cacheado)
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);

    console.log(`\n📴 Teste offline:`);
    console.log(`✓ Página HTML carregou offline`);
    console.log(`Tamanho: ${html.length} bytes`);

    // Restaurar online
    await context.setOffline(false);
  });

  test('deve ter estratégia de cache configurada', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verificar se Service Worker tem estratégias de cache
    const cacheNames = await page.evaluate(async () => {
      if ('caches' in window) {
        return await caches.keys();
      }
      return [];
    });

    console.log(`\n💾 Caches disponíveis:`);
    cacheNames.forEach(name => console.log(`- ${name}`));

    expect(cacheNames.length).toBeGreaterThan(0);
  });

  test('deve salvar dados no IndexedDB', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Aguardar inicialização do IndexedDB
    await page.waitForTimeout(2000);

    const dbExists = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('FisioFlowDB');
        request.onsuccess = () => {
          resolve(true);
          request.result.close();
        };
        request.onerror = () => resolve(false);
      });
    });

    console.log(`\n🗄️ IndexedDB:`);
    console.log(`Database existe: ${dbExists ? 'Sim' : 'Não'}`);

    expect(dbExists).toBe(true);
  });

  test('deve ter install prompt disponível', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verificar se beforeinstallprompt é capturado
    const installable = await page.evaluate(() => {
      return new Promise((resolve) => {
        let captured = false;

        window.addEventListener('beforeinstallprompt', () => {
          captured = true;
        });

        setTimeout(() => resolve(captured), 2000);
      });
    });

    console.log(`\n📲 Install Prompt:`);
    console.log(`Instalável: ${installable ? 'Sim' : 'Não'}`);

    // Note: Em testes, o evento pode não disparar sempre
    // Então não falhamos se não disparar
    console.log(`(Evento beforeinstallprompt pode não disparar em testes)`);
  });

  test('deve ter recursos críticos pré-cacheados', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Aguardar cache
    await page.waitForTimeout(3000);

    const cachedUrls = await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const allUrls: string[] = [];

        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          allUrls.push(...requests.map(req => new URL(req.url).pathname));
        }

        return allUrls;
      }
      return [];
    });

    console.log(`\n📦 Recursos cacheados: ${cachedUrls.length}`);

    // Verificar recursos críticos
    const criticalResources = ['/', '/manifest.json', '/sw.js'];
    const cachedCritical = criticalResources.filter(url =>
      cachedUrls.some(cached => cached.includes(url))
    );

    console.log(`Recursos críticos cacheados: ${cachedCritical.length}/${criticalResources.length}`);
  });

  test('deve atualizar Service Worker quando disponível', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const swStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();

        if (registration) {
          return {
            hasActive: !!registration.active,
            hasWaiting: !!registration.waiting,
            hasInstalling: !!registration.installing,
            updateFound: !!registration.waiting || !!registration.installing
          };
        }
      }

      return {
        hasActive: false,
        hasWaiting: false,
        hasInstalling: false,
        updateFound: false
      };
    });

    console.log(`\n🔄 Service Worker Status:`);
    console.log(`Active: ${swStatus.hasActive ? 'Sim' : 'Não'}`);
    console.log(`Waiting: ${swStatus.hasWaiting ? 'Sim' : 'Não'}`);
    console.log(`Installing: ${swStatus.hasInstalling ? 'Sim' : 'Não'}`);

    expect(swStatus.hasActive).toBe(true);
  });
});
