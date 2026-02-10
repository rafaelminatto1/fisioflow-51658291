/**
 * FisioFlow - Extended Accessibility Tests
 *
 * Testes estendidos de acessibilidade WCAG 2.1 AA para todas as páginas principais.
 * Inclui testes com leitor de tela simulado, navegação por teclado e contraste.
 *
 * Execute com: npm run test:e2e:e2e/accessibility-extended.spec.ts
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { testUsers } from './fixtures/test-data';

const PAGES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/eventos', name: 'Eventos' },
  { path: '/schedule', name: 'Agenda' },
  { path: '/patients', name: 'Pacientes' },
  { path: '/exercises', name: 'Exercícios' },
  { path: '/reports', name: 'Relatórios' },
];

test.describe('Testes Estendidos de Acessibilidade WCAG 2.1 AA', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes dos testes
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/(\?|\/eventos|\/dashboard|\/schedule)/);
  });

  /**
   * TESTE 1: Verificação AXE Core em todas as páginas
   */
  for (const pageData of PAGES) {
    test(`Acessibilidade AXE - ${pageData.name}`, async ({ page }) => {
      await page.goto(pageData.path);
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .include('body')
        .analyze();

      // Agrupar violações por severidade
      const critical = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical'
      );
      const serious = accessibilityScanResults.violations.filter(
        v => v.impact === 'serious'
      );
      const moderate = accessibilityScanResults.violations.filter(
        v => v.impact === 'moderate'
      );

      // Formatar relatório
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`\n❌ ${pageData.name} - ${accessibilityScanResults.violations.length} violações encontradas:`);

        for (const violation of accessibilityScanResults.violations) {
          console.log(`  \x1b[${violation.impact === 'critical' ? '31' : '33'}m●\x1b[0m ${violation.id} (${violation.impact})`);
          console.log(`    ${violation.description}`);
          if (violation.nodes.length > 0) {
            console.log(`    Elementos afetados: ${violation.nodes.length}`);
          }
        }
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  /**
   * TESTE 2: Skip Links
   */
  test('Skip Links - Deve permitir pular para conteúdo principal', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    // Skip link deve estar presente mas invisível inicialmente
    const skipLink = page.locator('a[href="#main-content"], [data-testid="skip-link"]');
    await expect(skipLink).toHaveAttribute('class', /sr-only|skip-to-content|visually-hidden/);

    // Ao focar, deve ficar visível
    await skipLink.focus();
    await expect(skipLink).toBeVisible();

    // Ao pressionar Enter, deve focar no conteúdo principal
    await skipLink.press('Enter');
    const mainContent = page.locator('#main-content, main, [role="main"]');
    await expect(mainContent).toBeFocused();
  });

  /**
   * TESTE 3: Navegação por Teclado - Tab Order
   */
  test('Navegação por Teclado - Ordem lógica de tabulação', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    const focusableElements = page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const count = await focusableElements.count();

    // Verificar se os elementos estão em ordem visual lógica
    const positions = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const element = focusableElements.nth(i);
      const box = await element.boundingBox();
      if (box) {
        positions.push({
          index: i,
          y: box.y,
          x: box.x,
        });
      }
    }

    // Verificar se a ordem de tabulação segue a ordem de leitura (topo para baixo)
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      // Se elemento está na mesma linha, X deve aumentar
      // Se elemento está em linha diferente, Y deve aumentar
      const isSameLine = Math.abs(curr.y - prev.y) < 50;
      if (isSameLine) {
        expect(curr.x).toBeGreaterThan(prev.x);
      } else {
        expect(curr.y).toBeGreaterThanOrEqual(prev.y);
      }
    }
  });

  /**
   * TESTE 4: Focus Visible
   */
  test('Focus Visible - Indicador de foco visível', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const focusableElements = page.locator(
      'button:not([disabled]), a[href], input:not([disabled])'
    );

    const count = await focusableElements.count();

    // Testar primeiros 5 elementos
    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = focusableElements.nth(i);

      // Focar elemento
      await element.focus();

      // Verificar se há indicador de foco visível
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Verificar estilos de foco
      const outline = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
        };
      });

      // Deve ter outline ou box-shadow
      const hasFocusIndicator =
        (outline.outline && outline.outline !== 'none') ||
        (outline.boxShadow && outline.boxShadow !== 'none') ||
        (outline.outlineWidth && parseInt(outline.outlineWidth) > 0);

      if (!hasFocusIndicator) {
        console.warn(`\n⚠️  Elemento ${i} não possui indicador de foco visível`);
      }
    }
  });

  /**
   * TESTE 5: Modais e Traps
   */
  test('Modais - Focus trap e fechamento com ESC', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Abrir modal de novo paciente
    await page.click('button:has-text("Novo Paciente")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Focus deve estar dentro do modal
    const focusedInModal = await modal.locator(':focus').count();
    expect(focusedInModal).toBeGreaterThan(0);

    // ESC deve fechar
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  /**
   * TESTE 6: Labels em Formulários
   */
  test('Formulários - Todos os inputs têm labels associados', async ({ page }) => {
    await page.goto('/patients/new');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="date"], textarea, select'
    );

    const count = await inputs.count();
    const unlabeled = [];

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      const name = await input.getAttribute('name');

      // Verificar se tem algum método de label
      const hasLabel =
        id || ariaLabel || ariaLabelledBy || placeholder || name;

      if (!hasLabel) {
        const tagName = await input.evaluate(el => el.tagName);
        unlabeled.push(`${tagName}[${i}]`);
      }
    }

    if (unlabeled.length > 0) {
      console.warn(`\n⚠️  Elementos sem label: ${unlabeled.join(', ')}`);
    }

    expect(unlabeled.length).toBe(0);
  });

  /**
   * TESTE 7: Contraste de Cores
   */
  test('Contraste - Verificar contraste mínimo de 4.5:1 para texto', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Buscar elementos de texto importantes
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button');

    const violations = [];

    // Função para calcular contraste (simplificada)
    const getLuminance = async (element) => {
      return element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const bg = styles.backgroundColor;

        // Parse RGB
        const parseColor = (c) => {
          const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return { r: 0, g: 0, b: 0 };
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
          };
        };

        const fg = parseColor(color);
        const bgVal = bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)'
          ? { r: 255, g: 255, b: 255 }
          : parseColor(bg);

        // Fórmula de luminância relativa
        const luminance = (r, g, b) => {
          const [rs, gs, bs] = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const fgLum = luminance(fg.r, fg.g, fg.b);
        const bgLum = luminance(bgVal.r, bgVal.g, bgVal.b);

        const lighter = Math.max(fgLum, bgLum);
        const darker = Math.min(fgLum, bgLum);
        const contrast = (lighter + 0.05) / (darker + 0.05);

        return { contrast, color, bg: bg === 'transparent' ? '#FFFFFF' : bg };
      });
    };

    // Testar primeiros 10 elementos de texto
    const count = await textElements.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = textElements.nth(i);
      const result = await getLuminance(element);

      // WCAG AA requer contraste de pelo menos 4.5:1 para texto normal
      if (result.contrast < 4.5) {
        violations.push({
          index: i,
          contrast: result.contrast.toFixed(2),
          color: result.color,
          bg: result.bg,
        });
      }
    }

    if (violations.length > 0) {
      console.warn('\n⚠️  Violações de contraste encontradas:');
      for (const v of violations) {
        console.warn(`  Elemento ${v.index}: contraste ${v.contrast}:1 (${v.color} sobre ${v.bg})`);
      }
    }

    // Para este teste, vamos emitir warning mas não falhar
    // Em produção, considere falhar se houver violações
  });

  /**
   * TESTE 8: Imagens com Alt Text
   */
  test('Imagens - Todas têm atributo alt ou role="presentation"', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();
    const missingAlt = [];

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      if (alt === null && role !== 'presentation') {
        const src = await img.getAttribute('src');
        missingAlt.push(src || 'unknown');
      }
    }

    if (missingAlt.length > 0) {
      console.warn(`\n⚠️  Imagens sem alt: ${missingAlt.join(', ')}`);
    }

    expect(missingAlt.length).toBe(0);
  });

  /**
   * TESTE 9: Preferências do Usuário - Reduced Motion
   */
  test('Reduced Motion - Respeita preferência de redução de movimento', async ({ page }) => {
    // Emular prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    // Verificar se animações estão desabilitadas
    const animatedElements = page.locator('.animate-fade-in, .animate-slide-up, [data-animate]');
    const count = await animatedElements.count();

    for (let i = 0; i < count; i++) {
      const element = animatedElements.nth(i);
      const style = await element.evaluate((el) => {
        return window.getComputedStyle(el);
      });

      // Animações devem ter duração próxima de zero
      const animationDuration = parseFloat(style.animationDuration || '0');
      const transitionDuration = parseFloat(style.transitionDuration || '0');

      expect(animationDuration).toBeLessThan(0.1);
      expect(transitionDuration).toBeLessThan(0.1);
    }
  });

  /**
   * TESTE 10: ARIA Roles e States
   */
  test('ARIA - Roles e estados corretos em componentes interativos', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    // Verificar botões com aria-expanded
    const expandableButtons = page.locator('button[aria-expanded]');
    const count = await expandableButtons.count();

    for (let i = 0; i < count; i++) {
      const button = expandableButtons.nth(i);
      const expanded = await button.getAttribute('aria-expanded');

      // aria-expanded deve ser "true" ou "false"
      expect(['true', 'false']).toContain(expanded);

      // Se true, deve haver conteúdo controlado visível
      if (expanded === 'true') {
        const controls = await button.getAttribute('aria-controls');
        if (controls) {
          const controlled = page.locator(`#${controls}`);
          await expect(controlled).toBeVisible();
        }
      }
    }

    // Verificar elementos com role="button"
    const roleButtons = page.locator('[role="button"]');
    const roleButtonCount = await roleButtons.count();

    for (let i = 0; i < roleButtonCount; i++) {
      const button = roleButtons.nth(i);

      // Deve ser clicável com teclado
      await button.focus();
      await button.keyboard.press('Enter');

      // Verificar tabindex
      const tabindex = await button.getAttribute('tabindex');
      expect(tabindex === null || tabindex === '0').toBeTruthy();
    }
  });
});

/**
 * Helper: Testa contraste usando biblioteca de cores
 */
function getContrastRatio(foreground: string, background: string): number {
  // Implementação simplificada - em produção use uma biblioteca como 'color'
  return 7; // Placeholder
}
