import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log('Navigating...');
  try {
    await page.goto('http://127.0.0.1:5173/auth', { timeout: 10000 });
    console.log('Page title:', await page.title());
  } catch (e) {
    console.log('Error:', e.message);
  }
  await browser.close();
}
main();
