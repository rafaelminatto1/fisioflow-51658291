import { chromium } from 'playwright';

async function verifyPatientPortal() {
  console.log('Iniciando verificação do Portal do Paciente...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navega para o portal
    console.log('Navegando para https://fisioflow-patient.web.app...');
    await page.goto('https://fisioflow-patient.web.app', { waitUntil: 'networkidle' });

    console.log('Página carregada. Verificando tela de login...');
    await page.screenshot({ path: 'patient-portal-initial.png' });

    // Preenche login
    // Baseado na estrutura comum do patient-app (Expo Router)
    // Procurar por inputs de email e senha
    const emailInput = page.locator('input[type="email"], input[placeholder*="Email"]');
    const passwordInput = page.locator('input[type="password"], input[placeholder*="Senha"]');
    
    if (await emailInput.count() > 0) {
      await emailInput.first().fill('paciente@moocafisio.com.br');
      await passwordInput.first().fill('teste123');
      
      console.log('Clicando no botão de login...');
      await page.click('button, [role="button"]'); // Clica no primeiro botão encontrado
      
      // Aguarda redirecionamento para o dashboard
      console.log('Aguardando carregamento do dashboard...');
      await page.waitForTimeout(5000); // Aguarda um pouco para o Firebase processar
      
      await page.screenshot({ path: 'patient-portal-after-login.png' });
      
      const content = await page.textContent('body');
      if (content?.includes('Bom dia') || content?.includes('Boa tarde') || content?.includes('Boa noite') || content?.includes('Exercícios')) {
        console.log('Sucesso: Login realizado e Dashboard detectado!');
      } else {
        console.log('Aviso: Login realizado mas dashboard não confirmado pelo texto. Verifique screenshot.');
      }
    } else {
      console.log('Aviso: Campos de login não encontrados. Talvez já esteja logado ou estrutura diferente.');
    }

  } catch (error) {
    console.error('Erro durante a verificação:', error);
    await page.screenshot({ path: 'patient-portal-error.png' });
  } finally {
    await browser.close();
    console.log('Verificação finalizada.');
  }
}

verifyPatientPortal();
