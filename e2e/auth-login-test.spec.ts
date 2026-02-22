import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully and verify auth state', async ({ page }) => {
    // Configurar timeout maior para operações de rede
    test.setTimeout(60000);

    // 1. Navegar para a aplicação
    console.log('📍 Navegando para http://localhost:5173');
    await page.goto('http://localhost:5173');
    
    // Aguardar a página carregar
    await page.waitForLoadState('networkidle');
    
    // 2. Verificar se está na página de login ou já logado
    const currentUrl = page.url();
    console.log('🌐 URL atual:', currentUrl);
    
    // Se já estiver logado, fazer logout primeiro
    const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout")');
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('🚪 Usuário já logado, fazendo logout...');
      await logoutButton.click();
      await page.waitForTimeout(2000);
    }
    
    // 3. Procurar pelo formulário de login
    console.log('🔍 Procurando formulário de login...');
    
    // Tentar diferentes seletores para o formulário de login
    const emailInput = page.locator('input[name="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[name="password"], input[name="password"]').first();
    
    // Aguardar os campos aparecerem
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('✅ Formulário de login encontrado');
    
    // 4. Preencher credenciais
    console.log('📝 Preenchendo credenciais...');
    await emailInput.fill('REDACTED_EMAIL');
    await passwordInput.fill('REDACTED');
    
    // 5. Clicar no botão de login
    console.log('🔐 Clicando no botão de login...');
    const loginButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
    await loginButton.click();
    
    // 6. Aguardar navegação ou mudança de estado
    console.log('⏳ Aguardando autenticação...');
    await page.waitForTimeout(3000);
    
    // 7. Verificar se o login foi bem-sucedido
    console.log('🔍 Verificando estado de autenticação...');
    
    // Verificar localStorage
    const authData = await page.evaluate(() => {
      return {
        auth: localStorage.getItem('auth'),
        user: localStorage.getItem('user'),
        token: localStorage.getItem('token'),
        firebaseAuthUser: localStorage.getItem('firebase:authUser'),
        allKeys: Object.keys(localStorage),
      };
    });
    
    console.log('💾 LocalStorage:', JSON.stringify(authData, null, 2));
    
    // Verificar se há dados de autenticação
    const hasAuth = authData.auth !== null || 
                    authData.user !== null || 
                    authData.token !== null ||
                    authData.firebaseAuthUser !== null;
    
    if (!hasAuth) {
      console.log('❌ Nenhum dado de autenticação encontrado no localStorage');
      console.log('🔑 Chaves disponíveis:', authData.allKeys);
    } else {
      console.log('✅ Dados de autenticação encontrados!');
    }
    
    // 8. Verificar Firebase Auth State via console
    const firebaseAuthState = await page.evaluate(async () => {
      try {
        // Tentar acessar Firebase Auth
        const { auth } = await import('/src/integrations/firebase/app.js');
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          return {
            authenticated: true,
            email: currentUser.email,
            uid: currentUser.uid,
            displayName: currentUser.displayName,
          };
        } else {
          return {
            authenticated: false,
            message: 'No current user in Firebase Auth',
          };
        }
      } catch (error) {
        return {
          authenticated: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    console.log('🔥 Firebase Auth State:', JSON.stringify(firebaseAuthState, null, 2));
    
    // 9. Verificar se há erros no console
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error') || text.includes('❌')) {
        consoleLogs.push(text);
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleLogs.length > 0) {
      console.log('⚠️  Erros no console:');
      consoleLogs.forEach(log => console.log('  ', log));
    }
    
    // 10. Tentar navegar para /agenda
    console.log('📅 Navegando para /agenda...');
    await page.goto('http://localhost:5173/agenda');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 11. Verificar se há appointments cards
    const appointmentCards = await page.locator('[class*="appointment"]').count();
    console.log(`📊 Cards de agendamento encontrados: ${appointmentCards}`);
    
    // 12. Tirar screenshot
    await page.screenshot({ path: 'test-results/login-result.png', fullPage: true });
    console.log('📸 Screenshot salvo em test-results/login-result.png');
    
    // 13. Verificar organization_id no AuthContext
    const authContextData = await page.evaluate(() => {
      // Tentar acessar o React DevTools ou estado global
      const reactRoot = document.querySelector('#root');
      return {
        hasReactRoot: !!reactRoot,
        url: window.location.href,
      };
    });
    
    console.log('⚛️  React Context:', JSON.stringify(authContextData, null, 2));
    
    // Assertions
    expect(hasAuth || firebaseAuthState.authenticated).toBeTruthy();
  });
});
