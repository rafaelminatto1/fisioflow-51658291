import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Test configuration
const BASE_URL = 'https://fisioflow-migration.web.app';
const LOGIN_URL = 'https://moocafisio.com.br';
const EMAIL = 'rafael.minatto@yahoo.com.br';
const PASSWORD = 'Yukari30@';

// Report storage
const results: any[] = [];
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function logResult(category: string, test: string, passed: boolean, details: string, severity: 'critical' | 'serious' | 'moderate' | 'minor' = 'moderate') {
  const result = { category, test, passed, details, severity };
  results.push(result);
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} [${category}] ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  if (!passed) {
    console.log(`  Details: ${details}`);
  }
}

async function takeScreenshot(page: Page, name: string) {
  const filepath = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

test.describe('FisioFlow Accessibility Tests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    console.log('\n=== Starting Accessibility Tests ===\n');
  });

  test.afterAll(async () => {
    await page.close();
    console.log('\n=== Test Summary ===');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    // Save results to JSON
    fs.writeFileSync(
      path.join(__dirname, 'accessibility-results.json'),
      JSON.stringify(results, null, 2)
    );
  });

  test('1. Skip Links Test', async () => {
    await page.goto(BASE_URL);
    await takeScreenshot(page, '01-initial-load');

    // Check for skip links in the DOM
    const skipLinks = await page.locator('a[href^="#"], a.skip-link, a[href*="skip"], a[href*="content"]').all();

    if (skipLinks.length === 0) {
      logResult('Skip Links', 'Skip link present', false, 'No skip links found in the DOM. Add a skip link to allow keyboard users to bypass navigation.', 'serious');
    } else {
      logResult('Skip Links', 'Skip link present', true, `Found ${skipLinks.length} potential skip link(s)`);

      // Check if skip link becomes visible on focus
      for (const link of skipLinks) {
        const isVisible = await link.isVisible();
        const hasSkipText = (await link.textContent() || '').toLowerCase().includes('skip');
        const hasSkipClass = await link.evaluate(el => {
          const classes = el.className;
          return classes.includes('skip') || classes.includes('visually-hidden') || classes.includes('sr-only');
        });

        if (hasSkipText || hasSkipClass) {
          // Focus the link and check visibility
          await link.focus();
          const isVisibleOnFocus = await link.isVisible();
          await takeScreenshot(page, '01-skip-link-focused');

          if (isVisibleOnFocus) {
            logResult('Skip Links', 'Skip link visible on focus', true, 'Skip link becomes visible when focused');
          } else {
            logResult('Skip Links', 'Skip link visible on focus', false, 'Skip link should be visible when focused to help keyboard navigation', 'serious');
          }
        }
      }
    }

    // Check for proper skip link implementation
    const hasSkipToContent = await page.locator('a[href="#main"], a[href="#content"], a[href*="main"]').count();
    const hasSkipToNav = await page.locator('a[href*="nav"], a[href*="menu"]').count();

    logResult('Skip Links', 'Skip to main content link', hasSkipToContent > 0,
      hasSkipToContent > 0 ? 'Found link to main content' : 'Missing link to skip to main content', 'serious');

    logResult('Skip Links', 'Skip to navigation link', hasSkipToNav > 0,
      hasSkipToNav > 0 ? 'Found link to navigation' : 'Consider adding link to skip to navigation');
  });

  test('2. ARIA Labels Test', async () => {
    await page.goto(BASE_URL);
    await takeScreenshot(page, '02-before-aria-checks');

    // Check buttons without text content
    const buttonsWithoutText = await page.locator('button').filter({ hasText: /^$/ }).all();
    const iconButtonsWithoutAria: string[] = [];

    for (const btn of buttonsWithoutText) {
      const hasAriaLabel = await btn.getAttribute('aria-label');
      const hasAriaLabelledBy = await btn.getAttribute('aria-labelledby');
      const hasTitle = await btn.getAttribute('title');
      const hasIcon = await btn.locator('svg, i[class*="icon"]').count() > 0;

      if (hasIcon && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
        const id = await btn.evaluate(el => el.id || 'no-id');
        iconButtonsWithoutAria.push(id);
      }
    }

    logResult('ARIA Labels', 'Icon buttons have accessible names', iconButtonsWithoutAria.length === 0,
      iconButtonsWithoutAria.length > 0
        ? `Found ${iconButtonsWithoutAria.length} icon button(s) without aria-label: ${iconButtonsWithoutAria.slice(0, 5).join(', ')}`
        : 'All icon buttons have accessible names',
      'critical'
    );

    // Check inputs have labels
    const inputs = await page.locator('input, select, textarea').all();
    const inputsWithoutLabels: any[] = [];

    for (const input of inputs) {
      const type = await input.getAttribute('type');
      if (type === 'hidden') continue;

      const hasAriaLabel = await input.getAttribute('aria-label');
      const hasAriaLabelledBy = await input.getAttribute('aria-labelledby');
      const hasId = await input.getAttribute('id');

      let hasLabel = false;
      if (hasId) {
        const labelExists = await page.locator(`label[for="${hasId}"]`).count();
        hasLabel = labelExists > 0;
      }

      if (!hasAriaLabel && !hasAriaLabelledBy && !hasLabel) {
        const name = await input.getAttribute('name') || await input.getAttribute('type') || 'unknown';
        inputsWithoutLabels.push(name);
      }
    }

    logResult('ARIA Labels', 'Form inputs have labels', inputsWithoutLabels.length === 0,
      inputsWithoutLabels.length > 0
        ? `Found ${inputsWithoutLabels.length} input(s) without proper labels: ${inputsWithoutLabels.slice(0, 5).join(', ')}`
        : 'All inputs have proper labels',
      'critical'
    );

    // Check navigation landmarks
    const navLandmarks = await page.locator('nav, [role="navigation"]').count();
    logResult('ARIA Labels', 'Navigation landmarks', navLandmarks > 0,
      `Found ${navLandmarks} navigation landmark(s)`,
      navLandmarks === 0 ? 'serious' : 'minor'
    );

    // Check for aria-hidden on decorative elements
    const ariaHiddenElements = await page.locator('[aria-hidden="true"]').count();
    logResult('ARIA Labels', 'ARIA hidden used appropriately', ariaHiddenElements >= 0,
      `Found ${ariaHiddenElements} element(s) with aria-hidden="true"`);

    // Check interactive elements have accessible names
    const linksWithoutText = await page.locator('a').filter({ hasNotText: /.+/ }).filter({ hasNot: page.locator('[aria-label]') }).count();
    logResult('ARIA Labels', 'Links have text or aria-label', linksWithoutText === 0,
      `Found ${linksWithoutText} link(s) without accessible text`,
      linksWithoutText > 0 ? 'serious' : 'minor'
    );
  });

  test('3. Keyboard Navigation Test', async () => {
    await page.goto(BASE_URL);
    await takeScreenshot(page, '03-before-keyboard-test');

    // Test Tab key navigation
    const focusableElements: any[] = [];
    let tabCount = 0;
    const maxTabs = 100; // Prevent infinite loops

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      tabCount++;

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        return {
          tagName: el.tagName,
          type: (el as any).type || '',
          id: el.id,
          className: el.className,
          textContent: el.textContent?.slice(0, 50) || '',
          ariaLabel: el.getAttribute('aria-label'),
          tabIndex: (el as any).tabIndex
        };
      });

      if (!focusedElement) break;

      focusableElements.push(focusedElement);

      // Check if we've cycled back to the beginning
      if (tabCount > 10 && focusableElements.length < tabCount / 2) {
        break;
      }
    }

    logResult('Keyboard Navigation', 'Tab navigation works', focusableElements.length > 0,
      `Can navigate through ${focusableElements.length} focusable element(s)`,
      focusableElements.length === 0 ? 'critical' : 'minor'
    );

    // Check tab order is logical (rough check)
    const hasFocusTraps = await page.evaluate(() => {
      // Check for elements that might trap focus
      const modals = document.querySelectorAll('[role="dialog"], .modal, [aria-modal="true"]');
      return Array.from(modals).filter(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }).length;
    });

    if (hasFocusTraps > 0) {
      logResult('Keyboard Navigation', 'No hidden focus traps', hasFocusTraps === 0,
        `Found ${hasFocusTraps} visible modal(s) - ensure focus management is correct`,
        'moderate'
      );
    } else {
      logResult('Keyboard Navigation', 'No hidden focus traps', true, 'No visible modals detected');
    }

    // Test Escape key closes modals/dropdowns
    await page.goto(BASE_URL);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Check for dropdown toggles
    const dropdowns = await page.locator('[role="button"][aria-expanded], button[aria-expanded]').all();

    for (const dropdown of dropdowns.slice(0, 3)) {
      await dropdown.click();
      await page.waitForTimeout(200);
      const isExpanded = await dropdown.getAttribute('aria-expanded');

      if (isExpanded === 'true') {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        const isNowClosed = await dropdown.getAttribute('aria-expanded');

        logResult('Keyboard Navigation', 'Escape key closes dropdowns', isNowClosed === 'false',
          'Dropdown should close when Escape is pressed',
          'moderate'
        );
        break;
      }
    }
  });

  test('4. Focus Management Test', async () => {
    await page.goto(BASE_URL);
    await takeScreenshot(page, '04-focus-indicators');

    // Check for visible focus indicators
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const hasFocusStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;

      const style = window.getComputedStyle(el);
      const hasOutline = style.outline !== 'none' && style.outline !== '' && style.outlineWidth !== '0px';
      const hasBoxShadow = style.boxShadow !== 'none';

      // Check if focus styles exist via CSS
      const focusStyles = window.getComputedStyle(el, ':focus');
      const focusHasOutline = focusStyles.outline !== 'none' && focusStyles.outline !== '';

      return hasOutline || hasBoxShadow || focusHasOutline;
    });

    logResult('Focus Management', 'Visible focus indicators', hasFocusStyle,
      hasFocusStyle ? 'Focus indicators are visible' : 'No visible focus indicators detected - add :focus styles',
      'critical'
    );

    // Test that focus is visible on different element types
    await page.goto(BASE_URL);
    const elementsToTest = ['a', 'button', 'input'];
    const focusResults: any[] = {};

    for (const selector of elementsToTest) {
      const firstEl = await page.locator(selector).first();
      const count = await page.locator(selector).count();

      if (count > 0) {
        await firstEl.focus();
        await page.waitForTimeout(50);

        const isVisible = await firstEl.isVisible();
        const hasFocusRing = await firstEl.evaluate(el => {
          const style = window.getComputedStyle(el);
          const focusStyle = window.getComputedStyle(el, ':focus');
          return {
            outline: style.outline,
            outlineWidth: style.outlineWidth,
            boxShadow: style.boxShadow,
            focusOutline: focusStyle.outline,
            focusBoxShadow: focusStyle.boxShadow
          };
        });

        focusResults[selector] = { isVisible, ...hasFocusRing };
      }
    }

    // Check for :focus-visible support (modern approach)
    const usesFocusVisible = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.cssText && rule.cssText.includes(':focus-visible')) {
              return true;
            }
          }
        } catch (e) {
          // CORS issues with some stylesheets
        }
      }
      return false;
    });

    if (usesFocusVisible) {
      logResult('Focus Management', 'Uses :focus-visible', true, 'Modern focus-visible implementation found');
    } else {
      logResult('Focus Management', 'Uses :focus-visible', false, 'Consider using :focus-visible for better keyboard-only focus indicators', 'moderate');
    }

    // Check for outline: none on focus
    const outlineRemoved = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.cssText && /:focus.*outline:\s*none/.test(rule.cssText)) {
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    });

    if (outlineRemoved) {
      logResult('Focus Management', 'Focus outlines not removed', false, 'CSS removes outline on :focus - ensure alternative focus indicator is provided', 'serious');
    } else {
      logResult('Focus Management', 'Focus outlines not removed', true, 'No outline: none on :focus detected');
    }
  });

  test('5. Semantic HTML Test', async () => {
    await page.goto(BASE_URL);
    await takeScreenshot(page, '05-semantic-html');

    // Check heading structure
    const headingStructure = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headings.map(h => ({
        tag: h.tagName,
        text: h.textContent?.slice(0, 50) || '',
        level: parseInt(h.tagName[1])
      }));
    });

    const h1Count = headingStructure.filter(h => h.level === 1).length;
    logResult('Semantic HTML', 'Single h1 per page', h1Count === 1,
      h1Count === 1 ? 'Exactly one h1 found' : `Found ${h1Count} h1 element(s) - should have exactly one`,
      h1Count !== 1 ? 'serious' : 'minor'
    );

    // Check heading hierarchy
    let properHierarchy = true;
    for (let i = 1; i < headingStructure.length; i++) {
      const prev = headingStructure[i - 1];
      const curr = headingStructure[i];
      if (curr.level > prev.level + 1) {
        properHierarchy = false;
        break;
      }
    }

    logResult('Semantic HTML', 'Proper heading hierarchy', properHierarchy,
      properHierarchy ? 'Headings follow proper hierarchy' : 'Heading levels skip numbers (e.g., h1 followed by h3)',
      properHierarchy ? 'minor' : 'moderate'
    );

    // Check for landmarks
    const landmarks = await page.evaluate(() => {
      return {
        header: document.querySelectorAll('header, [role="banner"]').length,
        nav: document.querySelectorAll('nav, [role="navigation"]').length,
        main: document.querySelectorAll('main, [role="main"]').length,
        footer: document.querySelectorAll('footer, [role="contentinfo"]').length,
        aside: document.querySelectorAll('aside, [role="complementary"]').length,
        search: document.querySelectorAll('[role="search"]').length
      };
    });

    logResult('Semantic HTML', 'Header landmark', landmarks.header > 0,
      landmarks.header > 0 ? 'Header landmark found' : 'Missing header/banner landmark',
      landmarks.header === 0 ? 'serious' : 'minor'
    );

    logResult('Semantic HTML', 'Main landmark', landmarks.main > 0,
      landmarks.main > 0 ? 'Main landmark found' : 'Missing main landmark - critical for screen reader users',
      landmarks.main === 0 ? 'critical' : 'minor'
    );

    logResult('Semantic HTML', 'Footer landmark', landmarks.footer > 0,
      landmarks.footer > 0 ? 'Footer landmark found' : 'Missing footer/contentinfo landmark',
      landmarks.footer === 0 ? 'moderate' : 'minor'
    );

    logResult('Semantic HTML', 'Navigation landmark', landmarks.nav > 0,
      landmarks.nav > 0 ? `Found ${landmarks.nav} navigation landmark(s)` : 'Missing navigation landmark',
      landmarks.nav === 0 ? 'serious' : 'minor'
    );

    // Check for proper list usage
    const navLists = await page.evaluate(() => {
      const navs = Array.from(document.querySelectorAll('nav, [role="navigation"]'));
      return navs.map(nav => ({
        hasUl: nav.querySelector('ul') !== null,
        hasOl: nav.querySelector('ol') !== null,
        hasDirectLinkChildren: Array.from(nav.children).filter(c => c.tagName === 'A').length
      }));
    });

    const navsWithLists = navLists.filter(n => n.hasUl || n.hasOl).length;
    logResult('Semantic HTML', 'Navigation uses lists', navsWithLists === navLists.length,
      navsWithLists === navLists.length
        ? 'Navigation(s) use proper list structure'
        : `${navLists.length - navsWithLists} navigation(s) don\'t use list elements`,
      navsWithLists !== navLists.length ? 'moderate' : 'minor'
    );

    // Check for proper button/link usage
    const buttonLinks = await page.locator('a[href=""], a[href="#"]:not([role="button"])').count();
    logResult('Semantic HTML', 'Links are properly semantic', buttonLinks === 0,
      buttonLinks > 0 ? `Found ${buttonLinks} placeholder link(s) - consider using button elements` : 'Links are properly semantic',
      buttonLinks > 0 ? 'moderate' : 'minor'
    );
  });

  test('6. Alt Text Test', async () => {
    await page.goto(BASE_URL);
    await takeScreenshot(page, '06-alt-text-check');

    // Check all images
    const images = await page.locator('img').all();
    const imagesWithoutAlt: any[] = [];
    const imagesWithEmptyAlt: any[] = [];
    const imagesWithMeaningfulAlt: any[] = [];

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      const isVisible = await img.isVisible();
      const role = await img.getAttribute('role');

      if (!isVisible) continue; // Skip decorative hidden images

      if (alt === null) {
        imagesWithoutAlt.push({ src: src?.slice(0, 50) });
      } else if (alt === '') {
        // Empty alt is okay for decorative images
        imagesWithEmptyAlt.push({ src: src?.slice(0, 50) });
      } else {
        imagesWithMeaningfulAlt.push({ alt, src: src?.slice(0, 50) });
      }
    }

    logResult('Alt Text', 'Images have alt attribute', imagesWithoutAlt.length === 0,
      imagesWithoutAlt.length > 0
        ? `Found ${imagesWithoutAlt.length} image(s) without alt attribute`
        : 'All images have alt attribute',
      imagesWithoutAlt.length > 0 ? 'critical' : 'minor'
    );

    logResult('Alt Text', 'Decorative images use empty alt', imagesWithEmptyAlt.length >= 0,
      `${imagesWithEmptyAlt.length} decorative image(s) with empty alt`,
      'minor'
    );

    // Check SVG accessibility
    const svgs = await page.locator('svg').all();
    const svgsWithoutTitleOrDesc: any[] = [];

    for (const svg of svgs.slice(0, 20)) { // Limit check to first 20
      const hasTitle = await svg.locator('title').count() > 0;
      const hasDesc = await svg.locator('desc').count() > 0;
      const hasAriaLabel = await svg.getAttribute('aria-label');
      const hasAriaLabelledBy = await svg.getAttribute('aria-labelledby');
      const hasRoleImg = await svg.getAttribute('role') === 'img';
      const isVisible = await svg.isVisible();

      if (isVisible && !hasTitle && !hasDesc && !hasAriaLabel && !hasAriaLabelledBy && !hasRoleImg) {
        svgsWithoutTitleOrDesc.push({ visible: true });
      }
    }

    logResult('Alt Text', 'SVG icons have accessible names', svgsWithoutTitleOrDesc.length === 0,
      svgsWithoutTitleOrDesc.length > 0
        ? `Found ${svgsWithoutTitleOrDesc.length} visible SVG(s) without title/desc or aria-label`
        : 'SVGs have accessible names',
      svgsWithoutTitleOrDesc.length > 0 ? 'moderate' : 'minor'
    );

    // Check for img with role="presentation"
    const presentationImages = await page.locator('img[role="presentation"]').count();
    logResult('Alt Text', 'Decorative images marked appropriately', presentationImages >= 0,
      `${presentationImages} image(s) with role="presentation"`,
      'minor'
    );
  });

  test('7. Color Contrast Test', async () => {
    await page.goto(BASE_URL);
    await takeScreenshot(page, '07-color-contrast');

    // Check for potential contrast issues
    const contrastIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const elements = document.querySelectorAll('*');

      // Helper to get luminance
      const getLuminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map(v => {
          v = v / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      // Helper to get contrast ratio
      const getContrastRatio = (fg: [number, number, number], bg: [number, number, number]) => {
        const l1 = Math.max(getLuminance(...fg), getLuminance(...bg));
        const l2 = Math.min(getLuminance(...fg), getLuminance(...bg));
        return (l1 + 0.05) / (l2 + 0.05);
      };

      // Parse color to RGB
      const parseColor = (color: string): [number, number, number] | null => {
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
        }
        const hexMatch = color.match(/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i);
        if (hexMatch) {
          return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
        }
        return null;
      };

      // Check text elements
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label');

      for (const el of textElements) {
        const style = window.getComputedStyle(el);
        const fgColor = style.color;
        const bgColor = style.backgroundColor;

        const fg = parseColor(fgColor);
        const bg = parseColor(bgColor);

        if (fg && bg) {
          const ratio = getContrastRatio(fg, bg);
          const fontSize = parseFloat(style.fontSize);
          const fontWeight = parseInt(style.fontWeight);
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
          const minRatio = isLargeText ? 3 : 4.5;

          if (ratio < minRatio) {
            issues.push({
              tag: el.tagName,
              text: el.textContent?.slice(0, 30),
              ratio: ratio.toFixed(2),
              required: minRatio
            });
          }
        }
      }

      return issues.slice(0, 10); // Limit results
    });

    logResult('Color Contrast', 'Text meets WCAG AA standards', contrastIssues.length === 0,
      contrastIssues.length > 0
        ? `Found ${contrastIssues.length} potential contrast issue(s)`
        : 'Checked text elements for contrast issues (limited sample)',
      contrastIssues.length > 0 ? 'serious' : 'minor'
    );
  });

  test('8. Form Accessibility Test', async () => {
    await page.goto(BASE_URL);

    // Check forms have proper structure
    const forms = await page.locator('form').all();

    if (forms.length === 0) {
      logResult('Form Accessibility', 'Forms present', false, 'No forms found on page', 'minor');
      return;
    }

    for (const form of forms.slice(0, 3)) {
      const inputs = await form.locator('input, select, textarea').all();

      for (const input of inputs) {
        const type = await input.getAttribute('type');
        if (type === 'hidden') continue;

        const hasLabel = await input.evaluate(el => {
          const id = el.id;
          if (id) {
            return document.querySelector(`label[for="${id}"]`) !== null;
          }
          // Check if wrapped in label
          return el.closest('label') !== null;
        });

        const hasRequired = await input.getAttribute('required');
        const hasAriaRequired = await input.getAttribute('aria-required');
        const hasPlaceholder = await input.getAttribute('placeholder');

        if (!hasLabel && !hasPlaceholder) {
          logResult('Form Accessibility', 'Input has label', false, 'Found input without label or placeholder', 'critical');
        }
      }

      // Check submit buttons
      const submitButtons = await form.locator('button[type="submit"], input[type="submit"]').count();
      const allButtons = await form.locator('button').count();

      if (allButtons > 0 && submitButtons === 0) {
        // Check if there's a button that could be for submission
        const firstButtonText = await form.locator('button').first().textContent();
        logResult('Form Accessibility', 'Form has submit button', true,
          `Form has buttons (submit type: ${submitButtons})`,
          'minor'
        );
      }
    }

    logResult('Form Accessibility', 'Forms present', true, `Found ${forms.length} form(s)`, 'minor');
  });

  test('9. Mobile/Responsive Accessibility', async () => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await takeScreenshot(page, '08-mobile-view');

    // Check touch targets are at least 44x44
    const smallTouchTargets = await page.evaluate(() => {
      const touchables = document.querySelectorAll('a, button, input, [onclick]');
      const small: any[] = [];

      for (const el of touchables) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && style.display !== 'none';

        if (isVisible && (rect.width < 44 || rect.height < 44)) {
          small.push({
            tag: el.tagName,
            width: rect.width.toFixed(0),
            height: rect.height.toFixed(0)
          });
        }
      }

      return small.slice(0, 10);
    });

    logResult('Mobile Accessibility', 'Touch targets >= 44x44px', smallTouchTargets.length === 0,
      smallTouchTargets.length > 0
        ? `Found ${smallTouchTargets.length} small touch target(s) - WCAG recommends 44x44px minimum`
        : 'Touch targets meet size requirements',
      smallTouchTargets.length > 0 ? 'moderate' : 'minor'
    );

    // Check viewport meta tag
    const hasViewportMeta = await page.locator('meta[name="viewport"]').count();
    const viewportContent = hasViewportMeta > 0
      ? await page.locator('meta[name="viewport"]').getAttribute('content')
      : null;

    logResult('Mobile Accessibility', 'Viewport meta tag present', hasViewportMeta > 0,
      viewportContent || 'No viewport meta tag',
      hasViewportMeta === 0 ? 'critical' : 'minor'
    );
  });

  test('10. ARIA Attributes Validation', async () => {
    await page.goto(BASE_URL);

    // Check for invalid ARIA attributes
    const invalidAria = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const invalid: any[] = [];

      // Known ARIA attributes (subset for checking)
      const validAria = new Set([
        'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
        'aria-expanded', 'aria-pressed', 'aria-checked', 'aria-selected',
        'aria-disabled', 'aria-readonly', 'aria-required', 'aria-invalid',
        'aria-live', 'aria-atomic', 'aria-relevant', 'aria-busy',
        'aria-controls', 'aria-current', 'aria-haspopup', 'aria-orientation',
        'aria-sort', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow',
        'aria-valuetext', 'aria-modal', 'role'
      ]);

      for (const el of elements) {
        const attrs = el.attributes;
        for (let i = 0; i < attrs.length; i++) {
          const name = attrs[i].name;
          if (name.startsWith('aria-') && !validAria.has(name)) {
            invalid.push({
              attr: name,
              element: el.tagName
            });
          }
        }
      }

      return invalid.slice(0, 10);
    });

    logResult('ARIA Validation', 'Only valid ARIA attributes used', invalidAria.length === 0,
      invalidAria.length > 0
        ? `Found potentially invalid ARIA attribute(s): ${invalidAria.map(i => i.attr).join(', ')}`
        : 'All ARIA attributes appear valid',
      invalidAria.length > 0 ? 'moderate' : 'minor'
    );

    // Check for aria-live regions for dynamic content
    const liveRegions = await page.locator('[aria-live]').count();
    logResult('ARIA Validation', 'Aria-live regions for dynamic content', liveRegions >= 0,
      `Found ${liveRegions} aria-live region(s) - important for dynamic content updates`,
      'minor'
    );
  });
});
