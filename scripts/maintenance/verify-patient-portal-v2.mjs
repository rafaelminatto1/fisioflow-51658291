import { chromium } from 'playwright';

async function verifyPatientPortal() {
  console.log('Iniciando verificação do Portal do Paciente...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navegando para https://fisioflow-patient.web.app...');
    await page.goto('https://fisioflow-patient.web.app', { waitUntil: 'networkidle' });

    console.log('URL Atual:', page.url());
    const placeholders = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(i => ({ type: i.type, placeholder: i.placeholder }));
    });
    console.log('Inputs encontrados:', placeholders);

    const emailInput = page.locator('input[type="email"], input[placeholder*="mail"], input[placeholder*="Email"]');
    const passwordInput = page.locator('input[type="password"], input[placeholder*="enha"]');
    
    if (await emailInput.count() > 0) {
      await emailInput.first().fill('paciente@moocafisio.com.br');
      await passwordInput.first().fill('teste123');
      
      console.log('Procurando botão de entrar...');
      const loginButton = page.locator('button:has-text("Entrar"), button:has-text("Login"), [role="button"]:has-text("Entrar")');
      
      if (await loginButton.count() > 0) {
        await loginButton.first().click();
      } else {
        console.log('Botão com texto não encontrado, tentando primeiro botão disponível.');
        await page.click('button, [role="button"]');
      }
      
      console.log('Aguardando redirecionamento...');
      await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => console.log('Timeout aguardando URL de dashboard, mas continuando...'));
      
      await page.waitForTimeout(5000); 
      
      console.log('Página após login:', page.url());
      const bodyText = await page.innerText('body');
      console.log('Fragmento de texto do body:', bodyText.substring(0, 200));

      if (bodyText.includes('Exercícios') || bodyText.includes('Consulta') || bodyText.includes('Nível')) {
        console.log('✅ Sucesso: Login confirmado e portal ativo.');
      } else {
        console.log('⚠️ Aviso: Login pode ter falhado ou dashboard é diferente do esperado.');
      }
    } else {
      console.log('⚠️ Aviso: Campos de login não encontrados.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
    console.log('Verificação finalizada.');
  }
}

verifyPatientPortal();
