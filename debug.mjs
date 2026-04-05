import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://moocafisio.com.br/agenda');
  
  await page.waitForTimeout(3000);
  
  // click and hold
  const btn = await page.$('.ec-event');
  if (btn) {
      console.log("Found event, clicking and holding...");
      const box = await btn.boundingBox();
      await page.mouse.move(box.x + 5, box.y + 5);
      await page.mouse.down();
      await page.waitForTimeout(2000);
      await page.mouse.move(box.x + 5, box.y + 50); // move to trigger drag
      await page.waitForTimeout(2000);
      await page.mouse.up();
  } else {
      console.log("No events found");
  }
  
  await browser.close();
})();
