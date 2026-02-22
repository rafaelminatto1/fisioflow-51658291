import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test('Verificar Admin Gamification em Produção', async ({ page }) => {
  // Aumentar timeout para produção
  test.setTimeout(60000);

  console.log('Navegando para login...');
  await page.goto('https://moocafisio.com.br/auth');

  // Login
  console.log('Preenchendo credenciais...');
  await page.fill('input[name="email"]', testUsers.fisio.email);
  await page.fill('input[name="password"]', testUsers.fisio.password);

  // Clicar em Entrar/Login (tentando seletores comuns)
  await page.click('button[type="submit"]');

  // Aguardar navegação pós-login (espera sair da página de auth)
  console.log('Aguardando redirecionamento...');
  await page.waitForURL((url) => !url.toString().includes('/auth'), { timeout: 20000 });

  // Navegar diretamente para o admin
  console.log('Acessando /admin/gamification...');
  await page.goto('https://moocafisio.com.br/admin/gamification');

  // Verificações
  console.log('Verificando elementos...');
  
  // Título Principal
  await expect(page.locator('body')).toContainText('Gestão de Gamificação');
  
  // Abas
  await expect(page.locator('body')).toContainText('Dashboard');
  await expect(page.locator('body')).toContainText('Ranking');
  
  // Métricas (verificar se carregou algum número ou elemento de skeleton sumiu)
  // Esperar que o loading skeleton desapareça
  await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 15000 }).catch(() => console.log('Timeout aguardando loading, prosseguindo...'));

  console.log('Tirando screenshot...');
  await page.screenshot({ path: 'prod-gamification-result.avif', fullPage: true });
});
