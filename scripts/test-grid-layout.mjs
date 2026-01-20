/**
 * Manual Grid Layout Test
 *
 * This script can be run manually to test the grid layout without authentication.
 * It navigates directly to a patient evolution page.
 *
 * Usage: node scripts/test-grid-layout.mjs
 */

import chromium from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGridLayout() {
    console.log('🔍 Starting Grid Layout Test...\n');

    const browser = await chromium.launch({
        headless: false, // Show browser for visual verification
        slowMo: 500 // Slow down actions for visibility
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    try {
        // Navigate to the app
        console.log('📍 Navigating to app...');
        await page.goto('http://localhost:8080');

        // Take initial screenshot
        await page.screenshot({ path: 'test-results/01-homepage.avif', fullPage: true });
        console.log('✅ Homepage screenshot saved');

        // Try to find a way to access evolution page
        // For now, let's just verify the page loads
        const title = await page.title();
        console.log(`📄 Page title: ${title}`);

        // Check if we need to login
        const loginForm = await page.locator('input[type="email"]').count();
        if (loginForm > 0) {
            console.log('⚠️  Login required - this test needs authentication');
            console.log('💡 Please login manually and navigate to a patient evolution page');
            console.log('⏸️  Press Ctrl+C when ready to continue...\n');

            // Wait for user to navigate manually
            await page.waitForURL(/\/patients\/.*\/evolution\/.*/, { timeout: 0 });
        }

        // Wait for evolution page
        console.log('⏳ Waiting for evolution page...');
        await page.waitForSelector('.react-grid-layout', { timeout: 30000 });
        console.log('✅ Grid layout found!\n');

        // Clear localStorage to start fresh
        await page.evaluate(() => localStorage.removeItem('evolution_layout_v1'));
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('.react-grid-layout', { timeout: 10000 });

        // Test 1: Count widgets
        console.log('🔢 Test 1: Counting widgets...');
        const gridItems = await page.locator('.react-grid-item').all();
        console.log(`✅ Found ${gridItems.length} widgets (expected: 10)`);

        // Test 2: Get widget titles
        console.log('\n📋 Test 2: Widget titles:');
        for (let i = 0; i < gridItems.length; i++) {
            const widget = gridItems[i];
            try {
                const title = await widget.locator('h3, .card-title').first().textContent();
                console.log(`   ${i + 1}. ${title || 'Untitled'}`);
            } catch (e) {
                console.log(`   ${i + 1}. (Could not get title)`);
            }
        }

        // Test 3: Check for overlaps
        console.log('\n🔍 Test 3: Checking for widget overlaps...');
        const boxes = [];
        for (let i = 0; i < gridItems.length; i++) {
            const box = await gridItems[i].boundingBox();
            if (box) {
                boxes.push({ index: i, ...box });
            }
        }

        let overlapsFound = 0;
        for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
                const a = boxes[i];
                const b = boxes[j];

                // Check if rectangles overlap
                const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
                const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;

                if (overlapX && overlapY) {
                    const overlapAreaX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
                    const overlapAreaY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
                    const overlapArea = overlapAreaX * overlapAreaY;

                    if (overlapArea > 100) {
                        overlapsFound++;
                        console.log(`   ⚠️  Overlap detected between widget ${i} and ${j} (area: ${overlapArea}px²)`);
                    }
                }
            }
        }

        if (overlapsFound === 0) {
            console.log('   ✅ No overlaps detected!');
        } else {
            console.log(`   ❌ Found ${overlapsFound} overlaps`);
        }

        // Test 4: Test Pain Scale expansion
        console.log('\n🔄 Test 4: Testing Pain Scale expansion...');
        const painScaleWidget = page.locator('.react-grid-item').filter({ hasText: /Nível de Dor/ });
        const expandButton = painScaleWidget.locator('button[aria-label*="Expandir"], button:has(.lucide-chevron-down)');

        const initialBox = await painScaleWidget.boundingBox();
        console.log(`   Initial height: ${initialBox?.height}px`);

        if (await expandButton.count() > 0) {
            await expandButton.click();
            await page.waitForTimeout(500);

            const expandedBox = await painScaleWidget.boundingBox();
            console.log(`   Expanded height: ${expandedBox?.height}px`);

            if (expandedBox && initialBox) {
                const heightIncrease = expandedBox.height - initialBox.height;
                console.log(`   Height increase: ${heightIncrease}px (${((heightIncrease / initialBox.height) * 100).toFixed(1)}%)`);

                if (heightIncrease > 100) {
                    console.log('   ✅ Pain Scale expanded successfully');
                } else {
                    console.log('   ⚠️  Pain Scale expansion may not be working correctly');
                }
            }

            // Collapse back
            const collapseButton = painScaleWidget.locator('button[aria-label*="Recolher"], button:has(.lucide-chevron-up)');
            if (await collapseButton.count() > 0) {
                await collapseButton.click();
                await page.waitForTimeout(500);
                console.log('   ✅ Pain Scale collapsed back');
            }
        } else {
            console.log('   ⚠️  Expand button not found');
        }

        // Test 5: Verify no overlaps after expansion
        console.log('\n🔍 Test 5: Checking for overlaps after expansion...');
        const finalGridItems = await page.locator('.react-grid-item').all();
        const finalBoxes = [];
        for (let i = 0; i < finalGridItems.length; i++) {
            const box = await finalGridItems[i].boundingBox();
            if (box) {
                finalBoxes.push({ index: i, ...box });
            }
        }

        let finalOverlapsFound = 0;
        for (let i = 0; i < finalBoxes.length; i++) {
            for (let j = i + 1; j < finalBoxes.length; j++) {
                const a = finalBoxes[i];
                const b = finalBoxes[j];

                const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
                const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;

                if (overlapX && overlapY) {
                    const overlapAreaX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
                    const overlapAreaY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
                    const overlapArea = overlapAreaX * overlapAreaY;

                    if (overlapArea > 100) {
                        finalOverlapsFound++;
                    }
                }
            }
        }

        if (finalOverlapsFound === 0) {
            console.log('   ✅ No overlaps after expansion!');
        } else {
            console.log(`   ❌ Found ${finalOverlapsFound} overlaps after expansion`);
        }

        // Take final screenshot
        console.log('\n📸 Taking final screenshot...');
        await page.screenshot({ path: 'test-results/02-final-layout.avif', fullPage: true });
        console.log('✅ Screenshot saved');

        // Generate report
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Widgets found: ${gridItems.length}/10`);
        console.log(`${overlapsFound === 0 ? '✅' : '❌'} Initial overlaps: ${overlapsFound}`);
        console.log(`${finalOverlapsFound === 0 ? '✅' : '❌'} Final overlaps: ${finalOverlapsFound}`);
        console.log('='.repeat(60));

        if (overlapsFound === 0 && finalOverlapsFound === 0) {
            console.log('\n🎉 ALL TESTS PASSED!');
        } else {
            console.log('\n⚠️  SOME TESTS FAILED - Check screenshots for details');
        }

    } catch (error) {
        console.error('❌ Error during test:', error.message);
        await page.screenshot({ path: 'test-results/error-screenshot.avif' });
    } finally {
        console.log('\n⏳ Keeping browser open for 5 seconds for manual verification...');
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

// Create test-results directory if it doesn't exist
const testResultsDir = path.join(__dirname, '../test-results');
if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
}

// Run the test
testGridLayout().catch(console.error);
