import { chromium } from 'playwright';

const BASE_URL = 'https://moocafisio.com.br';
const EMAIL = 'rafael.minatto@yahoo.com.br';
const PASS = 'Yukari30@';

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

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] [${page.url()}] ${err.message}`);
    errors.push({ url: page.url(), text: err.message, type: 'pageerror' });
  });

  try {
    console.log('--- Logging in ---');
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/agenda', { timeout: 60000 });
    console.log('Login successful');

    // CRUD PATIENTS
    console.log('--- Testing Patients CRUD ---');
    await page.goto(`${BASE_URL}/patients`);
    await page.waitForSelector('button:has-text("Novo Paciente"), button:has-text("Adicionar")', { timeout: 10000 });
    
    // Create
    console.log('Creating patient...');
    const novoBtn = page.locator('button:has-text("Novo Paciente"), button:has-text("Adicionar")').first();
    await novoBtn.click();
    await page.waitForSelector('input[name="fullName"], input[name="full_name"]', { timeout: 5000 });
    await page.fill('input[name="fullName"], input[name="full_name"]', 'Paciente Teste Audit ' + Date.now());
    await page.click('button:has-text("Salvar"), button:has-text("Criar")');
    await page.waitForTimeout(3000);

    // Read/Edit
    console.log('Editing patient...');
    await page.goto(`${BASE_URL}/patients`);
    await page.waitForTimeout(2000);
    const firstPatient = page.locator('table tr, .patient-card').first();
    if (await firstPatient.isVisible()) {
        await firstPatient.click();
        await page.waitForTimeout(2000);
        const editBtn = page.locator('button:has-text("Editar")').first();
        if (await editBtn.isVisible()) {
            await editBtn.click();
            await page.waitForSelector('input', { timeout: 5000 });
            await page.click('button:has-text("Salvar"), button:has-text("Confirmar")');
        }
    }
    await page.waitForTimeout(3000);

    console.log('--- CRUD Audit Finished ---');
    if (errors.length > 0) {
      console.log(`Found ${errors.length} unique error messages in console.`);
    } else {
      console.log('No console errors found during CRUD operations!');
    }

  } catch (e) {
    console.error('Audit failed with error:', e);
  } finally {
    await browser.close();
  }
}
run();
