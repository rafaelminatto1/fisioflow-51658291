import { chromium } from 'playwright';

async function screenshotGrid() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
        console.log('🔍 Navigating to app...');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

        // Check if we need to login
        const hasLogin = await page.locator('input[type="email"]').count() > 0;
        if (hasLogin) {
            console.log('⚠️  Login required. Please login manually and navigate to evolution page.');
            console.log('📸 Taking screenshot of login page...');
            await page.screenshot({ path: 'screenshots/01-login.png', fullPage: true });
            await browser.close();
            return;
        }

        // Look for evolution page or navigate to it
        const url = page.url();
        console.log(`📍 Current URL: ${url}`);

        // Clear localStorage to ensure fresh state
        await page.evaluate(() => {
            localStorage.removeItem('evolution_layout_v1');
        });

        // Check if we're on evolution page
        const hasGrid = await page.locator('.react-grid-layout').count() > 0;

        if (hasGrid) {
            console.log('✅ Found grid layout!');

            // Wait for items to load
            await page.waitForSelector('.react-grid-item', { timeout: 5000 });

            // Screenshot 1: Full page (collapsed state)
            console.log('📸 Screenshot 1: Full page (collapsed)');
            await page.screenshot({
                path: 'screenshots/01-grid-collapsed-full.png',
                fullPage: true
            });

            // Screenshot 2: Just the grid area
            const grid = page.locator('.react-grid-layout');
            await grid.screenshot({
                path: 'screenshots/02-grid-collapsed.png'
            });

            // Get widget info
            const items = await page.locator('.react-grid-item').all();
            console.log(`\n📊 Found ${items.length} widgets:`);

            for (let i = 0; i < Math.min(items.length, 10); i++) {
                const item = items[i];
                const box = await item.boundingBox();
                const text = await item.locator('h3, .card-title, [class*="title"]').first().textContent().catch(() => 'Unknown');

                if (box) {
                    console.log(`   ${i + 1}. ${text || 'Widget ' + (i + 1)}`);
                    console.log(`      Position: x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
                    console.log(`      Size: ${Math.round(box.width)}x${Math.round(box.height)}`);
                }
            }

            // Try to expand Pain Scale
            console.log('\n🔄 Attempting to expand Pain Scale...');
            const painScale = page.locator('.react-grid-item').filter({ hasText: /Nível de Dor/i });
            const expandBtn = painScale.locator('button[aria-label*="Expandir"], button:has(.lucide-chevron-down)');

            if (await expandBtn.count() > 0) {
                await expandBtn.click();
                await page.waitForTimeout(500);

                console.log('📸 Screenshot 3: Grid with Pain Scale expanded');
                await page.screenshot({
                    path: 'screenshots/03-grid-expanded.png',
                    fullPage: true
                });

                // Get widget positions after expansion
                const expandedItems = await page.locator('.react-grid-item').all();
                console.log(`\n📊 After expansion - ${expandedItems.length} widgets:`);

                for (let i = 0; i < Math.min(expandedItems.length, 10); i++) {
                    const item = expandedItems[i];
                    const box = await item.boundingBox();
                    const text = await item.locator('h3, .card-title, [class*="title"]').first().textContent().catch(() => 'Unknown');

                    if (box) {
                        console.log(`   ${i + 1}. ${text || 'Widget ' + (i + 1)}`);
                        console.log(`      Position: x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
                        console.log(`      Size: ${Math.round(box.width)}x${Math.round(box.height)}`);
                    }
                }
            } else {
                console.log('⚠️  Could not find expand button');
            }

            console.log('\n✅ Screenshots saved to screenshots/ directory');
        } else {
            console.log('⚠️  No grid layout found on current page');
            console.log('📸 Taking screenshot of current page...');
            await page.screenshot({ path: 'screenshots/00-current-page.png', fullPage: true });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

// Create screenshots directory
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, '../screenshots');

if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true });
}

screenshotGrid().catch(console.error);
