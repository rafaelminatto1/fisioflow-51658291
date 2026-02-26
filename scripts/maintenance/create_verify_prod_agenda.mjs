import { chromium } from 'playwright';

async function createAndVerify() {
    console.log('🚀 Iniciando script de criação e visualização na Agenda (Prod)...');

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
            page.waitForURL('**/agenda**', { timeout: 15000 }).catch(() => console.log('Timeout aguardando URL...')),
            page.click('button[type="submit"]')
        ]);

        if (!page.url().includes('agenda')) {
            await page.goto('https://moocafisio.com.br/agenda', { waitUntil: 'domcontentloaded' });
        }

        console.log('4. Aguardando agenda carregar...');
        await page.waitForTimeout(5000);

        // Tirar screenshot do "antes"
        await page.screenshot({ path: 'agenda-antes-criacao.png' });
        console.log('📸 Screenshot 1 salva: agenda-antes-criacao.png');

        console.log('5. Procurando o botão "Novo Agendamento"...');
        // Pode ser um botão com ícone de + ou "Novo Agendamento"
        const btnNovo = page.locator('button:has-text("Novo Agendamento"), button:has-text("Novo"), button[aria-label="Novo agendamento"]');

        if (await btnNovo.count() > 0 && await btnNovo.first().isVisible({ timeout: 5000 })) {
            await btnNovo.first().click();
            console.log('✅ Botão "Novo" clicado!');

            console.log('6. Preenchendo modal de agendamento...');
            await page.waitForTimeout(1000);

            // O formulário de agendamento possui um campo de Paciente que é um Combobox
            const pacienteCombobox = page.locator('button[role="combobox"]').first();

            if (await pacienteCombobox.isVisible()) {
                await pacienteCombobox.click();
                await page.waitForTimeout(500);
                // Digitar o nome e dar enter
                await page.keyboard.type('Paciente Teste Validacao');
                await page.waitForTimeout(2000); // aguardar debounce
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(200);
                await page.keyboard.press('Enter');
                console.log('👤 Paciente selecionado/digitado');

                // Normalmente, os selects de Data/Hora podem vir preenchidos com os Defaults.
                // Vamos apenas procurar o texto 'Salvar' ou 'Agendar' agora
                const btnSalvar = page.locator('button:has-text("Salvar"), button:has-text("Agendar")').first();
                if (await btnSalvar.isVisible()) {
                    await btnSalvar.click();
                    console.log('💾 Clicado em Salvar!');
                } else {
                    console.log('⚠️ Botão de salvar não estava visível ou era de outro tipo.');
                    // Teste de fallback: apertar TAB até chegar no botão ou apertar Enter final
                    await page.keyboard.press('Enter');
                }

                console.log('7. Aguardando a mutação e fechamento do modal...');
                await page.waitForTimeout(5000);

                // Tirar screenshot de "depois"
                await page.screenshot({ path: 'agenda-depois-criacao.png' });
                console.log('📸 Screenshot 2 salva: agenda-depois-criacao.png');

                const bodyText = await page.innerText('body');

                // Verifica se o placeholder sumiu e os eventos apareceram
                if (bodyText.includes('Paciente Teste Validacao')) {
                    console.log('✅ SUCESSO! O agendamento recém-criado: "Paciente Teste Validacao" apareceu diretamente na Agenda!');
                } else {
                    console.log('⚠️ O agendamento parece ter sido criado, mas o nome não apareceu na leitura do corpo da página.');
                }

            } else {
                console.log('❌ O combobox do paciente não abriu corretamente.');
            }
        } else {
            console.log('❌ Não encontrou o botão "Novo Agendamento". Agenda pode estar carregando um calendário sem esse botão na tela atual.');
        }
    } catch (error) {
        console.error('❌ Erro inesperado:', error);
    } finally {
        await browser.close();
    }
}

createAndVerify();
