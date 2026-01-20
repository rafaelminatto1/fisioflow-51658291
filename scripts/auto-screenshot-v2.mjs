import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, '../screenshots');

if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true });
}

async function autoScreenshot() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 300
    });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
        console.log('🔍 Navigating to login page...');
        await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });

        // Login
        console.log('📧 Logging in...');
        await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
        await page.fill('input[type="password"]', 'Yukari30@');
        await page.click('button[type="submit"]');

        // Wait for navigation - be flexible about where we end up
        await page.waitForTimeout(3000);
        console.log('✅ Logged in! Current URL:', page.url());

        // Navigate to schedule
        console.log('📅 Going to schedule...');
        await page.goto('http://localhost:8080/schedule', { waitUntil: 'networkidle' });

        // Look for appointment card and click
        console.log('🔍 Looking for appointment...');
        await page.waitForTimeout(2000);

        // Try multiple selectors for appointment
        const selectors = [
            '.appointment-card',
            '[role="button"]:has-text("Dr.")',
            'div:has-text("Dr.")',
            'button:has-text("Iniciar")'
        ];

        let clicked = false;
        for (const selector of selectors) {
            try {
                const count = await page.locator(selector).count();
                if (count > 0) {
                    console.log(`Found element with selector: ${selector}`);
                    await page.locator(selector).first().click({ timeout: 5000 });
                    clicked = true;
                    await page.waitForTimeout(1000);
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        // Click "Iniciar atendimento" if visible
        const startButton = page.locator('button:has-text("Iniciar atendimento"), button:has-text("Iniciar")');
        if (await startButton.count() > 0) {
            await startButton.first().click();
            console.log('✅ Starting attendance...');
            await page.waitForTimeout(2000);
        }

        // Check if we're on evolution page
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);

        if (currentUrl.includes('/evolution/')) {
            console.log('✅ Already on evolution page!');
        } else {
            console.log('⚠️  Not on evolution page, taking screenshot of current state...');
            await page.screenshot({ path: 'screenshots/00-current-state.avif', fullPage: true });
        }

        // Click Evolução tab if needed
        const evolucaoTab = page.locator('button[value="evolucao"], button:has-text("Evolução")');
        if (await evolucaoTab.count() > 0) {
            await evolucaoTab.first().click();
            await page.waitForTimeout(1000);
            console.log('✅ Clicked Evolução tab');
        }

        // Clear localStorage for fresh state
        await page.evaluate(() => {
            localStorage.removeItem('evolution_layout_v1');
        });
        console.log('🗑️  Cleared saved layout from localStorage');

        // Reload to apply cleared state
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Check for grid
        const hasGrid = await page.locator('.react-grid-layout').count() > 0;

        if (hasGrid) {
            console.log('✅ Found grid layout!');

            await page.waitForSelector('.react-grid-item', { timeout: 5000 });
            await page.waitForTimeout(1000); // Extra wait for rendering

            console.log('📸 Taking screenshots...');

            // Screenshot 1: Full page - Current state
            await page.screenshot({
                path: 'screenshots/03-grid-current-state.avif',
                fullPage: true
            });
            console.log('✅ Saved: screenshots/03-grid-current-state.avif');

            // Get widget positions
            const items = await page.locator('.react-grid-item').all();
            console.log(`\n📊 Widget positions (${items.length} widgets):`);

            const positions = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const box = await item.boundingBox();
                const text = await item.locator('h3, .card-title').first().textContent().catch(() => `Widget ${i + 1}`);

                if (box) {
                    positions.push({
                        index: i,
                        name: text.trim(),
                        x: Math.round(box.x),
                        y: Math.round(box.y),
                        width: Math.round(box.width),
                        height: Math.round(box.height)
                    });
                    console.log(`   ${i + 1}. ${text.trim()}`);
                    console.log(`      Position: x=${positions[i].x}, y=${positions[i].y}`);
                    console.log(`      Size: ${positions[i].width}x${positions[i].height}`);
                }
            }

            // Check if Pain Scale and Exercises are on same row
            const painScale = positions.find(p => p.name.includes('Nível de Dor'));
            const exercises = positions.find(p => p.name.includes('Exercícios'));

            if (painScale && exercises) {
                const yDiff = Math.abs(painScale.y - exercises.y);
                console.log(`\n🔍 Pain Scale vs Exercises Y difference: ${yDiff}px`);
                if (yDiff < 50) {
                    console.log('✅ SUCCESS: Pain Scale and Exercises are on the SAME row!');
                } else {
                    console.log('❌ PROBLEM: Pain Scale and Exercises are on DIFFERENT rows!');
                    console.log(`   Pain Scale Y: ${painScale.y}`);
                    console.log(`   Exercises Y: ${exercises.y}`);
                }
            }

            // Try to expand Pain Scale
            console.log('\n🔄 Looking for expand button...');
            const painScaleWidget = page.locator('.react-grid-item').filter({ hasText: /Nível de Dor/i });
            const expandBtn = painScaleWidget.locator('button:has(.lucide-chevron-down), button[aria-label*="Expandir"], button:has(svg)');

            const hasExpandBtn = await expandBtn.count() > 0;
            if (hasExpandBtn) {
                await expandBtn.first().click();
                await page.waitForTimeout(1000);

                // Screenshot 2: Full page - Expanded state
                await page.screenshot({
                    path: 'screenshots/04-grid-expanded.avif',
                    fullPage: true
                });
                console.log('✅ Saved: screenshots/04-grid-expanded.avif');
            } else {
                console.log('⚠️  Could not find expand button');
            }
        } else {
            console.log('⚠️  No grid layout found on current page');
        }

        console.log('\n✅ Screenshots complete!');
        console.log('📁 Check the screenshots/ directory');
        console.log('⏳ Keeping browser open for 10 seconds for manual verification...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        await page.screenshot({ path: 'screenshots/error.avif' });
    } finally {
        await browser.close();
    }
}

autoScreenshot().catch(console.error);
