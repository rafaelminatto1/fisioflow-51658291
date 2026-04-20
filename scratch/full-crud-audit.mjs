import { chromium } from 'playwright';

const BASE_URL = 'https://moocafisio.com.br';
const EMAIL = 'REDACTED_EMAIL';
const PASS = 'REDACTED';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] [${page.url()}] ${msg.text()}`);
      errors.push({ url: page.url(), text: msg.text() });
    }
  });

  try {
    console.log('--- Logging in ---');
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/agenda', { timeout: 60000 });
    console.log('Login successful');

    // TEST PATIENT DIALOG (Admin View)
    console.log('--- Testing Patient Archive/Delete Dialog ---');
    await page.goto(`${BASE_URL}/patients`);
    await page.waitForTimeout(5000);
    
    // Select first patient
    await page.locator('table tr, .patient-card').first().click();
    await page.waitForTimeout(3000);
    
    // Open Delete/Archive Dialog
    const deleteBtn = page.getByRole('button', { name: /Arquivar|Excluir/i }).first();
    if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);
        
        // Check for Admin Hard Delete Option
        const adminCheckbox = page.locator('#hard-delete-toggle');
        if (await adminCheckbox.isVisible()) {
            console.log('SUCCESS: Admin hard-delete checkbox is visible.');
        } else {
            console.log('FAILURE: Admin hard-delete checkbox is NOT visible.');
        }
        
        await page.getByRole('button', { name: /Cancelar/i }).click();
    }

    console.log('--- CRUD Audit Finished ---');
    if (errors.length > 0) {
      console.log(`Found ${errors.length} error messages in console.`);
    } else {
      console.log('No console errors found during audit!');
    }

  } catch (e) {
    console.error('Audit failed:', e.message);
  } finally {
    await browser.close();
  }
}
run();
