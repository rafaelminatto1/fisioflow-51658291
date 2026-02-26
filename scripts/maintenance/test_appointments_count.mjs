import { chromium } from 'playwright';

async function test() {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

        console.log('Navegando ate o site...');
        await page.goto('https://moocafisio.com.br/login', { waitUntil: 'domcontentloaded' });
        await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
        await page.fill('input[type="password"]', 'Yukari30@');
        await Promise.all([
            page.waitForURL('**/agenda**', { timeout: 15000 }).catch(() => { }),
            page.click('button[type="submit"]')
        ]);

        if (!page.url().includes('agenda')) {
            await page.goto('https://moocafisio.com.br/agenda', { waitUntil: 'domcontentloaded' });
        }

        console.log('Aguardando 10 segundos para carregar agenda...');
        await page.waitForTimeout(10000);

        const count = await page.locator('.calendar-appointment-card').count();
        console.log(`Numero de cards encontrados: ${count}`);

        if (count > 0) {
            const firstCardHTML = await page.locator('.calendar-appointment-card').first().evaluate(el => el.outerHTML);
            console.log('Primeiro card HTML:');
            console.log(firstCardHTML);
        } else {
            console.log('NENHUM card foi encontrado!');

            // Let's print out what we see in the grid
            const gridHTML = await page.locator('#calendar-grid').evaluate(el => el.innerHTML).catch(() => 'GRID NOT FOUND');
            console.log('Grid HTML part:');
            console.log(gridHTML.substring(0, 1000));

            // Any React err?
            const bodyHTML = await page.locator('body').innerText();
            console.log('Body Text:', bodyHTML.substring(0, 500));
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await browser.close();
    }
}

test();
