#!/usr/bin/env node

/**
 * Visual Test Script for DraggableGrid
 *
 * This script launches a browser and navigates to the evolution page
 * to visually test drag & drop and resize functionality.
 *
 * Usage: node scripts/test-grid-visual.mjs
 *
 * Requirements:
 * - Dev server running on port 8080
 * - Test user exists in database
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_USER = {
    email: 'admin@activityfisio.com',
    password: 'Admin@123',
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('🧪 Starting Visual Grid Test...\n');

    const browser = await chromium.launch({
        headless: false, // Show browser for visual inspection
        slowMo: 500, // Slow down actions for visibility
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    try {
        // Step 1: Navigate to auth page
        console.log('📋 Step 1: Navigating to auth page...');
        await page.goto('http://127.0.0.1:8080/auth');
        await sleep(2000);

        // Step 2: Login
        console.log('🔑 Step 2: Logging in...');
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');

        console.log('⏳ Waiting for navigation after login...');
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
            console.log('  ⚠️  Navigation timeout, continuing anyway...');
        });

        // Step 3: Navigate to schedule
        console.log('📅 Step 3: Navigating to schedule...');
        await page.goto('http://127.0.0.1:8080/schedule');
        await sleep(2000);

        // Step 4: Start an attendance session
        console.log('👨‍⚕️  Step 4: Looking for appointment to start...');
        const appointmentFound = await page.locator('.appointment-card, [role="button"]:has-text("Dr.")').count() > 0;

        if (appointmentFound) {
            console.log('  ✅ Found appointment, clicking...');
            await page.click('.appointment-card, [role="button"]:has-text("Dr.") >> nth=0');
            await sleep(1000);

            // Click "Iniciar atendimento"
            const startButton = page.locator('button:has-text("Iniciar atendimento")');
            if (await startButton.count() > 0) {
                await startButton.click();
                console.log('  ✅ Starting attendance...');
                await sleep(3000);

                // Should be on evolution page now
                const currentUrl = page.url();
                console.log(`  📍 Current URL: ${currentUrl}`);

                if (currentUrl.includes('/evolution/')) {
                    console.log('  ✅ On evolution page!');
                }
            } else {
                console.log('  ⚠️  Start button not found');
            }
        } else {
            console.log('  ⚠️  No appointment found, you may need to create test data');
            console.log('  💡 Navigating directly to a test patient evolution page...');

            // Try to navigate directly to a test patient evolution page
            await page.goto('http://127.0.0.1:8080/patients/test/evolution/test-session');
            await sleep(2000);
        }

        // Step 5: Switch to Evolução tab
        console.log('\n📋 Step 5: Switching to "Evolução" tab...');
        const evolucaoTab = page.locator('button[value="evolucao"]');
        if (await evolucaoTab.count() > 0) {
            await evolucaoTab.click();
            await sleep(1000);
            console.log('  ✅ On Evolução tab');
        }

        // Step 6: Verify grid is present
        console.log('\n🔲 Step 6: Checking for grid...');
        const gridExists = await page.locator('.react-grid-layout').count() > 0;
        if (gridExists) {
            console.log('  ✅ Grid found!');
        } else {
            console.log('  ❌ Grid not found');
        }

        // Step 7: Count widgets
        const widgetCount = await page.locator('.react-grid-item').count();
        console.log(`  📊 Found ${widgetCount} widgets`);

        // Step 8: Check initial spacing
        console.log('\n📏 Step 7: Checking initial widget positions...');
        const widgets = page.locator('.react-grid-item');
        for (let i = 0; i < Math.min(widgetCount, 5); i++) {
            const box = await widgets.nth(i).boundingBox();
            if (box) {
                console.log(`  Widget ${i + 1}: x=${box.x.toFixed(0)}, y=${box.y.toFixed(0)}, w=${box.width.toFixed(0)}, h=${box.height.toFixed(0)}`);
            }
        }

        // Step 9: Enable edit mode
        console.log('\n✏️  Step 8: Enabling edit mode (Personalizar)...');
        const personalizeBtn = page.locator('button:has-text("Personalizar")');
        if (await personalizeBtn.count() > 0) {
            await personalizeBtn.click();
            await sleep(1000);
            console.log('  ✅ Edit mode enabled');

            // Check for drag handles
            const dragHandles = await page.locator('.drag-handle').count();
            console.log(`  🎯 Found ${dragHandles} drag handles`);

            // Check for resize handles
            const resizeHandles = await page.locator('.react-resizable-handle').count();
            console.log(`  📐 Found ${resizeHandles} resize handles`);
        }

        // Step 10: Take screenshot before drag
        console.log('\n📸 Step 9: Taking screenshot (before)...');
        await page.screenshot({
            path: 'test-results/grid-before-drag.avif',
            fullPage: true
        });
        console.log('  ✅ Screenshot saved to test-results/grid-before-drag.avif');

        // Step 11: Perform drag test
        console.log('\n🖱️  Step 10: Testing drag functionality...');
        const firstWidget = page.locator('.react-grid-item').first();
        const box = await firstWidget.boundingBox();

        if (box) {
            console.log(`  Initial position: x=${box.x}, y=${box.y}`);

            // Move to widget
            await page.mouse.move(box.x + 50, box.y + 50);
            await sleep(500);

            // Press down on drag handle
            await page.mouse.down();
            await sleep(500);

            // Drag to new position
            await page.mouse.move(box.x + 200, box.y + 100, { steps: 20 });
            await sleep(500);

            // Release
            await page.mouse.up();
            await sleep(2000);

            const newBox = await firstWidget.boundingBox();
            if (newBox) {
                console.log(`  New position: x=${newBox.x}, y=${newBox.y}`);
                console.log(`  ✅ Drag executed! Movement: dx=${(newBox.x - box.x).toFixed(0)}, dy=${(newBox.y - box.y).toFixed(0)}`);
            }
        }

        // Step 12: Take screenshot after drag
        console.log('\n📸 Step 11: Taking screenshot (after drag)...');
        await page.screenshot({
            path: 'test-results/grid-after-drag.avif',
            fullPage: true
        });
        console.log('  ✅ Screenshot saved to test-results/grid-after-drag.avif');

        // Step 13: Test resize (if possible)
        console.log('\n📐 Step 12: Testing resize functionality...');
        const resizeHandle = page.locator('.react-resizable-handle').first();
        const resizeVisible = await resizeHandle.isVisible();

        if (resizeVisible) {
            console.log('  ✅ Resize handle is visible');

            const resizeBox = await resizeHandle.boundingBox();
            if (resizeBox) {
                // Move to resize handle
                await page.mouse.move(resizeBox.x + 10, resizeBox.y + 10);
                await sleep(500);

                // Press and drag
                await page.mouse.down();
                await page.mouse.move(resizeBox.x + 50, resizeBox.y + 50, { steps: 10 });
                await sleep(500);
                await page.mouse.up();
                await sleep(2000);

                console.log('  ✅ Resize executed!');
            }
        } else {
            console.log('  ⚠️  Resize handle not visible');
        }

        // Step 14: Final screenshot
        console.log('\n📸 Step 13: Taking final screenshot...');
        await page.screenshot({
            path: 'test-results/grid-final.avif',
            fullPage: true
        });
        console.log('  ✅ Screenshot saved to test-results/grid-final.avif');

        // Step 15: Keep browser open for inspection
        console.log('\n✅ Test complete! Browser will remain open for 60 seconds for manual inspection...');
        console.log('💡 You can manually test the grid during this time.');
        await sleep(60000);

    } catch (error) {
        console.error('\n❌ Error during test:', error.message);
    } finally {
        await browser.close();
        console.log('\n🏁 Visual test complete!');
        console.log('📁 Check test-results/ for screenshots.');
    }
}

main().catch(console.error);
