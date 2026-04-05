import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));

  console.log('Navigating to production...');
  await page.goto('https://moocafisio.com.br/agenda');
  
  // Wait for auth and initial load
  await page.waitForTimeout(5000);

  // Go to 30/03/2026 where I saw events in the screenshot
  console.log('Navigating to specific date 2026-03-30...');
  await page.goto('https://moocafisio.com.br/agenda?date=2026-03-30');
  
  await page.waitForTimeout(5000);
  
  const events = await page.$$('.ec-event');
  console.log(`Found ${events.length} events on 30/03/2026.`);

  if (events.length > 0) {
    const el = events[0];
    const rect = await el.boundingBox();
    console.log('Event rect:', rect);

    console.log('Simulating drag start...');
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(500);
    
    console.log('Moving mouse...');
    await page.mouse.move(rect.x + rect.width / 2 + 50, rect.y + rect.height / 2 + 100);
    await page.waitForTimeout(1000);

    const count = await page.evaluate(() => document.querySelectorAll('.ec-event').length);
    console.log(`Events count during/after drag: ${count}`);
    
    if (count === 0) {
        console.log('REPRODUCED: ALL CARDS DISAPPEARED!');
    }
  } else {
      console.log('Still no events found. Body content length:', (await page.content()).length);
  }

  await browser.close();
})();
