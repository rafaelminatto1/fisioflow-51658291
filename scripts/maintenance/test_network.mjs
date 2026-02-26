import { chromium } from 'playwright';

async function testNetwork() {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        let appointmentsResponse = null;

        page.on('response', async response => {
            const url = response.url();
            if (url.includes('appointmentServiceHttp')) {
                const method = response.request().method();
                console.log(`[API CALL] ${method} ${url} - Status ${response.status()}`);

                if (response.status() === 200) {
                    try {
                        const json = await response.json();
                        appointmentsResponse = { url, json };
                        const itemsLength = Array.isArray(json) ? json.length : (Array.isArray(json.data) ? json.data.length : 'unknown number of');
                        console.log(`[API RESPONSE] Retrieved ${itemsLength} items from appointmentServiceHttp.`);
                    } catch (e) {
                        try {
                            console.log(`[API PARSE FAILED] Response body: ${await response.text()}`);
                        } catch (e) { }
                    }
                }
            }
        });

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

        console.log('Aguardando agendamentos...');
        await page.waitForTimeout(10000);

        if (appointmentsResponse) {
            const data = appointmentsResponse.json.data || appointmentsResponse.json;
            if (Array.isArray(data)) {
                console.log(`Total de agendamentos no JSON: ${data.length}`);
                if (data.length > 0) {
                    console.log('Dados da API de Agendamentos (primeiros 2):', JSON.stringify(data.slice(0, 2), null, 2));
                }
            } else {
                console.log('Resposta da API não era um array:', JSON.stringify(data, null, 2));
            }
        } else {
            console.log('Nenhuma resposta interceptada da API de agendamentos.');
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await browser.close();
    }
}

testNetwork();
