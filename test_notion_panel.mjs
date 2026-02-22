import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log("Navigating to login...");
    await page.goto('http://localhost:5173/login');
    
    console.log("Filling credentials...");
    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');
    await page.click('button[type="submit"]');
    
    console.log("Waiting for navigation after login...");
    await page.waitForTimeout(5000); 

    const targetUrl = 'http://localhost:5173/patient-evolution/56397275-e3f9-4578-97ea-61e5feb77467';
    console.log("Navigating to evolution page: " + targetUrl);
    await page.goto(targetUrl);
    
    await page.waitForTimeout(5000); 

    await page.screenshot({ path: 'test_after_nav.png' });

    console.log("Looking for Notion button...");
    const notionBtn = page.locator('button:has-text("Notion")').first();
    
    if (await notionBtn.isVisible()) {
        console.log("Found Notion button. Clicking...");
        await notionBtn.click();
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test_after_click.png' });
        
        const crashText = page.getByText(/Ocorreu um erro inesperado/i);
        if (await crashText.count() > 0) {
            console.error("Test failed: Error page is visible!");
            process.exit(1);
        } else {
            console.log("Test passed: Notion panel opened without crashing!");
        }
    } else {
        console.error("Notion button not found! See screenshot.");
        process.exit(1);
    }
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
