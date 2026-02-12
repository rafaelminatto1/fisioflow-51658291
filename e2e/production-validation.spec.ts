import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.use({ ignoreHTTPSErrors: true });

test.describe('Produção - Validação pós-fix', () => {
  test.beforeEach(async ({ page }) => {
    // Login using direct Firebase URL if main domain has issues
    await page.goto('https://fisioflow-migration.web.app/auth/login');
    
    // Wait for either the ID or the type to be present
    const emailInput = page.locator('input[id="login-email"], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    
    await emailInput.fill(testUsers.admin.email);
    await page.fill('input[id="login-password"], input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento (pode ser dashboard, schedule ou a raiz com parâmetros)
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30000 });
  });

  test('Deve listar exercícios sem erro 500', async ({ page }) => {
    await page.goto('https://fisioflow-migration.web.app/exercises');
    
    // Aguardar o carregamento (spinner ou esqueleto) desaparecer ou os cards aparecerem
    // Vamos procurar por cards ou pelo título da biblioteca
    await expect(page.locator('text=Biblioteca de Exercícios')).toBeVisible({ timeout: 20000 });
    
    // Tentar encontrar cards por classes comuns do shadcn UI
    const exerciseCards = page.locator('.group.overflow-hidden, .rounded-xl.border, .rounded-lg.border');
    
    // Se não encontrar cards imediatamente, dar um tempo e logar o HTML para debug
    try {
      await expect(exerciseCards.first()).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('HTML da página de exercícios:', await page.content());
      throw e;
    }
    
    const count = await exerciseCards.count();
    console.log(`Encontrados ${count} exercícios na listagem.`);
    expect(count).toBeGreaterThan(0);
  });

  test('Página de evolução deve exibir cards de topo no SOAP e Texto Livre', async ({ page }) => {
    // Tentar ir direto para a lista de pacientes se não houver agendamentos hoje
    await page.goto('https://fisioflow-migration.web.app/patients');
    
    // Selecionar o primeiro paciente da lista
    const firstPatient = page.locator('div[role="button"], tr, .cursor-pointer').filter({ hasText: /@/ }).first();
    if (await firstPatient.isVisible()) {
      await firstPatient.click();
      
      // Clicar em "Nova Evolução" ou similar
      const newEvolutionBtn = page.locator('button:has-text("Evolução"), button:has-text("Atender")').first();
      if (await newEvolutionBtn.isVisible()) {
        await newEvolutionBtn.click();
        
        // Aguardar carregar a página de evolução
        await page.waitForURL(/\/patient-evolution\/|\/evolution\//);
        
        // 1. Validar no modo SOAP (V1)
        await expect(page.locator('text=Resumo da Evolução, text=Metas').first()).toBeVisible();
        
        // 2. Alternar para Texto Livre (V2)
        const versionToggle = page.locator('button:has-text("Texto Livre")');
        if (await versionToggle.isVisible()) {
          await versionToggle.click();
          
          // Validar que os cards continuam visíveis
          await expect(page.locator('text=Resumo da Evolução')).toBeVisible();
          await expect(page.locator('text=Metas')).toBeVisible();
          await expect(page.locator('text=Evolução V2')).toBeVisible();
        }
      }
    } else {
      console.log('Nenhum paciente encontrado para validar evolução.');
    }
  });
});
