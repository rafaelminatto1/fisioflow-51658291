
/**
 * FASE 5: Testes de Acessibilidade (10 min)
 * Tests to perform:
 * 1. Navegação por Teclado
 * 2. ARIA Labels
 * 3. Contraste
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const report = {
  timestamp: new Date().toISOString(),
  url: 'https://moocafisio.com.br',
  tests: {
    keyboardNavigation: {
      description: 'Navegação por Teclado',
      issues: [],
      pass: false
    },
    ariaLabels: {
      description: 'ARIA Labels',
      issues: [],
      pass: false
    },
    contrast: {
      description: 'Contraste',
      issues: [],
      pass: false
    }
  }
};

async function testKeyboardNavigation(page) {
  console.log('\n🎹 Testing Keyboard Navigation...');

  const issues = [];

  try {
    // Check if tab navigation is working
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Check for focus indicators
    const focusedElement = await page.$(':focus');
    if (!focusedElement) {
      issues.push('No focused element detected after Tab press');
    } else {
      const elementInfo = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id,
          classes: el.className,
          role: el.getAttribute('role'),
          tabIndex: el.getAttribute('tabindex')
        };
      });

      // Check for visible focus indicator
      const isFocused = await page.evaluate(() => {
        const el = document.activeElement;
        const style = window.getComputedStyle(el);
        return style.outline !== 'none' ||
               style.boxShadow !== 'none' ||
               style.border.includes('solid') ||
               el.hasAttribute('aria-selected') ||
               el.hasAttribute('aria-expanded');
      });

      if (!isFocused) {
        issues.push(`Element ${elementInfo.tag}#${elementInfo.id} has no visible focus indicator`);
      }

      // Check for logical tab order
      const tabOrderIssues = await checkTabOrder(page);
      issues.push(...tabOrderIssues);
    }

    // Test navigation through interactive elements
    const interactiveElements = await page.$$('[tabindex], button, a, input, select, textarea');
    for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      const currentFocus = await page.$(':focus');
      if (!currentFocus) {
        issues.push(`Interactive element ${i + 1} is not focusable`);
      }
    }

    report.tests.keyboardNavigation.issues = issues;
    report.tests.keyboardNavigation.pass = issues.length === 0;

    if (issues.length > 0) {
      console.log(`❌ Found ${issues.length} keyboard navigation issues`);
    } else {
      console.log('✅ All keyboard navigation tests passed');
    }

  } catch (error) {
    console.error('Error testing keyboard navigation:', error);
    issues.push('Error testing keyboard navigation: ' + error.message);
    report.tests.keyboardNavigation.issues = issues;
  }
}

async function checkTabOrder(page) {
  const tabOrderIssues = [];

  try {
    // Get all tabable elements in order
    const elements = await page.evaluate(() => {
      const tabableElements = [];
      const elements = document.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      elements.forEach((el, index) => {
        tabableElements.push({
          element: el,
          index: index,
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          classes: el.className || '',
          tabIndex: el.getAttribute('tabindex') || 'auto'
        });
      });

      return tabableElements;
    });

    // Check if tabindex is reasonable
    elements.forEach(item => {
      const tabIndex = item.tabIndex;
      if (tabIndex !== 'auto' && parseInt(tabIndex) > 0) {
        tabOrderIssues.push(
          `Element ${item.tag}#${item.id} has tabindex ${tabIndex}. Consider if this is necessary or if it should be 0.`
        );
      }

      // Check for missing labels
      if (item.element.tagName === 'INPUT' &&
          item.element.getAttribute('type') !== 'button' &&
          item.element.getAttribute('type') !== 'submit' &&
          item.element.getAttribute('type') !== 'image' &&
          !item.element.getAttribute('aria-label') &&
          !item.element.getAttribute('aria-labelledby') &&
          !item.element.id) {
        tabOrderIssues.push(
          `Input element ${item.tag}#${item.id} is missing accessible label`
        );
      }
    });

  } catch (error) {
    console.error('Error checking tab order:', error);
    tabOrderIssues.push('Error checking tab order: ' + error.message);
  }

  return tabOrderIssues;
}

async function testARIALabels(page) {
  console.log('\n🏷️ Testing ARIA Labels...');

  const issues = [];

  try {
    // Check for inputs without proper labels
    const inputs = await page.$$('input, textarea, select');
    for (const input of inputs) {
      const info = await input.evaluate(el => ({
        type: el.type || el.tagName.toLowerCase(),
        id: el.id,
        name: el.name,
        label: el.getAttribute('aria-label'),
        labelledby: el.getAttribute('aria-labelledby'),
        placeholder: el.placeholder,
        alt: el.getAttribute('alt')
      }));

      if (!info.label && !info.labelledby && !info.id && !info.placeholder) {
        issues.push(
          `Input/textarea/select without accessible label: type=${info.type}, id=${info.id}, name=${info.name}`
        );
      }
    }

    // Check for buttons without aria-label
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const info = await button.evaluate(el => ({
        text: el.textContent?.trim() || '',
        id: el.id,
        ariaLabel: el.getAttribute('aria-label'),
        classes: el.className || ''
      }));

      if (!info.text && !info.ariaLabel) {
        issues.push(`Button without text or aria-label: id=${info.id}`);
      } else if (info.text.length > 0 && !info.ariaLabel) {
        // Check if text is descriptive enough
        if (info.text.length < 3) {
          issues.push(`Button with short text that could benefit from aria-label: "${info.text}"`);
        }
      }
    }

    // Check for images without alt attributes
    const images = await page.$$('img');
    for (const img of images) {
      const info = await img.evaluate(el => ({
        src: el.src,
        alt: el.getAttribute('alt'),
        id: el.id,
        classes: el.className || ''
      }));

      if (!info.alt && !info.id && !info.classes.includes('decorative')) {
        issues.push(`Image without alt attribute: src=${info.src}`);
      }
    }

    // Check for form elements without proper associations
    const formElements = await page.$$('form input, form textarea, form select');
    for ( const element of formElements) {
      const info = await element.evaluate(el => ({
        type: el.type || el.tagName.toLowerCase(),
        name: el.name,
        id: el.id,
        formId: el.form ? el.form.id : null,
        labelledby: el.getAttribute('aria-labelledby')
      }));

      if (!info.id && !info.name && !info.labelledby) {
        issues.push(
          `Form element missing identification: type=${info.type}, name=${info.name}, form=${info.formId}`
        );
      }
    }

    report.tests.ariaLabels.issues = issues;
    report.tests.ariaLabels.pass = issues.length === 0;

    if (issues.length > 0) {
      console.log(`❌ Found ${issues.length} ARIA label issues`);
    } else {
      console.log('✅ All ARIA label tests passed');
    }

  } catch (error) {
    console.error('Error testing ARIA labels:', error);
    issues.push('Error testing ARIA labels: ' + error.message);
    report.tests.ariaLabels.issues = issues;
  }
}

async function testColorContrast(page) {
  console.log('\n🎨 Testing Color Contrast...');

  const issues = [];

  try {
    // Check for high-contrast text elements
    const textElements = await page.evaluate(() => {
      const elements = [];
      const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');

      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const text = el.textContent?.trim();

        if (text && text.length > 3) {
          // Check if text color is not default
          if (style.color !== 'rgb(0, 0, 0)' && style.color !== 'rgb(255, 255, 255)') {
            elements.push({
              element: el,
              text: text.substring(0, 100),
              color: style.color,
              background: style.backgroundColor,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              parentBackground: el.parentElement ? window.getComputedStyle(el.parentElement).backgroundColor : 'transparent'
            });
          }
        }
      });

      return elements;
    });

    // Check contrast for important elements
    for (const element of textElements) {
      // Simple contrast check (this is basic - would need proper WCAG calculation)
      const textColor = element.color;
      const bgColor = element.background === 'rgba(0, 0, 0, 0)' ? element.parentBackground : element.background;

      // Extract RGB values
      const textColorRGB = extractRGB(textColor);
      const bgColorRGB = extractRGB(bgColor);

      if (textColorRGB && bgColorRGB) {
        // Simple luminance calculation (simplified for demonstration)
        const textLuminance = calculateLuminance(textColorRGB);
        const bgLuminance = calculateLuminance(bgColorRGB);
        const contrastRatio = textLuminance > bgLuminance ?
          (textLuminance + 0.05) / (bgLuminance + 0.05) :
          (bgLuminance + 0.05) / (textLuminance + 0.05);

        // Log potential issues for manual verification
        if (element.fontSize < '16px' && element.fontWeight < 'bold') {
          issues.push({
            element: `Text element with fontSize ${element.fontSize}`,
            text: element.text,
            color: textColor,
            background: bgColor,
            contrast: contrastRatio.toFixed(2),
            note: 'Small text may need higher contrast'
          });
        }
      }
    }

    // Check for low-contrast color combinations in UI elements
    const uiElements = await page.evaluate(() => {
      const elements = [];
      const selectors = ['button', '.btn', 'a', '.nav-item', '.menu-item'];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const style = window.getComputedStyle(el);
          const bgColor = style.backgroundColor;
          const textColor = style.color;

          if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'rgb(255, 255, 255)' &&
              textColor !== 'rgb(0, 0, 0)' && textColor !== 'rgb(255, 255, 255)') {
            elements.push({
              element: selector,
              color: textColor,
              background: bgColor
            });
          }
        });
      });

      return elements;
    });

    uiElements.forEach(item => {
      const bgColorRGB = extractRGB(item.background);
      const textColorRGB = extractRGB(item.color);

      if (bgColorRGB && textColorRGB) {
        const contrastRatio = calculateContrastRatio(bgColorRGB, textColorRGB);
        issues.push({
          element: `UI element (${item.element})`,
          contrast: contrastRatio.toFixed(2),
          color: item.color,
          background: item.background,
          note: 'Manual contrast check recommended'
        });
      }
    });

    report.tests.contrast.issues = issues;
    report.tests.contrast.pass = issues.length === 0;

    if (issues.length > 0) {
      console.log(`⚠️ Found ${issues.length} potential contrast issues (manual review required)`);
    } else {
      console.log('✅ No obvious contrast issues found');
    }

  } catch (error) {
    console.error('Error testing color contrast:', error);
    issues.push('Error testing color contrast: ' + error.message);
    report.tests.contrast.issues = issues;
  }
}

function extractRGB(color) {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
  }
  return null;
}

function calculateLuminance(rgb) {
  const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linearRGB = sRGB.map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * linearRGB[0] + 0.7152 * linearRGB[1] + 0.0722 * linearRGB[2];
}

function calculateContrastRatio(rgb1, rgb2) {
  const lum1 = calculateLuminance(rgb1);
  const lum2 = calculateLuminance(rgb2);
  return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

async function takeAccessibilityScreenshots(page, testName) {
  try {
    await page.screenshot({
      path: `/home/rafael/antigravity/fisioflow/fisioflow-51658291/fase5-accessibility-${testName}-${Date.now()}.png`,
      fullPage: false
    });
    console.log(`📸 Screenshot saved for ${testName}`);
  } catch (error) {
    console.error('Error taking screenshot:', error);
  }
}

async function main() {
  console.log('🔍 Starting FASE 5: Accessibility Testing');
  console.log('=========================================');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('\n📍 Navigating to moocafisio.com.br...');
    await page.goto('https://moocafisio.com.br', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Take initial screenshot
    await takeAccessibilityScreenshots(page, 'initial');

    // Perform login
    console.log('\n🔐 Logging in...');
    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    await page.waitForTimeout(5000);

    // Take screenshot after login
    await takeAccessibilityScreenshots(page, 'after-login');

    // Run accessibility tests
    await testKeyboardNavigation(page);
    await takeAccessibilityScreenshots(page, 'keyboard-nav');

    await testARIALabels(page);
    await takeAccessibilityScreenshots(page, 'aria-labels');

    await testColorContrast(page);
    await takeAccessibilityScreenshots(page, 'contrast');

    // Generate report
    const testResults = {
      timestamp: report.timestamp,
      url: report.url,
      summary: {
        totalTests: 3,
        passedTests: [
          report.tests.keyboardNavigation.pass ? 'Keyboard Navigation' : '',
          report.tests.ariaLabels.pass ? 'ARIA Labels' : '',
          report.tests.contrast.pass ? 'Color Contrast' : ''
        ].filter(Boolean).length,
        failedTests: 3 - [
          report.tests.keyboardNavigation.pass ? 'Keyboard Navigation' : '',
          report.tests.ariaLabels.pass ? 'ARIA Labels' : '',
          report.tests.contrast.pass ? 'Color Contrast' : ''
        ].filter(Boolean).length,
        totalIssues: [
          ...report.tests.keyboardNavigation.issues,
          ...report.tests.ariaLabels.issues,
          ...report.tests.contrast.issues
        ].length
      },
      details: {
        keyboardNavigation: report.tests.keyboardNavigation,
        ariaLabels: report.tests.ariaLabels,
        contrast: report.tests.contrast
      }
    };

    // Save test results
    const reportPath = '/home/rafael/antigravity/fisioflow/fisioflow-51658291/fase5-accessibility-report.json';
    await fs.writeFile(reportPath, JSON.stringify(testResults, null, 2));

    // Save HTML report
    const htmlReport = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fase 5 - Relatório de Testes de Acessibilidade</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        .summary {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .metric {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        .metric-label {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        .test-section {
            margin-bottom: 40px;
        }
        .test-status {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .pass {
            background: #d4edda;
            color: #155724;
        }
        .fail {
            background: #f8d7da;
            color: #721c24;
        }
        .issue-list {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-top: 15px;
        }
        .issue {
            background: white;
            padding: 10px;
            margin-bottom: 10px;
            border-left: 4px solid #dc3545;
            border-radius: 3px;
        }
        .code {
            background: #f1f1f1;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }
        footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Fase 5 - Relatório de Testes de Acessibilidade</h1>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>URL Testada:</strong> <a href="${testResults.url}">${testResults.url}</a></p>

        <div class="summary">
            <h2>📊 Resumo Executivo</h2>
            <div class="summary-grid">
                <div class="metric">
                    <div class="metric-value">${testResults.summary.totalTests}</div>
                    <div class="metric-label">Testes Realizados</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${testResults.summary.passedTests}</div>
                    <div class="metric-label">Passaram</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${testResults.summary.failedTests}</div>
                    <div class="metric-label">Falharam</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${testResults.summary.totalIssues}</div>
                    <div class="metric-label">Issues Encontradas</div>
                </div>
            </div>
        </div>

        <div class="test-section">
            <h2>1. 🎹 Navegação por Teclado</h2>
            <div class="test-status ${testResults.details.keyboardNavigation.pass ? 'pass' : 'fail'}">
                ${testResults.details.keyboardNavigation.pass ? '✅ Aprovado' : '❌ Falhou'}
            </div>
            ${testResults.details.keyboardNavigation.issues.length > 0 ? `
            <div class="issue-list">
                <h3>Issues Encontradas:</h3>
                ${testResults.details.keyboardNavigation.issues.map(issue =>
                    `<div class="issue">${issue}</div>`
                ).join('')}
            </div>
            ` : '<p>Nenhum issue encontrado.</p>'}
        </div>

        <div class="test-section">
            <h2>2. 🏷️ ARIA Labels</h2>
            <div class="test-status ${testResults.details.ariaLabels.pass ? 'pass' : 'fail'}">
                ${testResults.details.ariaLabels.pass ? '✅ Aprovado' : '❌ Falhou'}
            </div>
            ${testResults.details.ariaLabels.issues.length > 0 ? `
            <div class="issue-list">
                <h3>Issues Encontradas:</h3>
                ${testResults.details.ariaLabels.issues.map(issue =>
                    `<div class="issue">${issue}</div>`
                ).join('')}
            </div>
            ` : '<p>Nenhum issue encontrado.</p>'}
        </div>

        <div class="test-section">
            <h2>3. 🎨 Contraste de Cores</h2>
            <div class="test-status ${testResults.details.contrast.pass ? 'pass' : 'fail'}">
                ${testResults.details.contrast.pass ? '✅ Aprovado' : '❌ Falhou'}
            </div>
            ${testResults.details.contrast.issues.length > 0 ? `
            <div class="issue-list">
                <h3>Issues Encontradas:</h3>
                ${testResults.details.contrast.issues.map(issue =>
                    `<div class="issue">
                        <strong>${issue.element}</strong><br>
                        Contraste: ${issue.contrast}:1<br>
                        Cor: <span class="code">${issue.color}</span><br>
                        Fundo: <span class="code">${issue.background}</span><br>
                        ${issue.note ? `<small>${issue.note}</small>` : ''}
                    </div>`
                ).join('')}
            </div>
            ` : '<p>Nenhum issue encontrado.</p>'}
        </div>

        <footer>
            <p>Teste gerado automaticamente pelo sistema de testes FisioFlow</p>
        </footer>
    </div>
</body>
</html>
    `;

    const htmlReportPath = '/home/rafael/antigravity/fisioflow/fisioflow-51658291/fase5-accessibility-report.html';
    await fs.writeFile(htmlReportPath, htmlReport);

    console.log('\n📄 Test Report Generated:');
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);

    // Print summary
    console.log('\n📋 Test Summary:');
    console.log(`   Total Tests: ${testResults.summary.totalTests}`);
    console.log(`   Passed: ${testResults.summary.passedTests}`);
    console.log(`   Failed: ${testResults.summary.failedTests}`);
    console.log(`   Total Issues: ${testResults.summary.totalIssues}`);

  } catch (error) {
    console.error('Error during testing:', error);
    const errorReport = {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    await fs.writeFile('/home/rafael/antigravity/fisioflow/fisioflow-51658291/fase5-accessibility-error.json', JSON.stringify(errorReport, null, 2));
  } finally {
    await browser.close();
  }
}

// Run the tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});