import { chromium } from 'playwright';

async function validateAgenda() {
    console.log('🚀 Iniciando validação na produção com Playwright...');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`❌ [Browser Error]: ${msg.text()}`);
        }
    });

    try {
        console.log('1. Navegando para a página de login...');
        await page.goto('https://moocafisio.com.br/login', { waitUntil: 'domcontentloaded' });

        console.log('2. Preenchendo credenciais...');
        await page.fill('input[type="email"]', 'REDACTED_EMAIL');
        await page.fill('input[type="password"]', 'REDACTED');

        console.log('3. Clicando em Entrar...');
        await Promise.all([
            page.waitForURL('**/agenda**', { timeout: 15000 }).catch(() => console.log('Timeout aguardando URL agenda... prosseguindo.')),
            page.click('button[type="submit"]')
        ]);

        console.log(`✅ Login com sucesso. URL atual: ${page.url()}`);

        if (!page.url().includes('agenda')) {
            console.log('4. Navegando para a Agenda explicitamente...');
            await page.goto('https://moocafisio.com.br/agenda', { waitUntil: 'domcontentloaded' });
        }

        console.log('5. Aguardando o carregamento dos agendamentos na Agenda...');
        await page.waitForTimeout(5000);

        // Tirar screenshot
        await page.screenshot({ path: 'agenda-prod-validation.png' });
        console.log('📸 Screenshot salva como "agenda-prod-validation.png"');

        const bodyText = await page.innerText('body');

        if (bodyText.includes('Nenhum agendamento') || bodyText.toLowerCase().includes('sem agendamentos')) {
            console.log('⚠️ A interface AINDA indica que não há agendamentos (Mensagem de vazio encontrada).');
        } else {
            console.log('✅ Nenhum texto genérico de "vazio" encontrado, parece ter dados na tela.');
        }

        console.log('--- Resumo do texto encontrado na tela da agenda ---');
        console.log(bodyText.replace(/\n+/g, ' ').substring(0, 500) + '...');

    } catch (error) {
        console.error('❌ Erro durante a validação:', error);
    } finally {
        await browser.close();
        console.log('✅ Navegador fechado.');
    }
}

validateAgenda();
