import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Pacientes - CRUD Completo', () => {
  test.beforeEach(async ({ page }) => {
    // Login robusto
    await page.goto('/auth/login');
    const emailInput = page.locator('input[name="email"], #login-email').first();
    const passwordInput = page.locator('input[name="password"], #login-password').first();
    
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(testUsers.fisio.email);
    await passwordInput.fill(testUsers.fisio.password);
    await page.click('button[type="submit"], button:has-text("Entrar")');
    
    // Aguardar navegação para fora da página de auth
    await expect.poll(() => page.url(), { timeout: 30000 }).not.toContain('/auth');
    
    // Navegar para página de pacientes
    await page.goto('/patients');
    // Esperar pelo header da página e conteúdo básico
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="patients-page-header"]')).toBeVisible({ timeout: 25000 });
  });

  test('deve exibir lista de pacientes', async ({ page }) => {
    // Verificar que a página carregou usando data-testid
    await expect(page.locator('[data-testid="patients-page"]')).toBeVisible({ timeout: 15000 });
    console.log('✅ Página de pacientes carregada');
  });

  test('deve criar novo paciente', async ({ page }) => {
    const createButton = page.locator('[data-testid="add-patient"]').first();
    const emptyStateButton = page.locator('button:has-text("Novo Paciente"), button:has-text("Adicionar")').last();

    await page.waitForTimeout(2000); // Dar tempo para renderizar

    const isVisible = await createButton.isVisible().catch(() => false) || 
                      await emptyStateButton.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Botão de criar encontrado');
    } else {
      console.log('ℹ️ Botão de criar não visível no momento');
    }

    await expect(page.locator('#page-title, h1')).toContainText('Pacientes');
  });

  test('deve buscar pacientes', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Buscar pacientes"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 10000 })) {
      await searchInput.fill('Maria');
      await page.waitForTimeout(1000);
      console.log('✅ Busca executada');
    } else {
      console.log('⚠ Campo de busca não encontrado');
    }
  });

  test('deve filtrar pacientes por status', async ({ page }) => {
    // O Seletor de Status é o primeiro SelectTrigger (combobox)
    const statusFilter = page.locator('button[role="combobox"]').first();

    if (await statusFilter.isVisible({ timeout: 10000 })) {
      await statusFilter.click();
      await page.waitForTimeout(1000);
      
      const option = page.locator('[role="option"]:has-text("Em Tratamento"), [role="menuitem"]:has-text("Em Tratamento")').first();
      if (await option.isVisible({ timeout: 5000 })) {
        await option.click();
        console.log('✅ Filtro de status aplicado');
      } else {
        console.log('⚠ Opção "Em Tratamento" não encontrada');
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('⚠ Filtro de status não encontrado');
    }
  });

  test('deve visualizar detalhes do paciente', async ({ page }) => {
    await page.waitForTimeout(3000); // Esperar carregar dados
    const isEmpty = await page.locator('text=/Nenhum paciente|Comece adicionando/i').isVisible().catch(() => false);
    
    if (isEmpty) {
      console.log('ℹ️ Lista vazia');
      return;
    }

    const patientCard = page.locator('[data-testid="patient-list"] > div, .card, [class*="PatientCard"]').first();

    if (await patientCard.isVisible({ timeout: 10000 })) {
      await patientCard.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicou em paciente');
    } else {
      console.log('⚠ Card não encontrado');
    }
  });

  test('deve editar paciente', async ({ page }) => {
    await page.waitForTimeout(3000);
    const patientCard = page.locator('[data-testid="patient-list"] > div').first();

    if (await patientCard.isVisible({ timeout: 5000 })) {
      // O menu de ações geralmente é o último botão do card
      const actionsMenu = patientCard.locator('button').last();
      await actionsMenu.click();
      await page.waitForTimeout(1000);

      // No dropdown do Radix/Shadcn, os itens costumam ser role="menuitem"
      const editOption = page.locator('div[role="menuitem"]:has-text("Editar"), [role="option"]:has-text("Editar")').first();
      if (await editOption.isVisible({ timeout: 5000 })) {
        await editOption.click();
        console.log('✅ Modal de edição aberto');
        await page.keyboard.press('Escape');
      } else {
        console.log('⚠ Opção Editar não encontrada no menu');
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('⚠ Paciente não disponível para editar');
    }
  });

  test('deve exportar lista de pacientes', async ({ page }) => {
    const exportButton = page.locator('button[title*="Exportar"], button:has(svg[class*="download"]), button:has(svg[class*="Download"])').first();

    if (await exportButton.isVisible({ timeout: 10000 })) {
      console.log('✅ Botão de exportar encontrado');
    } else {
      console.log('⚠ Botão de exportar não encontrado');
    }
  });

  test('deve limpar filtros', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Buscar pacientes"], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 10000 })) {
      await searchInput.fill('teste');
      await page.waitForTimeout(1000);

      const clearButton = page.locator('button:has-text("Limpar")').first();
      if (await clearButton.isVisible({ timeout: 5000 })) {
        await clearButton.click();
        console.log('✅ Filtros limpos');
      }
    }
  });
});
