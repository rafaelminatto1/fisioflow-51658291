import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log('Navigating to http://localhost:5173/auth...');
  try {
    await page.goto('http://localhost:5173/auth', { waitUntil: 'load', timeout: 60000 });
    await page.screenshot({ path: 'auth-debug.png' });
    console.log('Screenshot saved to auth-debug.png');
    
    // Check for console errors
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log('Error:', e.message);
  }
  await browser.close();
}
main();
