import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://moocafisio.com.br/agenda');
  await page.waitForTimeout(4000);
  
  // Inject script to click and hold
  await page.evaluate(() => {
     const el = document.querySelector('.ec-event');
     if (!el) { console.log('No ec-event found'); return; }
     console.log('Found event, dispatching mousedown');
     const rect = el.getBoundingClientRect();
     const event = new MouseEvent('mousedown', {
       bubbles: true,
       cancelable: true,
       clientX: rect.left + 5,
       clientY: rect.top + 5
     });
     el.dispatchEvent(event);
  });
  
  await page.waitForTimeout(3000);
  await browser.close();
})();
