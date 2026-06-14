const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to login...");
  await page.goto('https://www.moocafisio.com.br/login');
  
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', process.env.E2E_PASSWORD || "");
  await page.click('button[type="submit"]');

  console.log("Waiting for agenda...");
  await page.waitForURL('**/agenda**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  console.log("Clicking appointment block...");
  // Find a block with the name
  const appointment = await page.locator('text=Rafael Minatto De Martino').first();
  await appointment.click();

  console.log("Waiting for modal to open...");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'agenda_modal.png' });

  // Wait for "Iniciar Atendimento" button (case insensitive)
  const startBtn = await page.getByRole('button', { name: /Iniciar/i }).first();
  
  console.log("Clicking Iniciar Atendimento...");
  await startBtn.click();

  console.log("Waiting for evolution page...");
  await page.waitForURL('**/patient-evolution/**');
  await page.waitForLoadState('networkidle');
  // wait 2s to allow for react query to load draft
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'evolution_after_agenda_click.png' });
  console.log("Screenshot saved as evolution_after_agenda_click.png");

  // get editor text
  const editorText = await page.locator('.ProseMirror').innerText();
  console.log("Editor text:", editorText);

  await browser.close();
})();
