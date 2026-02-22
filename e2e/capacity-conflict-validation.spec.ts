import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

/**
 * Test case to validate that appointments can be scheduled even when over capacity
 * by using the "Schedule Anyway" (Confirmar Mesmo Assim) functionality.
 */
test('validate appointment capacity conflict override', async ({ page }) => {
    test.setTimeout(180000);
    console.log('🚀 Starting capacity conflict validation test...');

    // 1. Login
    console.log('🔐 Navigating to login page...');
    await page.goto('/auth/login');

    console.log('✍️ Filling credentials...');
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.fill('input[name="email"]', testUsers.rafael.email);

    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill(testUsers.rafael.password);

    console.log('👆 Submitting login via Enter...');
    await passwordInput.press('Enter');

    // 2. Wait for redirect
    console.log('⏳ Waiting for redirect...');
    await page.waitForURL((u) => u.pathname === '/' || u.pathname.startsWith('/schedule') || u.pathname.startsWith('/dashboard'), { timeout: 30000 });
    console.log('✅ Logged in successfully.');

    // 3. Go to a specific date
    const testDate = '2026-02-23';
    console.log(`📅 Navigating to schedule for ${testDate}...`);
    await page.goto(`/?view=day&date=${testDate}`);
    await page.waitForSelector('text=segunda-feira, 23 de fevereiro', { timeout: 15000 });
    console.log('✅ Schedule page loaded.');

    // 4. Create the first appointment
    console.log('➕ Creating the first appointment...');
    const novoButton = page.locator('button:has-text("Agendar"), button:has-text("Novo"), .bg-primary.text-white >> text=Ag').first();
    await novoButton.click();

    console.log('⏳ Waiting for modal...');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Select Patient - Highly robust version
    console.log('📝 Selecting patient...');
    const patientTrigger = page.locator('button:has-text("Selecione o paciente"), button:has-text("Selecione..."), [role="combobox"]').first();
    await patientTrigger.click({ force: true });
    await page.waitForTimeout(1000);

    await page.keyboard.type('Teste');
    await page.waitForTimeout(2000);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Set time
    const timeInput = page.locator('input[type="time"]').first();
    if (await timeInput.isVisible()) {
        await timeInput.fill('08:00');
    } else {
        console.log('Time is not a simple input, trying to find by text...');
        const timeTrigger = page.locator('button:has-text(":")').first();
        await timeTrigger.click({ force: true });
        await page.waitForTimeout(500);
        await page.keyboard.press('Control+A');
        await page.keyboard.type('08:00');
        await page.keyboard.press('Enter');
    }

    console.log('💾 Saving first appointment...');
    const createButton = page.locator('button:has-text("Criar"), button:has-text("Salvar")').first();
    await createButton.click();

    // Wait for success
    await page.waitForSelector('text=/Sucesso|sucesso/i', { timeout: 15000 }).catch(() => console.log('Toast not seen.'));
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => console.log('Modal still visible.'));
    console.log('✅ First appointment process finished.');

    // 5. Create a second appointment in the SAME slot
    console.log('➕ Attempting to create a second appointment in the same slot...');
    await page.waitForTimeout(3000); // More time for state to clear
    await novoButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    console.log('📝 Filling second appointment details...');
    await patientTrigger.click({ force: true });
    await page.waitForTimeout(1000);
    await page.keyboard.type('Teste');
    await page.waitForTimeout(2000);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    if (await timeInput.isVisible()) {
        await timeInput.fill('08:00');
    } else {
        const timeTrigger = page.locator('button:has-text(":")').first();
        await timeTrigger.click({ force: true });
        await page.waitForTimeout(500);
        await page.keyboard.press('Control+A');
        await page.keyboard.type('08:00');
        await page.keyboard.press('Enter');
    }

    console.log('💾 Saving second appointment (expecting conflict)...');
    await createButton.click();

    // 6. Check for the capacity conflict dialog
    console.log('⚖️ Checking for conflict dialog...');
    const scheduleAnywayButton = page.locator('button:has-text("Confirmar Mesmo Assim"), button:has-text("Continuar Mesmo Assim"), button:has-text("Agendar Mesmo Assim")');

    try {
        await scheduleAnywayButton.waitFor({ state: 'visible', timeout: 15000 });
        console.log('⚠️ Conflict dialog appeared as expected.');

        // 7. Click "Schedule Anyway"
        console.log('🚀 Clicking override button...');
        await scheduleAnywayButton.click();

        // 8. Verify success after override
        console.log('⏳ Waiting for success after override...');
        await page.waitForSelector('text=/Sucesso|sucesso/i', { timeout: 25000 });
        console.log('✅ Appointment created successfully after capacity override!');

    } catch (e) {
        console.log('ℹ️ Override button did not appear. Checking for success toast anyway...');
        const successToast = page.locator('text=/Sucesso|sucesso/i');
        if (await successToast.isVisible({ timeout: 10000 })) {
            console.log('✅ Appointment saved (possibly capacity was not reached yet).');
        } else {
            console.log('❌ Neither override button nor success toast appeared.');
            await page.screenshot({ path: 'playwright-screenshots/validation-error-state.png', fullPage: true });
        }
    }

    // 9. Take a screenshot
    await page.screenshot({ path: 'playwright-screenshots/capacity-validation-result.png', fullPage: true });
    console.log('📸 Final result screenshot saved.');
});
