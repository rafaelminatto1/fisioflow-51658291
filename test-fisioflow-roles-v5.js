/**
 * FisioFlow RBAC Test - Version 5
 * Enhanced debugging and error capture
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://fisioflow-migration.web.app';
const SCREENSHOT_DIR = '/tmp/fisioflow-screenshots';

const TEST_USERS = [
  {
    id: 'admin',
    name: 'Rafael Minatto (Admin)',
    email: 'rafael.minatto@yahoo.com.br',
    password: 'Yukari30@',
    expectedFeatures: ['Administração', 'Financeiro', 'Pacientes', 'Prontuário'],
    notExpectedFeatures: []
  },
  {
    id: 'recepcionista',
    name: 'Fernanda (Recepcionista)',
    email: 'fernanda@clinicaprincipal.com.br',
    password: 'Fisio123!',
    expectedFeatures: ['Agenda', 'Pacientes'],
    notExpectedFeatures: ['Administração', 'Financeiro', 'Prontuário']
  },
  {
    id: 'fisioterapeuta',
    name: 'Dr. Carlos Silva (Fisioterapeuta)',
    email: 'carlos.silva@clinicaprincipal.com.br',
    password: 'Fisio123!',
    expectedFeatures: ['Pacientes', 'Prontuário', 'Exercícios'],
    notExpectedFeatures: ['Financeiro', 'Administração']
  },
  {
    id: 'estagiario',
    name: 'Lucas Mendes (Estagiário)',
    email: 'lucas.mendes@clinicaprincipal.com.br',
    password: 'Fisio123!',
    expectedFeatures: [],
    notExpectedFeatures: ['Administração', 'Financeiro']
  },
  {
    id: 'paciente',
    name: 'Roberto Almeida (Paciente)',
    email: 'roberto.almeida@gmail.com',
    password: 'Fisio123!',
    expectedFeatures: [],
    notExpectedFeatures: ['Administração', 'Financeiro', 'Pacientes']
  }
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSingleUser(user, index) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`[${index + 1}/${TEST_USERS.length}] TESTING: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`${'='.repeat(100)}`);

  const result = {
    ...user,
    success: false,
    loginStatus: 'unknown',
    screenshot: null,
    pageInfo: null,
    consoleErrors: [],
    networkErrors: [],
    visibleFeatures: [],
    missingFeatures: [],
    unexpectedFeatures: []
  };

  // Create fresh browser
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();

  // Capture ALL console messages
  const consoleMsgs = [];
  page.on('console', msg => {
    const msgObj = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: Date.now()
    };
    consoleMsgs.push(msgObj);

    // Log errors immediately
    if (msg.type() === 'error') {
      console.log(`  [CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    const msgObj = {
      type: 'pageerror',
      text: err.message,
      stack: err.stack,
      timestamp: Date.now()
    };
    consoleMsgs.push(msgObj);
    console.log(`  [PAGE ERROR] ${err.message}`);
  });

  // Capture network failures
  page.on('requestfailed', request => {
    const msgObj = {
      type: 'request-failed',
      text: `${request.failure()?.errorText || 'unknown'} - ${request.url()}`,
      timestamp: Date.now()
    };
    consoleMsgs.push(msgObj);
    console.log(`  [REQUEST FAILED] ${request.failure()?.errorText} - ${request.url()}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      const msgObj = {
        type: 'http-error',
        text: `${response.status()} ${response.status() === 0 ? '(network error)' : response.statusText()} - ${response.url()}`,
        timestamp: Date.now()
      };
      consoleMsgs.push(msgObj);
      console.log(`  [HTTP ERROR] ${response.status()} - ${response.url()}`);
    }
  });

  await page.setViewport({ width: 1920, height: 1080 });

  // Enable verbose logging
  await page.on('framenavigated', frame => {
    console.log(`  [NAVIGATED] ${frame.url()}`);
  });

  try {
    console.log(`[1] Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);

    let currentUrl = page.url();
    console.log(`[2] Current URL: ${currentUrl}`);

    // Get initial page state
    const initialInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasEmailField: !!document.querySelector('input[type="email"], input[name="email"]'),
        bodyTextPreview: document.body?.innerText?.substring(0, 500) || ''
      };
    });
    console.log(`  Initial state - Title: ${initialInfo.title}, Has email field: ${initialInfo.hasEmailField}`);

    // Find and fill email
    console.log(`[3] Looking for email field...`);
    const emailSelectors = ['input[type="email"]', 'input[name="email"]', '#email'];

    let emailField = null;
    for (const sel of emailSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          emailField = sel;
          console.log(`  Found: ${sel}`);
          break;
        }
      } catch {}
    }

    if (!emailField) {
      console.log(`  No email field found. Current page preview:`);
      console.log(`  ${initialInfo.bodyTextPreview.substring(0, 200)}`);

      result.pageInfo = await page.evaluate(() => ({
        title: document.title,
        url: window.location.href,
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()),
        bodyText: document.body?.innerText?.substring(0, 5000) || '',
        allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(t => t)
      }));

      result.loginStatus = 'no-login-form';
      await browser.close();
      return result;
    }

    // Fill credentials
    console.log(`[4] Filling credentials...`);
    await page.click(emailField, { clickCount: 3 });
    await page.type(emailField, user.email, { delay: 50 });
    console.log(`  Email entered: ${user.email}`);

    // Find and fill password
    const passSelectors = ['input[type="password"]', 'input[name="password"]', '#password'];
    for (const sel of passSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 2000 });
        await page.click(sel, { clickCount: 3 });
        await page.type(sel, user.password, { delay: 50 });
        console.log(`  Password entered`);
        break;
      } catch {}
    }

    await delay(1000);

    // Screenshot before submit
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${user.id}-before-submit.png`) });

    // Submit
    console.log(`[5] Submitting form...`);

    // Try multiple submit methods
    let submitted = false;

    // Method 1: Click submit button
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      submitted = true;
      console.log(`  Clicked submit button`);
    } else {
      // Method 2: Click button by text
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        for (const btn of btns) {
          const txt = (btn.textContent || '').toLowerCase();
          if (txt.includes('entrar') || txt.includes('login') || txt.includes('acessar') || txt.includes('sign in')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      if (clicked) {
        submitted = true;
        console.log(`  Clicked button by text`);
      }
    }

    if (!submitted) {
      console.log(`  WARNING: Could not submit form normally`);
      // Try form submit
      try {
        await page.evaluate(() => {
          document.querySelector('form')?.requestSubmit();
        });
      } catch {}
    }

    // Wait for navigation/result
    console.log(`[6] Waiting for result (25s)...`);

    // Monitor URL changes
    let urlChanges = [];
    const currentUrlStart = page.url();
    page.on('framenavigated', frame => {
      urlChanges.push(frame.url());
    });

    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }),
        delay(25000)
      ]);
    } catch {}

    await delay(5000); // Extra wait for content

    const finalUrl = page.url();
    console.log(`[7] Final URL: ${finalUrl}`);
    console.log(`  URL changes detected: ${urlChanges.length > 0 ? urlChanges.join(' -> ') : 'none'}`);

    // Screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${user.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    result.screenshot = screenshotPath;
    console.log(`  Screenshot: ${screenshotPath}`);

    console.log(`[8] Analyzing result...`);

    const pageInfo = await page.evaluate(() => {
      const bodyText = document.body?.innerText || '';

      return {
        title: document.title,
        url: window.location.href,
        bodyText: bodyText.substring(0, 15000),
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()),
        h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent?.trim()),
        navLinks: Array.from(document.querySelectorAll('nav a, aside a, [role="navigation"] a'))
          .map(a => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }))
          .filter(l => l.text),
        allButtons: Array.from(document.querySelectorAll('button:not([style*="display: none"])'))
          .map(b => b.textContent?.trim())
          .filter(t => t),
        errors: Array.from(document.querySelectorAll('[role="alert"], .error, .error-message'))
          .map(e => e.textContent?.trim())
          .filter(t => t),
        localStorageKeys: Object.keys(localStorage || {}),
        hasUser: !!localStorage.getItem('user') || !!localStorage.getItem('authUser')
      };
    });

    result.pageInfo = pageInfo;

    console.log(`  H1: ${pageInfo.h1.join(', ') || 'none'}`);
    console.log(`  H2: ${pageInfo.h2.join(', ') || 'none'}`);
    console.log(`  Buttons: ${pageInfo.allButtons.join(', ') || 'none'}`);
    console.log(`  Errors on page: ${pageInfo.errors.join(', ') || 'none'}`);
    console.log(`  localStorage keys: ${pageInfo.localStorageKeys.join(', ') || 'none'}`);
    console.log(`  Has user in storage: ${pageInfo.hasUser}`);

    // Determine login status
    if (finalUrl.includes('pending-approval')) {
      result.loginStatus = 'pending-approval';
      result.success = true;
      console.log(`  STATUS: Account pending approval`);
    } else if (pageInfo.h1.some(h => h.includes('Ops') || h.includes('Erro') || h.includes('Error'))) {
      result.loginStatus = 'error-page';
      result.success = false;
      console.log(`  STATUS: Error page displayed`);
    } else if (pageInfo.bodyText.toLowerCase().includes('login') && pageInfo.bodyText.toLowerCase().includes('password')) {
      result.loginStatus = 'still-on-login';
      result.success = false;
      console.log(`  STATUS: Still on login page (credentials may be invalid)`);
    } else if (pageInfo.navLinks.length > 0) {
      result.loginStatus = 'success';
      result.success = true;
      console.log(`  STATUS: Login successful - found navigation`);
    } else if (pageInfo.bodyText.includes('Pacientes') || pageInfo.bodyText.includes('Dashboard')) {
      result.loginStatus = 'success-no-nav';
      result.success = true;
      console.log(`  STATUS: Login successful - content detected`);
    } else {
      result.loginStatus = 'unknown';
      result.success = false;
      console.log(`  STATUS: Unknown state`);
    }

    // Check features
    const pageText = pageInfo.bodyText.toLowerCase();
    const navText = pageInfo.navLinks.map(l => l.text).join(' ').toLowerCase();

    for (const feat of user.expectedFeatures) {
      if (pageText.includes(feat.toLowerCase()) || navText.includes(feat.toLowerCase())) {
        result.visibleFeatures.push(feat);
      } else {
        result.missingFeatures.push(feat);
      }
    }

    for (const feat of user.notExpectedFeatures) {
      if (pageText.includes(feat.toLowerCase()) || navText.includes(feat.toLowerCase())) {
        result.unexpectedFeatures.push(feat);
      }
    }

  } catch (error) {
    console.error(`  EXCEPTION: ${error.message}`);
    result.loginStatus = 'exception';
    result.success = false;
  }

  result.consoleErrors = consoleMsgs.filter(m => m.type === 'error' || m.type === 'pageerror');
  result.networkErrors = consoleMsgs.filter(m => m.type === 'http-error' || m.type === 'request-failed');

  console.log(`\n  SUMMARY:`);
  console.log(`    Login Status: ${result.loginStatus}`);
  console.log(`    Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`    Console Errors: ${result.consoleErrors.length}`);
  console.log(`    Network Errors: ${result.networkErrors.length}`);

  await browser.close();
  return result;
}

function generateReport(results) {
  console.log(`\n\n${'='.repeat(120)}`);
  console.log('FISIOFLOW RBAC TEST RESULTS - FINAL REPORT');
  console.log(`${'='.repeat(120)}\n`);

  console.log(`┌${'─'.repeat(16)}┬${'─'.repeat(32)}┬${'─'.repeat(24)}┬${'─'.repeat(12)}┬${'─'.repeat(12)}┬${'─'.repeat(10)}┐`);
  console.log(`│${'Role'.padEnd(16)}│${'User'.padEnd(32)}│${'Status'.padEnd(24)}│${'Expected'.padEnd(12)}│${'Unexpected'.padEnd(12)}│${'Errors'.padEnd(10)}│`);
  console.log(`├${'─'.repeat(16)}┼${'─'.repeat(32)}┼${'─'.repeat(24)}┼${'─'.repeat(12)}┼${'─'.repeat(12)}┼${'─'.repeat(10)}┤`);

  results.forEach(r => {
    const role = r.id.padEnd(16);
    const user = r.name.substring(0, 31).padEnd(32);
    const status = r.loginStatus.padEnd(24);
    const expected = `${r.visibleFeatures.length}/${r.expectedFeatures.length}`.padEnd(12);
    const unexpected = r.unexpectedFeatures.length.toString().padEnd(12);
    const errors = (r.consoleErrors.length + r.networkErrors.length).toString().padEnd(10);
    console.log(`│${role}│${user}│${status}│${expected}│${unexpected}│${errors}│`);
  });

  console.log(`└${'─'.repeat(16)}┴${'─'.repeat(32)}┴${'─'.repeat(24)}┴${'─'.repeat(12)}┴${'─'.repeat(12)}┴${'─'.repeat(10)}┘\n`);

  // Detailed results
  results.forEach((r, i) => {
    console.log(`${'─'.repeat(120)}`);
    console.log(`${i + 1}. ${r.name} (${r.id})`);
    console.log(`   Email: ${r.email}`);
    console.log(`   Login Status: ${r.loginStatus.toUpperCase()}`);
    console.log(`   Success: ${r.success ? 'YES' : 'NO'}`);
    console.log(`   Screenshot: ${r.screenshot || 'N/A'}`);

    if (r.pageInfo) {
      console.log(`   Final URL: ${r.pageInfo.url}`);
      if (r.pageInfo.h1.length > 0) {
        console.log(`   Page Heading: ${r.pageInfo.h1.join(', ')}`);
      }
      if (r.pageInfo.errors.length > 0) {
        console.log(`   On-Page Errors: ${r.pageInfo.errors.join('; ')}`);
      }
      if (r.pageInfo.navLinks.length > 0) {
        console.log(`   Navigation: ${r.pageInfo.navLinks.map(l => l.text).join(', ')}`);
      }
      if (r.pageInfo.allButtons.length > 0) {
        console.log(`   Buttons: ${r.pageInfo.allButtons.join(', ')}`);
      }
      console.log(`   LocalStorage: ${r.pageInfo.localStorageKeys.join(', ') || 'empty'}`);
    }

    if (r.expectedFeatures.length > 0) {
      console.log(`   Expected Features:`);
      r.expectedFeatures.forEach(f => {
        const found = r.visibleFeatures.includes(f);
        console.log(`     ${found ? '✓' : '✗'} ${f}`);
      });
    }

    if (r.notExpectedFeatures.length > 0) {
      console.log(`   Restricted Features:`);
      r.notExpectedFeatures.forEach(f => {
        const found = r.unexpectedFeatures.includes(f);
        console.log(`     ${found ? '⚠ VISIBLE' : '✓ Hidden'}: ${f}`);
      });
    }

    if (r.consoleErrors.length > 0) {
      console.log(`   Console Errors (${r.consoleErrors.length}):`);
      r.consoleErrors.slice(0, 3).forEach(e => console.log(`     - ${e.text.substring(0, 100)}`));
    }

    if (r.networkErrors.length > 0) {
      console.log(`   Network Errors (${r.networkErrors.length}):`);
      r.networkErrors.slice(0, 3).forEach(e => console.log(`     - ${e.text.substring(0, 100)}`));
    }

    console.log('');
  });

  // Save JSON
  const jsonPath = path.join(SCREENSHOT_DIR, 'test-results-final.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${jsonPath}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}\n`);
}

async function main() {
  console.log('FisioFlow RBAC Test v5 - Final');
  console.log('================================\n');

  const results = [];
  for (let i = 0; i < TEST_USERS.length; i++) {
    const result = await testSingleUser(TEST_USERS[i], i);
    results.push(result);
    await delay(3000);
  }

  generateReport(results);
}

main().catch(console.error);
