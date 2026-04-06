import { chromium } from 'playwright';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.push(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
      logs.push(`BROWSER PAGE ERROR: ${err.message}`);
  });

  console.log("Navigating to http://localhost:5173 ...");
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    logs.push(`Navigation error: ${e.message}`);
  }
  
  await page.waitForTimeout(3000);
  
  const bodyText = await page.evaluate(() => document.body.innerText.trim());
  const hasAppRoot = await page.evaluate(() => !!document.getElementById('root'));
  await page.evaluate(() => !!document.querySelector('.app-runtime-error, [data-error]')); // look for error boundaries
  
  console.log("\n--- TEST RESULTS ---");
  console.log(`Logs found: ${logs.length}`);
  if (logs.length > 0) {
      console.log(logs.join('\n'));
  }
  
  console.log(`Body text length: ${bodyText.length}`);
  if (bodyText.length < 100) {
      console.log("Body text is short, might be a blank screen:");
      console.log(bodyText);
  }
  
  console.log(`Has #root element: ${hasAppRoot}`);
  
  await browser.close();
})();
