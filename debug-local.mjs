import { chromium } from 'playwright';
import { testUsers } from './e2e/fixtures/test-data.ts';
import { exec } from 'child_process';

(async () => {
  // Iniciar Vite dev server
  const viteProcess = exec('npm run dev:web');
  
  // Aguardar servidor subir
  await new Promise(r => setTimeout(r, 5000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', testUsers.admin.email);
  await page.fill('input[type="password"]', testUsers.admin.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/agenda**', { timeout: 30000 }).catch(() => {
    return page.goto('http://localhost:5173/agenda');
  });

  await page.waitForTimeout(5000);
  
  const html = await page.content();
  import('fs').then(fs => fs.writeFileSync('debug-local.html', html));

  const timeGridCount = await page.locator('.sx__time-grid-day').count();
  console.log(`Numero de colunas do grid renderizadas localmente: ${timeGridCount}`);

  await browser.close();
  viteProcess.kill();
  process.exit(0);
})();
