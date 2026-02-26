import { chromium } from 'playwright';

async function verifyPatientPortal() {
  console.log('Iniciando verificação do Portal do Paciente...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://fisioflow-patient.web.app/login', { waitUntil: 'networkidle' });

    console.log('URL Atual:', page.url());
    
    // Lista todos os elementos que podem ser o botão de login
    const elements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const text = el.innerText || '';
          return text.toLowerCase().includes('entrar') || text.toLowerCase().includes('login');
        })
        .map(el => ({
          tag: el.tagName,
          text: el.innerText,
          className: el.className,
          role: el.getAttribute('role')
        }));
    });
    console.log('Possíveis botões de login:', elements.slice(0, 5));

    await page.fill('input[type="email"]', 'paciente@moocafisio.com.br');
    await page.fill('input[type="password"]', 'teste123');
    
    console.log('Tentando clicar no elemento com texto "Entrar"...');
    // Em React Native Web (Expo), botões costumam ser divs com texto
    await page.click('div:has-text("Entrar"), div:has-text("LOGIN"), [role="button"]');
    
    console.log('Aguardando... (5s)');
    await page.waitForTimeout(5000); 
    
    console.log('URL final:', page.url());
    const bodyText = await page.innerText('body');
    console.log('Body snippet:', bodyText.substring(0, 100));

    if (page.url().includes('dashboard') || bodyText.includes('Exercícios')) {
      console.log('✅ Verificação concluída com sucesso!');
    } else {
      console.log('⚠️ Login pode não ter ocorrido. Verifique se o usuário existe e as permissões.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
  }
}

verifyPatientPortal();
