import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, '../screenshots');

if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true });
}

async function screenshotWithLogin() {
    const browser = await chromium.launch({
        headless: false, // Show browser for manual login
        slowMo: 100
    });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
        console.log('🔍 Navigating to app...');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

        // Check if login is needed
        const hasLogin = await page.locator('input[type="email"]').count() > 0;

        if (hasLogin) {
            console.log('📧 Login page detected. Please login manually.');
            console.log('⏳ Waiting for you to login and navigate to evolution page...');
            console.log('💡 Once on the evolution page, the script will continue automatically.');

            // Wait for evolution page
            await page.waitForURL(/\/patients\/.*\/evolution\/.*/, { timeout: 0 });
        }

        console.log('✅ On evolution page!');

        // Clear localStorage for fresh state
        await page.evaluate(() => {
            localStorage.removeItem('evolution_layout_v1');
        });
        console.log('🗑️  Cleared saved layout from localStorage');

        // Reload to apply cleared state
        await page.reload({ waitUntil: 'networkidle' });

        // Wait for grid to load
        await page.waitForSelector('.react-grid-layout', { timeout: 10000 });
        await page.waitForSelector('.react-grid-item', { timeout: 5000 });

        console.log('📸 Taking screenshots...');

        // Screenshot 1: Full page - Collapsed state
        await page.screenshot({
            path: 'screenshots/grid-collapsed-full.avif',
            fullPage: true
        });
        console.log('✅ Saved: screenshots/grid-collapsed-full.avif');

        // Get widget positions
        const items = await page.locator('.react-grid-item').all();
        console.log(`\n📊 Widget positions (${items.length} widgets):`);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const box = await item.boundingBox();
            const text = await item.locator('h3, .card-title').first().textContent().catch(() => `Widget ${i + 1}`);

            if (box) {
                console.log(`   ${i + 1}. ${text.trim()}`);
                console.log(`      Position: x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
                console.log(`      Size: ${Math.round(box.width)}x${Math.round(box.height)}`);
            }
        }

        // Try to expand Pain Scale
        console.log('\n🔄 Expanding Pain Scale...');
        const painScale = page.locator('.react-grid-item').filter({ hasText: /Nível de Dor/i });
        const expandBtn = painScale.locator('button[aria-label*="Expandir"], button:has(.lucide-chevron-down), button:has(svg.lucide-chevron-down)');

        const hasExpandBtn = await expandBtn.count() > 0;
        if (hasExpandBtn) {
            await expandBtn.click();
            await page.waitForTimeout(800);

            // Screenshot 2: Full page - Expanded state
            await page.screenshot({
                path: 'screenshots/grid-expanded-full.avif',
                fullPage: true
            });
            console.log('✅ Saved: screenshots/grid-expanded-full.avif');

            // Get widget positions after expansion
            const expandedItems = await page.locator('.react-grid-item').all();
            console.log(`\n📊 Widget positions after expansion (${expandedItems.length} widgets):`);

            for (let i = 0; i < Math.min(expandedItems.length, 10); i++) {
                const item = expandedItems[i];
                const box = await item.boundingBox();
                const text = await item.locator('h3, .card-title').first().textContent().catch(() => `Widget ${i + 1}`);

                if (box) {
                    console.log(`   ${i + 1}. ${text.trim()}`);
                    console.log(`      Position: x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
                    console.log(`      Size: ${Math.round(box.width)}x${Math.round(box.height)}`);
                }
            }

            // Collapse back
            const collapseBtn = painScale.locator('button[aria-label*="Recolher"], button:has(.lucide-chevron-up), button:has(svg.lucide-chevron-up)');
            if (await collapseBtn.count() > 0) {
                await collapseBtn.click();
                await page.waitForTimeout(500);
                console.log('✅ Collapsed Pain Scale back');
            }
        } else {
            console.log('⚠️  Could not find expand button');
        }

        console.log('\n✅ Screenshots complete!');
        console.log('📁 Check the screenshots/ directory');
        console.log('⏳ Keeping browser open for 5 seconds for manual verification...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: 'screenshots/error.avif' });
    } finally {
        await browser.close();
    }
}

screenshotWithLogin().catch(console.error);
