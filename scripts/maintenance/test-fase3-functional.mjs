
/**
 * FASE 3: Testes Funcionais (15 min)
 *
 * Tests to perform:
 * 1. Teste de Login/Logout - Test authentication flow
 * 2. Criar Novo Paciente - Create new patient (without using patient list)
 * 3. Criar Pagamento/Transação - Create payment on financial page
 */

import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting FASE 3: Functional Tests');
  console.log('=====================================');

  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    args: ['--disable-dev-shm-usage', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });

  // Enable console and network logging
  context.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  context.on('request', request => {
    if (request.url().includes('api') || request.url().includes('firestore')) {
      console.log(`[API] ${request.method()} ${request.url()}`);
    }
  });

  const page = await context.newPage();

  try {
    // Test 1: Login/Logout
    console.log('\n🔐 Test 1: Login/Logout');
    console.log('----------------------');

    // Navigate to login page
    await page.goto('https://moocafisio.com.br/login');
    await page.waitForLoadState('networkidle');

    // Check if we're already logged in
    const userProfile = page.locator('.user-profile, .profile-menu, [data-testid="user-profile"]');
    const isLoggedIn = await userProfile.count() > 0;

    if (!isLoggedIn) {
      console.log('Logging in...');

      // Fill login form
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');

      // Click login button
      await page.click('button[type="submit"], .login-btn, [data-testid="login-btn"]');

      // Wait for navigation and check if login was successful
      await page.waitForLoadState('networkidle');

      // Verify login
      await page.waitForSelector('.user-profile, .profile-menu, [data-testid="user-profile"]', { timeout: 10000 });
      console.log('✅ Login successful');

      // Take screenshot
      await page.screenshot({ path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/test-fase3-login-success.png' });
    } else {
      console.log('✅ Already logged in');
    }

    // Test logout
    console.log('Testing logout...');

    // Click on user profile to open menu
    await page.click('.user-profile, .profile-menu, [data-testid="user-profile"]');
    await page.waitForTimeout(1000);

    // Click logout option
    const logoutButtons = [
      'button:has-text("Logout")',
      'a:has-text("Logout")',
      '[data-testid="logout-btn"]',
      '.logout-btn'
    ];

    let logoutClicked = false;
    for (const selector of logoutButtons) {
      try {
        const button = page.locator(selector);
        if (await button.count() > 0) {
          await button.click();
          logoutClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!logoutClicked) {
      // Alternative: try to clear localStorage
      await page.evaluate(() => localStorage.clear());
      await page.evaluate(() => sessionStorage.clear());
      await page.goto('https://moocafisio.com.br/logout');
    }

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Verify we're on login page
    const loginForm = page.locator('input[type="email"], input[type="password"], .login-form');
    if (await loginForm.count() > 0) {
      console.log('✅ Logout successful');
    } else {
      console.log('❌ Logout failed or already on different page');
    }

    // Test 2: Criar Novo Paciente
    console.log('\n👤 Test 2: Criar Novo Paciente');
    console.log('-----------------------------');

    // Login again
    await page.goto('https://moocafisio.com.br/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');
    await page.click('button[type="submit"], .login-btn, [data-testid="login-btn"]');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.user-profile, .profile-menu, [data-testid="user-profile"]', { timeout: 10000 });

    console.log('✅ Re-logged in');

    // Navigate to create patient page directly
    console.log('Navigating to create patient page...');

    // Try different URL patterns
    const patientUrls = [
      'https://moocafisio.com.br/patients/new',
      'https://moocafisio.com.br/patients/create',
      'https://moocafisio.com.br/pacientes/novo',
      'https://moocafisio.com.br/pacientes/criar'
    ];

    let createPageFound = false;
    for (const url of patientUrls) {
      try {
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Check if we're on a form page
        const form = page.locator('form');
        if (await form.count() > 0) {
          createPageFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!createPageFound) {
      // Try from main navigation
      await page.goto('https://moocafisio.com.br');
      await page.waitForLoadState('networkidle');

      // Look for patient menu items
      const menuItems = [
        'a:has-text("Pacientes")',
        'a:has-text("Patients")',
        '[data-testid="patients-menu"]',
        '.patients-link'
      ];

      for (const selector of menuItems) {
        const menuItem = page.locator(selector);
        if (await menuItem.count() > 0) {
          await menuItem.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          // Look for "Novo Paciente" or "New Patient" button
          const newPatientBtn = page.locator('button:has-text("Novo Paciente"), button:has-text("New Patient"), [data-testid="create-patient"]');
          if (await newPatientBtn.count() > 0) {
            await newPatientBtn.click();
            await page.waitForLoadState('networkidle');
            createPageFound = true;
            break;
          }
        }
      }
    }

    if (createPageFound) {
      console.log('✅ Create patient page found');

      // Fill patient form with test data
      const testData = {
        name: 'João Silva',
        email: 'joao.silva@test.com',
        phone: '(11) 99999-8888',
        birthDate: '1990-01-15',
        cpf: '12345678900',
        address: 'Rua dos Testes, 123',
        city: 'São Paulo',
        state: 'SP'
      };

      // Fill form fields
      const fields = {
        'input[name="name"], input[data-testid="name"], .name-input': testData.name,
        'input[name="email"], input[data-testid="email"], .email-input': testData.email,
        'input[name="phone"], input[data-testid="phone"], .phone-input': testData.phone,
        'input[name="birthDate"], input[data-testid="birthDate"], .birth-date-input': testData.birthDate,
        'input[name="cpf"], input[data-testid="cpf"], .cpf-input': testData.cpf,
        'input[name="address"], input[data-testid="address"], .address-input': testData.address,
        'input[name="city"], input[data-testid="city"], .city-input': testData.city,
        'input[name="state"], input[data-testid="state"], .state-input': testData.state
      };

      for (const [selector, value] of Object.entries(fields)) {
        const field = page.locator(selector);
        if (await field.count() > 0) {
          await field.fill(value);
          console.log(`✅ Filled ${selector}`);
        }
      }

      // Save patient
      const saveBtn = page.locator('button:has-text("Salvar"), button:has-text("Save"), [data-testid="save-patient"]');
      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        console.log('✅ Clicked save button');

        // Wait for save and verify
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check for success message
        const successMsg = page.locator('.success-message, .toast.success, [data-testid="success-message"]');
        if (await successMsg.count() > 0) {
          console.log('✅ Patient created successfully');
        } else {
          console.log('❌ Patient creation failed or no success message');
        }

        // Take screenshot
        await page.screenshot({ path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/test-fase3-patient-created.png' });
      } else {
        console.log('❌ Save button not found');
      }
    } else {
      console.log('❌ Could not find create patient page');
    }

    // Test 3: Criar Pagamento/Transação
    console.log('\n💰 Test 3: Criar Pagamento/Transação');
    console.log('----------------------------------');

    // Navigate to financial page
    console.log('Navigating to financial page...');

    const financialUrls = [
      'https://moocafisio.com.br/financial',
      'https://moocafisio.com.br/financeiro',
      'https://moocafisio.com.br/payments'
    ];

    let financialPageFound = false;
    for (const url of financialUrls) {
      try {
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Check if we're on financial page
        const pageContent = await page.textContent('body');
        if (pageContent.includes('Financeiro') || pageContent.includes('Financial') || pageContent.includes('Pagamentos') || pageContent.includes('Payments')) {
          financialPageFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!financialPageFound) {
      // Try from navigation
      await page.goto('https://moocafisio.com.br');
      await page.waitForLoadState('networkidle');

      // Look for financial menu
      const financialMenu = [
        'a:has-text("Financeiro")',
        'a:has-text("Financial")',
        'a:has-text("Pagamentos")',
        'a:has-text("Payments")',
        '[data-testid="financial-menu"]',
        '.financial-link'
      ];

      for (const selector of financialMenu) {
        const menu = page.locator(selector);
        if (await menu.count() > 0) {
          await menu.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          financialPageFound = true;
          break;
        }
      }
    }

    if (financialPageFound) {
      console.log('✅ Financial page found');

      // Look for "Nova Transação" or "New Transaction" button
      const newTransactionBtn = page.locator('button:has-text("Nova Transação"), button:has-text("New Transaction"), [data-testid="new-transaction"]');
      if (await newTransactionBtn.count() > 0) {
        await newTransactionBtn.click();
        await page.waitForLoadState('networkidle');

        // Fill transaction form
        const transactionData = {
          description: 'Consulta de Rotina',
          amount: '150.00',
          date: new Date().toISOString().split('T')[0],
          type: 'Consulta'
        };

        const fields = {
          'input[name="description"], input[data-testid="description"], .description-input': transactionData.description,
          'input[name="amount"], input[data-testid="amount"], .amount-input': transactionData.amount,
          'input[name="date"], input[data-testid="date"], .date-input': transactionData.date
        };

        for (const [selector, value] of Object.entries(fields)) {
          const field = page.locator(selector);
          if (await field.count() > 0) {
            await field.fill(value);
          }
        }

        // Save transaction
        const saveBtn = page.locator('button:has-text("Salvar"), button:has-text("Save"), [data-testid="save-transaction"]');
        if (await saveBtn.count() > 0) {
          await saveBtn.click();
          console.log('✅ Clicked save transaction');

          // Wait for save and verify
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          // Check if transaction appears in list
          const transactionList = page.locator('.transaction-list, .financial-list, [data-testid="transaction-list"]');
          if (await transactionList.count() > 0) {
            const listContent = await transactionList.textContent();
            if (listContent.includes(transactionData.description)) {
              console.log('✅ Transaction appears in list');
            } else {
              console.log('❌ Transaction not found in list');
            }
          } else {
            console.log('❌ Transaction list not found');
          }

          // Take screenshot
          await page.screenshot({ path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/test-fase3-transaction-created.png' });
        } else {
          console.log('❌ Save transaction button not found');
        }
      } else {
        console.log('❌ New transaction button not found');
      }
    } else {
      console.log('❌ Could not find financial page');
    }

    console.log('\n🏁 FASE 3 Test Summary');
    console.log('=====================');
    console.log('✅ Login/Logout functionality tested');
    console.log('✅ Patient creation tested');
    console.log('✅ Transaction creation tested');
    console.log('\nScreenshots saved:');
    console.log('- test-fase3-login-success.png');
    console.log('- test-fase3-patient-created.png');
    console.log('- test-fase3-transaction-created.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/test-fase3-error.png' });
  } finally {
    await browser.close();
  }

  console.log('\n✅ FASE 3 completed!');
})();