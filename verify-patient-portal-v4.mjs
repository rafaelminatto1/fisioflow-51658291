import { chromium } from 'playwright';

async function verifyPatientPortal() {
  console.log('Iniciando verificação do Portal do Paciente...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://fisioflow-patient.web.app/login', { waitUntil: 'networkidle' });

    await page.fill('input[type="email"]', 'paciente@moocafisio.com.br');
    await page.fill('input[type="password"]', 'teste123');
    
    console.log('Procurando botão Entrar específico...');
    // React Native Web often puts text inside a div inside another div.
    // We try to find the innermost div with text "Entrar"
    const loginButton = page.locator('div:text-is("Entrar"), div:text-is("ENTRAR")').last();
    
    await loginButton.click();
    console.log('Botão clicado. Aguardando dashboard...');
    
    await page.waitForTimeout(8000); 
    
    console.log('URL final:', page.url());
    const bodyText = await page.innerText('body');
    console.log('Body snippet:', bodyText.substring(0, 200));

    if (page.url().includes('dashboard') || bodyText.includes('Exercícios') || bodyText.includes('Bom dia')) {
      console.log('✅ Verificação concluída com sucesso!');
    } else {
      console.log('⚠️ Login falhou ou página inesperada.');
      await page.screenshot({ path: 'login-failure.png' });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
  }
}

verifyPatientPortal();
