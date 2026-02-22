import { chromium } from 'playwright';

async function debug() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
        console.log(`[PAGE ERROR] ${err.message}`);
    });

    page.on('requestfailed', request => {
        console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
    });

    try {
        await page.goto('https://moocafisio.com.br/login', { waitUntil: 'domcontentloaded' });
        await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
        await page.fill('input[type="password"]', 'Yukari30@');
        await Promise.all([
            page.waitForURL('**/agenda**', { timeout: 15000 }).catch(() => {}),
            page.click('button[type="submit"]')
        ]);

        if (!page.url().includes('agenda')) {
            await page.goto('https://moocafisio.com.br/agenda', { waitUntil: 'networkidle' });
        }

        console.log('Aguardando 10 segundos para requisições completarem...');
        await page.waitForTimeout(10000);
        await page.screenshot({ path: 'debug-agenda.png', fullPage: true });
        console.log('Screenshot salva em debug-agenda.png');

    } catch (error) {
        console.error('Erro na automação:', error);
    } finally {
        await browser.close();
    }
}

debug();
