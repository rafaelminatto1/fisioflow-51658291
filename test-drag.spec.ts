import { test, expect } from '@playwright/test';

test('drag and drop test', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', err => logs.push('ERROR: ' + err.message));

  await page.goto('http://localhost:5173/agenda'); // Adjust URL if needed
  
  // Wait for network idle or calendar to load
  await page.waitForTimeout(5000);
  
  console.log(logs.join('\n'));
});
