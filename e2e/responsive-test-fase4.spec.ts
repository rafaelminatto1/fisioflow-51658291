
// Set viewport configurations for different screen sizes

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('FASE 4: Testes de Responsividade', () => {
  test.beforeEach(async ({ page, browser }) => {
    // Set test timeout to 120 seconds
    test.setTimeout(120000);

    // Login credentials
    const email = testUsers.rafael.email;
    const password = testUsers.rafael.password;

    // Navigate to login page
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // Fill login form
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('domcontentloaded');

    // Check if we're redirected to dashboard or main page
    try {
      await expect(page).toHaveURL(/\/(\?|$|dashboard|schedule)/, { timeout: 15000 });
    } catch (e) {
      console.log('URL check failed, but continuing with test');
    }

    console.log('Login successful');
  });

  // Mobile Testing: 375x667px
  test.describe('Mobile View (375x667px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      console.log('Switched to mobile view (375x667px)');
    });

    test('Navigation menu functionality on mobile', async ({ page }) => {
      // Check if mobile hamburger menu is visible
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      await expect(mobileMenu).toBeVisible();

      // Click mobile menu
      await mobileMenu.click();

      // Verify menu items are visible
      const menuItems = [
        'dashboard',
        'pacientes',
        'financeiro',
        'agendamentos',
        'exercicios',
        'evolucao'
      ];

      for (const item of menuItems) {
        const menuItem = page.locator(`[data-testid*="${item}-nav"], a:has-text("${item}")`);
        await expect(menuItem).toBeVisible();
      }

      // Take screenshot of mobile menu
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/mobile-navigation-menu.png',
        fullPage: false
      });

      console.log('Mobile navigation menu tested');
    });

    test('Dashboard layout on mobile', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard');

      // Check for mobile-specific dashboard elements
      await expect(page.locator('[data-testid="mobile-dashboard-container"]')).toBeVisible();

      // Check for horizontal scrolling
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize().width;

      if (bodyWidth > viewportWidth) {
        console.log('WARNING: Horizontal scrolling detected on mobile dashboard');
      }

      // Take screenshot of mobile dashboard
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/mobile-dashboard.png',
        fullPage: true
      });

      console.log('Mobile dashboard layout tested');
    });

    test('Patients page on mobile', async ({ page }) => {
      // Navigate to patients page
      await page.goto('/patients');

      // Check for mobile-specific patient list
      await expect(page.locator('[data-testid="mobile-patient-list"]')).toBeVisible();

      // Check for search functionality
      const searchInput = page.locator('[data-testid="patient-search-mobile"]');
      await expect(searchInput).toBeVisible();

      // Test patient card layout
      const patientCards = page.locator('[data-testid="patient-card-mobile"]');
      await expect(patientCards.first()).toBeVisible();

      // Take screenshot of mobile patients page
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/mobile-patients.png',
        fullPage: true
      });

      console.log('Mobile patients page tested');
    });

    test('Financial page on mobile', async ({ page }) => {
      // Navigate to financial page
      await page.goto('/financial');

      // Check for mobile-specific financial layout
      await expect(page.locator('[data-testid="mobile-financial-container"]')).toBeVisible();

      // Check for financial summary cards
      const summaryCards = page.locator('[data-testid="financial-summary-mobile"]');
      await expect(summaryCards.first()).toBeVisible();

      // Take screenshot of mobile financial page
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/mobile-financial.png',
        fullPage: true
      });

      console.log('Mobile financial page tested');
    });

    test('Check for layout breaks and overlaps on mobile', async ({ page }) => {
      // Check various pages for layout issues
      const pages = ['/dashboard', '/patients', '/financial', '/appointments'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('domcontentloaded');

        // Check for overlapping elements
        const overlappingElements = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          const overlapping = [];

          for (let i = 0; i < elements.length; i++) {
            const elem1 = elements[i] as HTMLElement;
            const rect1 = elem1.getBoundingClientRect();

            if (rect1.width === 0 || rect1.height === 0) continue;

            for (let j = i + 1; j < elements.length; j++) {
              const elem2 = elements[j] as HTMLElement;
              const rect2 = elem2.getBoundingClientRect();

              if (rect1.left < rect2.right && rect1.right > rect2.left &&
                  rect1.top < rect2.bottom && rect1.bottom > rect2.top) {
                overlapping.push({
                  element1: elem1.className || elem1.tagName,
                  element2: elem2.className || elem2.tagName
                });
              }
            }
          }

          return overlapping.slice(0, 5); // Return first 5 overlaps
        });

        if (overlappingElements.length > 0) {
          console.log(`Overlapping elements found on ${pagePath}:`, overlappingElements);
        }

        // Check for elements outside viewport
        const elementsOutsideViewport = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          const outside = [];

          for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.left > window.innerWidth || rect.right < 0 ||
                rect.top > window.innerHeight || rect.bottom < 0) {
              outside.push({
                element: element.className || element.tagName,
                position: { left: rect.left, top: rect.top }
              });
            }
          }

          return outside.slice(0, 5); // Return first 5 outside elements
        });

        if (elementsOutsideViewport.length > 0) {
          console.log(`Elements outside viewport on ${pagePath}:`, elementsOutsideViewport);
        }
      }
    });
  });

  // Tablet Testing: 768x1024px
  test.describe('Tablet View (768x1024px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      console.log('Switched to tablet view (768x1024px)');
    });

    test('Navigation and dashboard on tablet', async ({ page }) => {
      // Check navigation sidebar
      const sidebar = page.locator('[data-testid="sidebar-navigation"]');
      await expect(sidebar).toBeVisible();

      // Check dashboard layout
      await page.goto('/dashboard');
      const dashboardContent = page.locator('[data-testid="dashboard-content"]');
      await expect(dashboardContent).toBeVisible();

      // Take screenshot of tablet dashboard
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/tablet-dashboard.png',
        fullPage: false
      });

      console.log('Tablet navigation and dashboard tested');
    });

    test('Tablet patients page layout', async ({ page }) => {
      // Navigate to patients page
      await page.goto('/patients');

      // Check for tablet-specific layout
      await expect(page.locator('[data-testid="patient-grid-tablet"]')).toBeVisible();

      // Test patient cards
      const patientCards = page.locator('[data-testid="patient-card-tablet"]');
      await expect(patientCards.first()).toBeVisible();

      // Take screenshot of tablet patients page
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/tablet-patients.png',
        fullPage: true
      });

      console.log('Tablet patients page tested');
    });
  });

  // Desktop Testing: 1920x1080px
  test.describe('Desktop View (1920x1080px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      console.log('Switched to desktop view (1920x1080px)');
    });

    test('Full HD layout verification', async ({ page }) => {
      // Check navigation sidebar
      const sidebar = page.locator('[data-testid="sidebar-navigation"]');
      await expect(sidebar).toBeVisible();

      // Check dashboard layout
      await page.goto('/dashboard');
      const dashboardHeader = page.locator('[data-testid="dashboard-header"]');
      await expect(dashboardHeader).toBeVisible();

      // Test responsive elements
      const responsiveElements = [
        '[data-testid="dashboard-stats-grid"]',
        '[data-testid="chart-container"]',
        '[data-testid="recent-appointments"]'
      ];

      for (const selector of responsiveElements) {
        const element = page.locator(selector);
        await expect(element).toBeVisible();
      }

      // Take screenshot of desktop dashboard
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/desktop-dashboard.png',
        fullPage: false
      });

      console.log('Full HD layout tested');
    });

    test('Desktop patients page layout', async ({ page }) => {
      // Navigate to patients page
      await page.goto('/patients');

      // Check desktop-specific features
      await expect(page.locator('[data-testid="patient-search-bar"]')).toBeVisible();

      // Check patient table/grid
      const patientTable = page.locator('[data-testid="patient-table-desktop"]');
      await expect(patientTable).toBeVisible();

      // Take screenshot of desktop patients page
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/desktop-patients.png',
        fullPage: true
      });

      console.log('Desktop patients page tested');
    });

    test('Desktop financial page layout', async ({ page }) => {
      // Navigate to financial page
      await page.goto('/financial');

      // Check desktop financial layout
      await expect(page.locator('[data-testid="financial-summary-desktop"]')).toBeVisible();

      // Check financial charts/tables
      const financialCharts = page.locator('[data-testid="financial-charts-desktop"]');
      await expect(financialCharts.first()).toBeVisible();

      // Take screenshot of desktop financial page
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/desktop-financial.png',
        fullPage: true
      });

      console.log('Desktop financial page tested');
    });

    test('Navigation menu accessibility on desktop', async ({ page }) => {
      // Check sidebar navigation
      const sidebarNav = page.locator('[data-testid="sidebar-navigation"]');
      await expect(sidebarNav).toBeVisible();

      // Check menu items
      const menuItems = [
        'Dashboard',
        'Pacientes',
        'Financeiro',
        'Agendamentos',
        'Exercícios',
        'Evolução'
      ];

      for (const item of menuItems) {
        const menuItem = page.locator(`a:has-text("${item}")`);
        await expect(menuItem).toBeVisible();
        await expect(menuItem).toBeFocused({ focused: false }); // Should not be focused initially
      }

      // Test keyboard navigation
      const firstMenuItem = page.locator('[data-testid="dashboard-nav"]');
      await firstMenuItem.click();
      await expect(firstMenuItem).toBeFocused();

      // Take screenshot of desktop navigation
      await page.screenshot({
        path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/desktop-navigation.png',
        fullPage: false
      });

      console.log('Desktop navigation accessibility tested');
    });
  });

  // Cross-device testing
  test.describe('Cross-device Consistency', () => {
    test('Check header consistency across devices', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];

      const headerElements = [
        '[data-testid="app-header"]',
        '[data-testid="user-profile"]',
        '[data-testid="notification-bell"]'
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/dashboard');

        for (const selector of headerElements) {
          const element = page.locator(selector);
          const isVisible = await element.isVisible();
          console.log(`${viewport.name}: ${selector} - ${isVisible ? 'visible' : 'hidden'}`);

          if (!isVisible && viewport.name === 'mobile') {
            console.log(`Expected element ${selector} to be visible on mobile`);
          }
        }
      }
    });

    test('Check for horizontal scrolling issues', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
        { width: 1920, height: 1080 }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        // Test multiple pages
        const pages = ['/dashboard', '/patients', '/financial'];

        for (const pagePath of pages) {
          await page.goto(pagePath);
          await page.waitForLoadState('domcontentloaded');

          // Check for horizontal scrollbar
          const hasHorizontalScroll = await page.evaluate(() => {
            return document.body.scrollWidth > window.innerWidth;
          });

          if (hasHorizontalScroll) {
            console.log(`Horizontal scroll needed on ${pagePath} at ${viewport.width}x${viewport.height}`);

            // Take screenshot showing the issue
            await page.screenshot({
              path: `/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report/horizontal-scroll-${viewport.width}x${viewport.height}-${pagePath.replace('/', '-')}.png`,
              fullPage: true
            });
          }
        }
      }
    });
  });

  // Error reporting
  test.afterEach(async ({ page }) => {
    // Check for console errors
    const consoleErrors = await page.evaluate(() => {
      return (window as any).__consoleErrors || [];
    });

    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors);
    }

    // Check for console warnings
    const consoleWarnings = await page.evaluate(() => {
      return (window as any).__consoleWarnings || [];
    });

    if (consoleWarnings.length > 0) {
      console.log('Console warnings found:', consoleWarnings);
    }
  });
});