import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 }
});

const page = await context.newPage();

console.log('Starting FASE 2 tests...\n');

try {
  // Navigate to the dashboard first
  console.log('1. Testing dashboard...');
  await page.goto('https://moocafisio.com.br/dashboard');
  await page.waitForLoadState('networkidle');

  // Wait for any console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Console Error: ${msg.text()}`);
    }
  });

  // Check for network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP Error ${response.status()}: ${response.url()}`);
    }
  });

  await page.waitForTimeout(3000);

  // Try to access a patient detail page directly
  console.log('\n2. Testing patient detail page directly...');
  await page.goto('https://moocafisio.com.br/patients/test123');
  await page.waitForTimeout(2000);

  // Try patient evolution page
  console.log('\n3. Testing patient evolution page...');
  await page.goto('https://moocafisio.com.br/patients/test123/evolution');
  await page.waitForTimeout(2000);

  // Check if we can find the create appointment button
  console.log('\n4. Testing appointment creation...');
  await page.goto('https://moocafisio.com.br/dashboard');
  await page.waitForTimeout(2000);

  // Look for appointment creation button
  const appointmentButton = await page.$('[data-testid="create-appointment"], button:has-text("Nova Consulta"), button:has-text("Novo Agendamento")');
  if (appointmentButton) {
    console.log('Found appointment creation button');
    await appointmentButton.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('Appointment creation button not found');
  }

  // Test drag and drop functionality if present
  console.log('\n5. Testing drag-and-drop functionality...');
  const calendar = await page.$('.calendar, .draggable, [draggable]');
  if (calendar) {
    console.log('Found calendar component');
    // Try to get some drag element
    const dragElement = await page.$('.event, .appointment, .draggable-item');
    if (dragElement) {
      console.log('Found draggable element');
      // Get position
      const box = await dragElement.boundingBox();
      if (box) {
        // Try to drag
        await dragElement.dragTo(page.locator('.time-slot, .drop-zone'), {
          targetPosition: { x: box.width / 2, y: box.height / 2 }
        });
        await page.waitForTimeout(1000);
      }
    }
  } else {
    console.log('Calendar component not found');
  }

  // Take screenshots for review
  await page.screenshot({ path: '/tmp/fase2-dashboard.png', fullPage: true });
  await page.screenshot({ path: '/tmp/fase2-patient-detail.png', fullPage: true });
  console.log('\nScreenshots saved');

  console.log('\nFASE 2 test completed');

} catch (error) {
  console.error('Test error:', error);
} finally {
  await browser.close();
}